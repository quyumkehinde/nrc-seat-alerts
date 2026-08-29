import { NextResponse } from 'next/server'
import { searchTrips } from '@/lib/nrc'
import { isCalendarDate } from '@/lib/dates'

export const dynamic = 'force-dynamic'

/**
 * Departures for the "any train" dropdown. Cosmetic only: an empty list
 * degrades to "any train", so upstream failures are swallowed.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const from = params.get('from')
  const to = params.get('to')
  const date = params.get('date')

  const none = NextResponse.json({ trips: [] })
  if (!from || !to || from === to || !date || !isCalendarDate(date)) return none

  try {
    const trips = await searchTrips(from, to, date)
    return NextResponse.json({
      trips: trips.map((trip) => ({
        code: trip.vehicleCode,
        name: trip.vehicleName,
        departs: trip.fromStation.departureTime,
        arrives: trip.toStation.arrivalTime,
        soldOut: trip.coaches.every((coach) => coach.availableSeats === 0),
      })),
    })
  } catch (err) {
    console.error('trips: lookup failed', err)
    return none
  }
}
