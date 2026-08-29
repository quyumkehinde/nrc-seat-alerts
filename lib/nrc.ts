// Client for the NRC e-ticketing API. These endpoints are public and
// unauthenticated -- the same ones nrc.gsds.ng's own front-end calls.

import { ROUTE_NUMBER } from './constants.ts'

const BASE_URL = 'https://api.gsds.ng'

/** Never let a slow upstream consume the whole function budget. */
const REQUEST_TIMEOUT_MS = 10_000

const STATIC_TTL_MS = 60 * 60 * 1000
const DEFAULT_MAX_BOOKING_DAYS = 3

export type Station = { id: string; name: string; code: string }

export type Coach = {
  coachTypeId: string
  coachTypeName: string
  availableSeats: number
  unreservedSeats: number
  travellerCategory: { name: string; fareValue: number }[]
}

export type Trip = {
  tripId: string
  vehicleName: string
  vehicleCode: string
  tripDate: string
  fromStation: { stationName: string; departureTime: string; arrivalTime: string }
  toStation: { stationName: string; arrivalTime: string }
  coaches: Coach[]
}

/** The API answered, but reported a failure in its envelope. */
class NrcApiError extends Error {
  // Longhand rather than parameter properties, which Node's type stripping
  // cannot compile.
  readonly path: string
  readonly apiMessage: string

  constructor(path: string, apiMessage: string) {
    super(`NRC ${path}: ${apiMessage}`)
    this.name = 'NrcApiError'
    this.path = path
    this.apiMessage = apiMessage
  }
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(BASE_URL + path, {
    headers: { Origin: 'https://nrc.gsds.ng', Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`NRC ${path}: HTTP ${res.status}`)

  // Everything answers 200; the real status is in the envelope.
  const body = await res.json()
  if (body.status !== 200) throw new NrcApiError(path, String(body.message))
  return body.result as T
}

/** TTL cache that collapses concurrent misses into one request. */
function cached<T>(ttlMs: number, load: () => Promise<T>): () => Promise<T> {
  let value: { data: T; expiresAt: number } | undefined
  let inFlight: Promise<T> | undefined

  return async () => {
    if (value && value.expiresAt > Date.now()) return value.data
    inFlight ??= load()
      .then((data) => {
        value = { data, expiresAt: Date.now() + ttlMs }
        return data
      })
      .finally(() => {
        inFlight = undefined
      })
    return inFlight
  }
}

/** Stations on the Lagos-Ibadan line, in travel order. */
export const getStations = cached(STATIC_TTL_MS, async (): Promise<Station[]> => {
  const routes = await request<
    { routeId: string; stations: { fromStation: Station[] } }[]
  >('/search/route-wise-stations')
  const route = routes.find((r) => r.routeId === ROUTE_NUMBER) ?? routes[0]
  return route?.stations.fromStation ?? []
})

export const getMaxBookingDays = cached(STATIC_TTL_MS, async (): Promise<number> => {
  try {
    const { value } = await request<{ value: string }>(
      '/cs/appConfig/getMaxDaysAllowedForBooking'
    )
    return Number(value) || DEFAULT_MAX_BOOKING_DAYS
  } catch {
    return DEFAULT_MAX_BOOKING_DAYS
  }
})

/** Trips for one leg on one date, with live per-class seat counts. */
export async function searchTrips(
  fromStation: string,
  toStation: string,
  travelDate: string
): Promise<Trip[]> {
  const query = new URLSearchParams({
    fromStation,
    toStation,
    travelDate,
    routeNumber: ROUTE_NUMBER,
  })
  try {
    return await request<Trip[]>(`/search/search-trips?${query}`)
  } catch (err) {
    // "No train runs that day" arrives as an error, not an empty success.
    if (err instanceof NrcApiError && err.apiMessage === 'NO_SUCH_TRIP_EXIST') return []
    throw err
  }
}
