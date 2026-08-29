import { db, SUBSCRIPTIONS } from '@/lib/supabase'
import { resultPage } from '@/lib/html'

/** Double opt-in step two. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) {
    return resultPage({
      title: 'Invalid link',
      message: 'That confirmation link is missing its token.',
      status: 400,
    })
  }

  const { data: subscription, error } = await db
    .from(SUBSCRIPTIONS)
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (error) {
    console.error('confirm: lookup failed', error)
    return resultPage({
      title: 'Something went wrong',
      message: 'Please try that link again in a moment.',
      status: 500,
    })
  }

  if (!subscription) {
    return resultPage({
      title: 'Link not found',
      message: 'This alert may have already been cancelled.',
      status: 404,
    })
  }

  // Re-opening the link is harmless.
  if (!subscription.confirmed_at) {
    await db
      .from(SUBSCRIPTIONS)
      .update({ confirmed_at: new Date().toISOString() })
      .eq('id', subscription.id)
  }

  return resultPage({
    title: "You're on the list",
    message: `We'll email you the moment seats open on ${subscription.from_station_name} → ${subscription.to_station_name}.`,
    unsubscribeToken: token,
  })
}
