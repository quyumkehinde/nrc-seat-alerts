// Shared by server and client, so no process.env or Node built-ins here.

export const ROUTE_NUMBER = 'LI'

/** Travel dates are West Africa Time calendar days. */
export const RAIL_TIMEZONE = 'Africa/Lagos'

export const COACH_CLASSES = ['First Class', 'Business Class', 'Standard Class'] as const
export type CoachClass = (typeof COACH_CLASSES)[number]

/** Booking opens ~3 days out, but the point is to queue the alert before then. */
export const WATCH_HORIZON_DAYS = 60
