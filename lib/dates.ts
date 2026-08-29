import { RAIL_TIMEZONE } from './constants.ts'

/**
 * Today on the railway's clock. UTC would be wrong: Lagos is UTC+1, so until
 * 1am local `toISOString()` still reports yesterday.
 */
export function today(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: RAIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Anchored at midday to stay DST-safe. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function isCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

/** "Monday, 31 August 2026" */
export function formatLong(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
