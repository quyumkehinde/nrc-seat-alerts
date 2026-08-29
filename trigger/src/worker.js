/**
 * Vercel's Hobby plan only allows once-daily cron, useless for seats that sell
 * out in minutes. This Worker just calls the poll endpoint on a real schedule.
 * Doing no work of its own keeps it inside the free 10ms CPU budget, since
 * time awaiting fetch isn't CPU time.
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

  // Visiting the URL polls immediately -- verifies wiring without waiting.
  async fetch(req, env) {
    try {
      const body = await poll(env)
      return new Response(`ok: ${body}`, { status: 200 })
    } catch (err) {
      return new Response(`failed: ${err.message}`, { status: 502 })
    }
  },
}
