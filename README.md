# NRC Seat Alerts

Email alerts for the Lagos-Ibadan train. Pick a trip, get an email when seats open on [nrc.gsds.ng](https://nrc.gsds.ng).

Unofficial. Not affiliated with the Nigerian Railway Corporation.

## How it works

The booking site is a React SPA over a **public, unauthenticated** JSON API at `api.gsds.ng`. No scraping, no headless browser:

| Endpoint | Use |
|---|---|
| `GET /search/route-wise-stations` | The 9 stations on the `LI` line |
| `GET /search/search-trips?fromStation=&toStation=&travelDate=&routeNumber=LI` | Trips with per-class `availableSeats` |
| `GET /cs/appConfig/getMaxDaysAllowedForBooking` | Booking window (currently `3` days) |

A Cloudflare Worker hits `/api/cron/poll` every 5 minutes. Each run calls `search-trips` once per unique (from, to, date) and emails anyone whose filters match a coach with `availableSeats > 0`.

Alerts fire **once**. The subscription is then marked notified, and deleted after its travel date passes.

## Setup

1. Create a Supabase project and run `supabase/schema.sql`. Copy the **secret** key from Settings > API Keys (`sb_secret_...`), not the publishable one.
2. Install **Resend** from the Vercel Marketplace. It provisions the account and injects `RESEND_API_KEY`. Point `EMAIL_FROM` at your verified domain; left unset it falls back to `onboarding@resend.dev`, which only delivers to your own Resend address.
3. Copy `.env.example` to `.env.local` and fill it in.
4. `npm install && npm run dev`
5. Deploy to Vercel. Set every var from `.env.example`, generating `CRON_SECRET` with `openssl rand -base64 32`.
6. Deploy the scheduler: see [`trigger/README.md`](trigger/README.md). It needs the same `CRON_SECRET`.

### Why the scheduler is on Cloudflare

[Vercel Hobby caps cron at once per day](https://vercel.com/docs/cron-jobs/usage-and-pricing). Anything more frequent fails at deploy time, and timing only holds within the hour. Useless for seats that sell out in minutes. [Cloudflare's free plan allows 1-minute triggers](https://developers.cloudflare.com/workers/platform/pricing/), so a ~10-line Worker owns the schedule while the work stays on Vercel. Awaiting a fetch is not CPU time, so the Worker stays inside the free 10ms budget.

## Notes

- **Double opt-in.** Nothing is sent until the confirmation link is clicked, so the form cannot be used to mail-bomb anyone.
- **`/api/cron/poll` fails closed.** No `CRON_SECRET` means no polling. With one set, it requires a matching bearer token.
- **Poll politely.** One request per leg and date per run, never per subscriber.

## Layout

```
app/            UI and API routes
lib/nrc.ts      API client: timeouts, TTL cache, typed errors
lib/match.ts    the alert rule. Pure, synchronous, unit-tested
lib/dates.ts    calendar dates on the railway's clock (WAT)
lib/env.ts      validated server-only config
trigger/        Cloudflare Worker that drives the schedule
```

## Checks

```bash
npm test        # alert rules, against live NRC payloads
npm run typecheck
npm run build
```

Tests hit the real API rather than fixtures, because the failure worth catching is the day the response changes shape. They import `lib/match.ts` directly, so what ships is what is tested.
