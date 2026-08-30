/** Canonical origin. Must match the deployed domain for OG tags and sitemap. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'https://nrcseatalerts.com'
).replace(/\/$/, '')

export const SITE_NAME = 'NRC Seat Alerts'

export const SITE_DESCRIPTION =
  'Free email alerts when Lagos-Ibadan train tickets become available. ' +
  'Pick your date, time and class, and get notified the moment seats open on the NRC booking site.'
