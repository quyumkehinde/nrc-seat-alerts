import type { Coach, Trip } from './nrc.ts'

/** '' means no preference. */
export type SeatFilters = {
  vehicleCode: string
  coachType: string
}

export type TripMatch = {
  trip: Trip
  /** Only coaches that pass the filter and have seats free. */
  coaches: Coach[]
}

/**
 * The alert rule: which trips a subscriber should be told about right now.
 * Pure and synchronous so it can be tested without network or database.
 */
export function findMatches(filters: SeatFilters, trips: Trip[]): TripMatch[] {
  const matches: TripMatch[] = []

  for (const trip of trips) {
    if (filters.vehicleCode && trip.vehicleCode !== filters.vehicleCode) continue

    const coaches = trip.coaches.filter(
      (coach) =>
        coach.availableSeats > 0 &&
        (!filters.coachType || coach.coachTypeName === filters.coachType)
    )

    if (coaches.length > 0) matches.push({ trip, coaches })
  }

  return matches
}
