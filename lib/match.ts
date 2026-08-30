import type { Coach, Trip } from './nrc.ts'

/** '' means no preference. */
export type SeatFilters = {
  vehicleCode: string
  coachType: string
}

export type TripMatch = {
  trip: Trip
  /** Only those matching the filter with seats free. */
  coaches: Coach[]
}

/**
 * The alert rule. Pure and synchronous so it is testable without network
 * or database.
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
