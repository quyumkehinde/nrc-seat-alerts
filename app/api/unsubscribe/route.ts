import { db, SUBSCRIPTIONS } from '@/lib/supabase'
import { resultPage } from '@/lib/html'

async function remove(token: string | null) {
  if (token) await db.from(SUBSCRIPTIONS).delete().eq('token', token)
}

/** The link in the email footer. */
export async function GET(req: Request) {
  await remove(new URL(req.url).searchParams.get('token'))
  return resultPage({
    title: 'Alert removed',
    message: "You won't get any more email about this trip.",
  })
}

/** RFC 8058 one-click: mail clients POST here and expect a bare 200. */
export async function POST(req: Request) {
  await remove(new URL(req.url).searchParams.get('token'))
  return new Response('Unsubscribed', { status: 200 })
}
