import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { db, SUBSCRIPTIONS, UNIQUE_VIOLATION } from '@/lib/supabase'
import { getStations, getMaxBookingDays } from '@/lib/nrc'
import { sendConfirmation } from '@/lib/email'
import { COACH_CLASSES, WATCH_HORIZON_DAYS } from '@/lib/constants'
import { addDays, isCalendarDate, today } from '@/lib/dates'

// Permissive on purpose: the confirmation email is the real proof.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MAX_EMAIL_LENGTH = 254 // RFC 5321

type Payload = {
  email: string
  fromStation: string
  toStation: string
  travelDate: string
  vehicleCode: string
  coachType: string
}

const field = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

function parse(body: unknown): Payload {
  const raw = (body ?? {}) as Record<string, unknown>
  return {
    email: field(raw.email).toLowerCase(),
    fromStation: field(raw.fromStation),
    toStation: field(raw.toStation),
    travelDate: field(raw.travelDate),
    vehicleCode: field(raw.vehicleCode),
    coachType: field(raw.coachType),
  }
}

export async function POST(req: Request) {
  const invalid = (message: string) =>
    NextResponse.json({ error: message }, { status: 400 })

  let payload: Payload
  try {
    payload = parse(await req.json())
  } catch {
    return invalid('Invalid request.')
  }

  const { email, fromStation, toStation, travelDate, vehicleCode, coachType } = payload

  if (!EMAIL_PATTERN.test(email) || email.length > MAX_EMAIL_LENGTH) {
    return invalid('Enter a valid email address.')
  }
  if (!isCalendarDate(travelDate)) return invalid('Pick a travel date.')
  if (fromStation === toStation) return invalid('Pick two different stations.')
  if (coachType && !COACH_CLASSES.includes(coachType as never)) {
    return invalid('Unknown class.')
  }

  if (travelDate < today()) return invalid('That date has already passed.')

  let stations, horizonDays
  try {
    ;[stations, horizonDays] = await Promise.all([getStations(), getMaxBookingDays()])
  } catch (err) {
    console.error('subscribe: NRC lookup failed', err)
    return NextResponse.json(
      { error: 'The railway site is not responding. Try again shortly.' },
      { status: 503 }
    )
  }

  if (travelDate > addDays(today(), horizonDays + WATCH_HORIZON_DAYS)) {
    return invalid('That date is too far ahead.')
  }

  // Never store IDs the API won't accept.
  const from = stations.find((s) => s.id === fromStation)
  const to = stations.find((s) => s.id === toStation)
  if (!from || !to) return invalid('Pick both stations.')

  const { data: subscription, error } = await db
    .from(SUBSCRIPTIONS)
    .insert({
      email,
      from_station_id: from.id,
      from_station_name: from.name,
      to_station_id: to.id,
      to_station_name: to.name,
      travel_date: travelDate,
      vehicle_code: vehicleCode,
      coach_type_name: coachType,
      token: randomBytes(24).toString('base64url'),
    })
    .select()
    .single()

  // Succeed without re-sending, so the form can't repeatedly mail an address.
  if (error?.code === UNIQUE_VIOLATION) {
    return NextResponse.json({ ok: true, duplicate: true })
  }
  if (error) {
    console.error('subscribe: insert failed', error)
    return NextResponse.json({ error: 'Could not save that. Try again.' }, { status: 500 })
  }

  try {
    await sendConfirmation(subscription)
  } catch (err) {
    // Unconfirmable rows would block a genuine retry via the unique index.
    console.error('subscribe: confirmation email failed', err)
    await db.from(SUBSCRIPTIONS).delete().eq('id', subscription.id)
    return NextResponse.json({ error: 'Could not send the email. Try again.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
