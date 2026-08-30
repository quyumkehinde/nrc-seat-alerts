// NRC e-ticketing API. Public and unauthenticated: the same endpoints
// nrc.gsds.ng's own front-end calls.

import { ROUTE_NUMBER } from './constants.ts'
import { FALLBACK_STATIONS } from './stations.ts'

const BASE_URL = 'https://api.gsds.ng'

/** Never let a slow upstream consume the whole function budget. */
const REQUEST_TIMEOUT_MS = 10_000

const STATIC_TTL_SECONDS = 60 * 60
const STATIC_TTL_MS = STATIC_TTL_SECONDS * 1000
const DEFAULT_MAX_BOOKING_DAYS = 3

export type Station = { id: string; name: string; code: string }

export type Coach = {
  coachTypeId: string
  coachTypeName: string
  availableSeats: number
  unreservedSeats: number
  travellerCategory: { name: string; fareValue: number }[]
}

export type ScheduleStop = {
  sequence: number
  arrivalTime: string
  departureTime: string
  distance: number | null
  stationName: string
  stationCode: string
}

/**
 * One published service. The same vehicleCode appears more than once with
 * different day flags, because weekday and weekend runs keep different times
 * and call at different stations.
 */
export type VehicleSchedule = {
  mon: boolean
  tue: boolean
  wed: boolean
  thu: boolean
  fri: boolean
  sat: boolean
  sun: boolean
  description: string | null
  totalTime: number | null
  totalDistance: number | null
  vehicleName: string
  vehicleCode: string
  routeNumber: string
  vehicleRouteSchedules: ScheduleStop[] | null
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

/** The API answered but reported failure in its envelope. */
class NrcApiError extends Error {
  // Parameter properties would break Node's type stripping.
  readonly path: string
  readonly apiMessage: string

  constructor(path: string, apiMessage: string) {
    super(`NRC ${path}: ${apiMessage}`)
    this.name = 'NrcApiError'
    this.path = path
    this.apiMessage = apiMessage
  }
}

/** Next signals static/dynamic bailouts by throwing; those must never be caught. */
function isFrameworkSignal(err: unknown): boolean {
  return typeof (err as { digest?: unknown })?.digest === 'string'
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE_URL + path, {
    headers: { Origin: 'https://nrc.gsds.ng', Accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    ...init,
  })
  if (!res.ok) throw new Error(`NRC ${path}: HTTP ${res.status}`)

  // Everything answers 200; the real status is in the envelope.
  const body = await res.json()
  if (body.status !== 200) throw new NrcApiError(path, String(body.message))
  return body.result as T
}

/** Collapses concurrent misses into one request; serves stale on failure. */
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

    try {
      return await inFlight
    } catch (err) {
      if (isFrameworkSignal(err)) throw err
      if (value) {
        console.error('nrc: serving stale value after upstream failure', err)
        return value.data
      }
      throw err
    }
  }
}

/**
 * In travel order. Falls back to a bundled snapshot so an outage upstream
 * cannot take the signup page down.
 */
export const getStations = cached(STATIC_TTL_MS, async (): Promise<Station[]> => {
  try {
    const routes = await request<
      { routeId: string; stations: { fromStation: Station[] } }[]
    >('/search/route-wise-stations', { next: { revalidate: STATIC_TTL_SECONDS } })
    const route = routes.find((r) => r.routeId === ROUTE_NUMBER) ?? routes[0]
    return route?.stations.fromStation ?? FALLBACK_STATIONS
  } catch (err) {
    if (isFrameworkSignal(err)) throw err
    console.error('nrc: station lookup failed, using bundled snapshot', err)
    return FALLBACK_STATIONS
  }
})

export const getMaxBookingDays = cached(STATIC_TTL_MS, async (): Promise<number> => {
  try {
    const { value } = await request<{ value: string }>(
      '/cs/appConfig/getMaxDaysAllowedForBooking',
      { next: { revalidate: STATIC_TTL_SECONDS } }
    )
    return Number(value) || DEFAULT_MAX_BOOKING_DAYS
  } catch (err) {
    if (isFrameworkSignal(err)) throw err
    return DEFAULT_MAX_BOOKING_DAYS
  }
})

/** Published timetable: every service with its station-by-station call times. */
export const getTimetable = cached(
  STATIC_TTL_SECONDS * 1000,
  async (): Promise<VehicleSchedule[]> => {
    try {
      const all = await request<VehicleSchedule[]>(
        '/vs/vehicle-routes/getVehicleTimeTable',
        { next: { revalidate: STATIC_TTL_SECONDS } }
      )
      return all.filter(
        (v) => v.routeNumber === ROUTE_NUMBER && v.vehicleRouteSchedules?.length
      )
    } catch (err) {
      if (isFrameworkSignal(err)) throw err
      console.error('nrc: timetable lookup failed', err)
      return []
    }
  }
)

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
    return await request<Trip[]>(`/search/search-trips?${query}`, {
      cache: 'no-store',
    })
  } catch (err) {
    // "No train runs that day" arrives as an error, not an empty success.
    if (err instanceof NrcApiError && err.apiMessage === 'NO_SUCH_TRIP_EXIST') return []
    throw err
  }
}
