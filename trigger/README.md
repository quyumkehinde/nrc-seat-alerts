# Cron trigger

Calls the app's `/api/cron/poll` every 5 minutes.

Needed because [Vercel Hobby limits cron to once per day](https://vercel.com/docs/cron-jobs/usage-and-pricing), and anything more frequent fails at deploy time. Cloudflare's free plan allows 1-minute triggers.

## Deploy

```bash
cd trigger
npm install -g wrangler
wrangler login

# Point POLL_URL in wrangler.toml at your deployed app, then:
wrangler secret put CRON_SECRET   # same value as in Vercel
wrangler deploy
```

## Verify

Visiting the Worker URL polls immediately instead of waiting for the schedule:

```bash
curl https://nrc-seat-alerts-cron.<your-subdomain>.workers.dev
# ok: {"checked":0,"legs":0,"alerted":0}
```

Live logs: `wrangler tail`
