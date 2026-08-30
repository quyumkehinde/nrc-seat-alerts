/**
 * Vercel Hobby caps cron at once a day, useless here. This Worker only calls
 * the poll endpoint on a real schedule; awaiting a fetch isn't CPU time, so it
 * stays inside the free 10ms budget.
 */

async function poll(env) {
  const res = await fetch(env.POLL_URL, {
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  })
  const body = await res.text()

  if (!res.ok) {
    console.error(`poll failed: HTTP ${res.status} ${body.slice(0, 200)}`)
    throw new Error(`poll returned ${res.status}`)
  }

  console.log(`poll ok: ${body.slice(0, 200)}`)
  return body
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(poll(env))
  },

  // Polls immediately: verifies wiring without waiting for the schedule.
  async fetch(req, env) {
    try {
      const body = await poll(env)
      return new Response(`ok: ${body}`, { status: 200 })
    } catch (err) {
      return new Response(`failed: ${err.message}`, { status: 502 })
    }
  },
}
