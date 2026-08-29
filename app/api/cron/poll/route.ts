import { NextResponse } from 'next/server'
import { db, SUBSCRIPTIONS, type Subscription } from '@/lib/supabase'
import { searchTrips, type Trip } from '@/lib/nrc'
import { findMatches } from '@/lib/match'
import { sendSeatAlert } from '@/lib/email'
import { mapWithLimit } from '@/lib/async'
import { env } from '@/lib/env'
import { today } from '@/lib/dates'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Vercel Hobby ceiling.

/** Kept low: the NRC API is a public courtesy. */
const SEARCH_CONCURRENCY = 4

/** Do less per run rather than risk being killed at maxDuration. */
const MAX_SUBSCRIPTIONS_PER_RUN = 500

type Leg = { from: string; to: string; date: string; subscribers: Subscription[] }

/** Group by leg so the API is hit once per leg, not once per subscriber. */
function groupIntoLegs(subs: Subscription[]): Leg[] {
  const legs = new Map<string, Leg>()

  for (const sub of subs) {
    const key = [sub.from_station_id, sub.to_station_id, sub.travel_date].join('|')
    let leg = legs.get(key)
    if (!leg) {
      leg = {
        from: sub.from_station_id,
        to: sub.to_station_id,
        date: sub.travel_date,
        subscribers: [],
      }
      legs.set(key, leg)
    }
    leg.subscribers.push(sub)
  }

  return [...legs.values()]
}

/**
 * Claim before sending. The `is null` guard is atomic, so overlapping runs
 * can never double-send.
 */
async function claim(sub: Subscription): Promise<boolean> {
  const { data } = await db
    .from(SUBSCRIPTIONS)
    .update({ notified_at: new Date().toISOString() })
    .eq('id', sub.id)
    .is('notified_at', null)
    .select('id')
    .maybeSingle()
  return Boolean(data)
}

const release = (sub: Subscription) =>
  db.from(SUBSCRIPTIONS).update({ notified_at: null }).eq('id', sub.id)

/** Returns emails sent. */
async function alertSubscribers(leg: Leg, trips: Trip[]): Promise<number> {
  let sent = 0

  for (const sub of leg.subscribers) {
    const matches = findMatches(
      { vehicleCode: sub.vehicle_code, coachType: sub.coach_type_name },
      trips
    )
    if (matches.length === 0) continue
    if (!(await claim(sub))) continue

    try {
      await sendSeatAlert(sub, matches)
      sent++
    } catch (err) {
      // Put it back so the next run retries.
      console.error('poll: alert failed, releasing claim', sub.id, err)
      await release(sub)
    }
  }

  return sent
}

export async function GET(req: Request) {
  // Publicly reachable and driven by trigger/, so it fails closed: an unset
  // secret means no polling, not an open endpoint that burns the email quota.
  const secret = env.cronSecret
  if (!secret) {
    if (env.isProduction) {
      console.error('CRON_SECRET is not set; refusing to poll')
      return new NextResponse('Not configured', { status: 500 })
    }
    // Tolerated in dev so `npm run poll` works with no setup.
  } else if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const date = today()

  // Departed trains can never fire again.
  await db.from(SUBSCRIPTIONS).delete().lt('travel_date', date)

  const { data: subs, error } = await db
    .from(SUBSCRIPTIONS)
    .select('*')
    .not('confirmed_at', 'is', null)
    .is('notified_at', null)
    .gte('travel_date', date)
    .order('created_at', { ascending: true })
    .limit(MAX_SUBSCRIPTIONS_PER_RUN)
    .returns<Subscription[]>()

  if (error) {
    console.error('poll: could not load subscriptions', error)
    return NextResponse.json({ error: 'db' }, { status: 500 })
  }
  if (!subs?.length) return NextResponse.json({ checked: 0, legs: 0, alerted: 0 })

  const legs = groupIntoLegs(subs)

  const alerted = await mapWithLimit(legs, SEARCH_CONCURRENCY, async (leg) => {
    let trips: Trip[]
    try {
      trips = await searchTrips(leg.from, leg.to, leg.date)
    } catch (err) {
      // Transient: leave everyone unclaimed and retry next run.
      console.error('poll: search failed', leg.from, leg.to, leg.date, err)
      return 0
    }
    if (trips.length === 0) return 0
    return alertSubscribers(leg, trips)
  })

  return NextResponse.json({
    checked: subs.length,
    legs: legs.length,
    alerted: alerted.reduce((sum, n) => sum + n, 0),
  })
}
