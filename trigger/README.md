# Cron trigger

Calls the Vercel app's `/api/cron/poll` every 5 minutes.

Needed because [Vercel's Hobby plan limits cron to once per
day](https://vercel.com/docs/cron-jobs/usage-and-pricing) — anything more
frequent fails at deploy time. Cloudflare's free plan allows 1-minute
triggers, so it drives the schedule instead.

## Deploy

```bash
cd trigger
npm install -g wrangler        # if you don't have it
wrangler login

# 1. Point it at your deployed app
#    -> edit POLL_URL in wrangler.toml

# 2. Set the shared secret (same value as CRON_SECRET in Vercel)
wrangler secret put CRON_SECRET

# 3. Ship it
wrangler deploy
```

## Verify

Visiting the deployed Worker URL runs a poll immediately instead of waiting
for the schedule:

```bash
curl https://nrc-seat-alerts-cron.<your-subdomain>.workers.dev
# ok: {"checked":3,"legs":2,"alerted":0}
```

Live logs:

```bash
wrangler tail
```
