'use client'

import { useEffect, useState } from 'react'
import type { Station } from '@/lib/nrc'
import { COACH_CLASSES, WATCH_HORIZON_DAYS } from '@/lib/constants'
import { addDays, today } from '@/lib/dates'

type TripOption = { code: string; name: string; departs: string; soldOut: boolean }

export default function AlertForm({
  stations,
  maxDays,
}: {
  stations: Station[]
  maxDays: number
}) {
  // Busiest leg: Ebute Metta (Lagos) -> Moniya (Ibadan).
  const [from, setFrom] = useState(stations[0]?.id ?? '')
  const [to, setTo] = useState(stations[stations.length - 1]?.id ?? '')
  const [date, setDate] = useState(today)
  const [vehicleCode, setVehicleCode] = useState('')
  const [coachType, setCoachType] = useState('')
  const [email, setEmail] = useState('')

  const [trips, setTrips] = useState<TripOption[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Watch further ahead than booking opens: the alert should already be
  // queued when seats are released.
  const earliest = today()
  const latest = addDays(earliest, maxDays + WATCH_HORIZON_DAYS)

  // Real departures, so the time picker isn't guesswork.
  useEffect(() => {
    if (!from || !to || !date || from === to) return setTrips([])
    let stale = false
    fetch(`/api/trips?from=${from}&to=${to}&date=${date}`)
      .then((r) => r.json())
      .then((d) => !stale && setTrips(d.trips ?? []))
      .catch(() => !stale && setTrips([]))
    return () => {
      stale = true
    }
  }, [from, to, date])

  // Drop a chosen train that isn't running on the new date.
  useEffect(() => {
    if (vehicleCode && !trips.some((t) => t.code === vehicleCode)) setVehicleCode('')
  }, [trips, vehicleCode])

  const swap = () => {
    setFrom(to)
    setTo(from)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, fromStation: from, toStation: to, travelDate: date, vehicleCode, coachType }),
      })
      const body = await res.json()
      if (!res.ok) setError(body.error ?? 'Something went wrong.')
      else setDone(true)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="done">
        <div className="tick">📬</div>
        <h1>Check your inbox</h1>
        <p className="lede">
          We sent a confirmation link to <strong>{email}</strong>. Click it and
          your alert goes live.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <label htmlFor="from">From</label>
          <button type="button" className="swap" onClick={swap}>⇅ swap</button>
        </div>
        <select id="from" value={from} onChange={(e) => setFrom(e.target.value)}>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="to">To</label>
        <select id="to" value={to} onChange={(e) => setTo(e.target.value)}>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="row">
        <div className="field">
          <label htmlFor="date">Travel date</label>
          <input
            id="date"
            type="date"
            required
            value={date}
            min={earliest}
            max={latest}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="time">Time <span className="opt">· optional</span></label>
          <select id="time" value={vehicleCode} onChange={(e) => setVehicleCode(e.target.value)}>
            <option value="">Any train</option>
            {trips.map((t) => (
              <option key={t.code} value={t.code}>
                {t.departs} · {t.name.includes('Morning') ? 'Morning' : t.name.includes('Evening') ? 'Evening' : t.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="class">Class <span className="opt">· optional</span></label>
        <select id="class" value={coachType} onChange={(e) => setCoachType(e.target.value)}>
          <option value="">Any class</option>
          {COACH_CLASSES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <button type="submit" disabled={busy || from === to}>
        {busy ? 'Setting up…' : 'Notify me'}
      </button>

      {from === to && <p className="msg err">Pick two different stations.</p>}
      {error && <p className="msg err">{error}</p>}
    </form>
  )
}
