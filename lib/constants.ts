// Shared by server and client, so no process.env or Node built-ins here.

export const ROUTE_NUMBER = 'LI'

/** Travel dates are West Africa Time calendar days. */
export const RAIL_TIMEZONE = 'Africa/Lagos'

export const COACH_CLASSES = ['First Class', 'Business Class', 'Standard Class'] as const
export type CoachClass = (typeof COACH_CLASSES)[number]

/** Watch well past the booking window: the alert should be queued first. */
export const WATCH_HORIZON_DAYS = 60
