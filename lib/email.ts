import 'server-only'
import { Resend } from 'resend'
import { env } from './env.ts'
import { escapeHtml } from './html.ts'
import { formatLong } from './dates.ts'
import type { Subscription } from './supabase.ts'
import type { TripMatch } from './match.ts'

let client: Resend | undefined
const resend = () => (client ??= new Resend(env.resendApiKey))

const naira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`

const confirmUrl = (token: string) =>
  `${env.siteUrl}/api/confirm?token=${encodeURIComponent(token)}`
const unsubscribeUrl = (token: string) =>
  `${env.siteUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`

/** Subject lines want the short form. */
const shortName = (station: string) => station.split(' Station')[0].trim()

const layout = (body: string, footer: string) => `
<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
            max-width:520px;margin:0 auto;padding:32px 24px;color:#14261a">
  <div style="font-weight:700;font-size:15px;color:#0b6b34;letter-spacing:-.01em">
    &#128649; NRC Seat Alerts
  </div>
  ${body}
  <p style="margin-top:32px;padding-top:16px;border-top:1px solid #e3ebe5;
            font-size:12px;color:#7c8b81;line-height:1.5">
    ${footer}<br/>
    An unofficial alerting tool. Not affiliated with the Nigerian Railway Corporation.
  </p>
</div>`

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#0b6b34;color:#fff;
     text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px">
     ${label}</a>`

/**
 * Double opt-in step one. Nothing further is sent until this link is clicked,
 * so the public form can't be used to mail-bomb anyone.
 */
export async function sendConfirmation(sub: Subscription): Promise<void> {
  const leg = escapeHtml(`${sub.from_station_name} → ${sub.to_station_name}`)

  await resend().emails.send({
    from: env.emailFrom,
    to: sub.email,
    subject: 'Confirm your NRC seat alert',
    headers: { 'List-Unsubscribe': `<${unsubscribeUrl(sub.token)}>` },
    html: layout(
      `<h1 style="font-size:21px;margin:20px 0 8px;letter-spacing:-.02em">Confirm your alert</h1>
       <p style="font-size:15px;line-height:1.6;color:#3d5347;margin:0 0 8px">
         You asked to be told when seats open on <strong>${leg}</strong>
         on <strong>${escapeHtml(formatLong(sub.travel_date))}</strong>.
       </p>
       <p style="font-size:14px;color:#7c8b81;margin:0 0 24px">
         Train: ${escapeHtml(sub.vehicle_code || 'any')} &middot;
         Class: ${escapeHtml(sub.coach_type_name || 'any')}
       </p>
       ${button(confirmUrl(sub.token), 'Confirm this alert')}`,
      "Didn't ask for this? Ignore it and nothing further will be sent."
    ),
  })
}

/** Seats exist right now for a trip someone is watching. */
export async function sendSeatAlert(
  sub: Subscription,
  matches: TripMatch[]
): Promise<void> {
  const cards = matches
    .map(({ trip, coaches }) => {
      const seats = coaches
        .map((coach) => {
          const adult = coach.travellerCategory.find((t) => t.name === 'Adult')
          const fare = adult ? ` &middot; ${naira(adult.fareValue)}` : ''
          return `<div style="font-size:14px;color:#3d5347;padding:2px 0">
            &bull; <strong>${escapeHtml(coach.coachTypeName)}</strong> &mdash;
            ${coach.availableSeats} seat${coach.availableSeats === 1 ? '' : 's'}${fare}
          </div>`
        })
        .join('')

      return `<div style="border:1px solid #d7e5db;border-radius:10px;padding:14px 16px;
                          margin-bottom:10px;background:#f6fbf7">
        <div style="font-weight:600;font-size:15px;margin-bottom:2px">
          ${escapeHtml(trip.vehicleName)}
        </div>
        <div style="font-size:13px;color:#7c8b81;margin-bottom:8px">
          ${escapeHtml(trip.vehicleCode)} &middot;
          departs ${escapeHtml(trip.fromStation.departureTime)} &rarr;
          arrives ${escapeHtml(trip.toStation.arrivalTime)}
        </div>
        ${seats}
      </div>`
    })
    .join('')

  await resend().emails.send({
    from: env.emailFrom,
    to: sub.email,
    subject: `Seats available: ${shortName(sub.from_station_name)} → ${shortName(
      sub.to_station_name
    )}, ${formatLong(sub.travel_date)}`,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl(sub.token)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    html: layout(
      `<h1 style="font-size:21px;margin:20px 0 8px;letter-spacing:-.02em">Seats just opened up</h1>
       <p style="font-size:15px;line-height:1.6;color:#3d5347;margin:0 0 18px">
         <strong>${escapeHtml(`${sub.from_station_name} → ${sub.to_station_name}`)}</strong><br/>
         ${escapeHtml(formatLong(sub.travel_date))}
       </p>
       ${cards}
       <p style="font-size:13px;color:#7c8b81;margin:14px 0 18px;line-height:1.5">
         Seats are not held for you and these go fast. This alert fires once,
         so you won't be emailed about this trip again.
       </p>
       ${button('https://nrc.gsds.ng', 'Book on nrc.gsds.ng')}`,
      `<a href="${unsubscribeUrl(sub.token)}" style="color:#7c8b81">Unsubscribe</a>`
    ),
  })
}
