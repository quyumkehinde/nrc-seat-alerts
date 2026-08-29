# NRC Seat Alerts

Email alerts for the Lagos–Ibadan train. Pick a trip, get an email the moment
seats open on [nrc.gsds.ng](https://nrc.gsds.ng).

Unofficial — not affiliated with the Nigerian Railway Corporation.

## How it works

The NRC booking site is a React SPA over a **public, unauthenticated** JSON API
at `api.gsds.ng`. No scraping or headless browser is needed:

| Endpoint | Use |
|---|---|
| `GET /search/route-wise-stations` | The 9 stations on the Lagos–Ibadan (`LI`) line |
| `GET /search/search-trips?fromStation=&toStation=&travelDate=&routeNumber=LI` | Trips with per-class `availableSeats` |
| `GET /cs/appConfig/getMaxDaysAllowedForBooking` | Booking window (currently `3` days) |

A Cloudflare Worker hits `/api/cron/poll` every 5 minutes, which calls `search-trips`
once per unique (from, to, date) across all subscribers, and emails anyone whose
filters match a coach with `availableSeats > 0`.

Alerts are **one-shot**: once you're emailed about a trip, that subscription is
marked notified and won't fire again. Subscriptions are deleted once their
travel date passes.

## Setup

1. **Database** — create a Supabase project, run `supabase/schema.sql` in the
   SQL editor.
2. **Email** — install **Resend** from the Vercel Marketplace (it provisions the
   account, verifies your domain, and injects `RESEND_API_KEY`). Set `EMAIL_FROM`
   to an address on your verified domain. For local testing you can leave
   `EMAIL_FROM` unset and it falls back to `onboarding@resend.dev`, which only
   delivers to your own Resend account address.
3. **Env** — copy `.env.example` to `.env.local` and fill it in.
4. **Run**

   ```bash
   npm install
   npm run dev
   ```

5. **Deploy the app** — push to Vercel. Set every var from `.env.example` in
   the project's environment variables, including a `CRON_SECRET` you generate
   with `openssl rand -base64 32`.
6. **Deploy the trigger** — see [`trigger/README.md`](trigger/README.md). Set
   `POLL_URL` to your deployed `/api/cron/poll` URL and give the Worker the same
   `CRON_SECRET`.

### Why polling lives on Cloudflare

[Vercel's Hobby plan caps cron at once per day](https://vercel.com/docs/cron-jobs/usage-and-pricing)
— anything more frequent fails at deploy time, and timing is only guaranteed
within the hour. Useless for seats that sell out in minutes.
[Cloudflare's free plan allows 1-minute cron triggers](https://developers.cloudflare.com/workers/platform/pricing/),
so a ~10-line Worker owns the schedule and the real work stays on Vercel. That
also keeps the Worker inside the free plan's 10ms CPU budget, since time spent
awaiting a fetch doesn't count as CPU time.

## Notes

- **Double opt-in.** Signing up sends a confirmation link and nothing else is
  ever sent until it's clicked, so the form can't be used to mail-bomb someone.
- **`/api/cron/poll` is public**, so it fails closed: without `CRON_SECRET`
  set it refuses to run in production, and with it set it requires a matching
  bearer token.
- **Polling politely.** One request per unique leg+date per run, not per
  subscriber. Please keep it that way.

## Layout

```
app/                UI (page + form) and API routes
lib/constants.ts    domain constants shared by server and client
lib/env.ts          validated server-only configuration
lib/nrc.ts          NRC API client: timeouts, TTL cache, typed errors
lib/match.ts        the alert rule -- pure, synchronous, unit-tested
lib/email.ts        Resend templates
lib/dates.ts        calendar dates on the railway's clock (WAT)
trigger/            Cloudflare Worker that drives the schedule
```

## Checks

```bash
npm test        # alert rules, against live NRC payloads
npm run typecheck
npm run build
```

The tests hit the real API rather than fixtures: the failure worth catching is
the day the upstream response changes shape. They import `lib/match.ts`
directly, so what runs in production is what's under test.
