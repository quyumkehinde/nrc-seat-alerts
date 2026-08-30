"use client";

import { useEffect, useState } from "react";
import type { Station } from "@/lib/nrc";
import { COACH_CLASSES, WATCH_HORIZON_DAYS } from "@/lib/constants";
import { addDays, today } from "@/lib/dates";

const BOOKING_URL = "https://nrc.gsds.ng";

type TripOption = {
  code: string;
  name: string;
  departs: string;
  soldOut: boolean;
};

/** "Lagos-Ibadan Morning Train" -> "Morning". */
const period = (trip: TripOption) =>
  /morning/i.test(trip.name)
    ? "Morning"
    : /evening/i.test(trip.name)
      ? "Evening"
      : trip.code;

export default function AlertForm({
  stations,
  maxDays,
}: {
  stations: Station[];
  maxDays: number;
}) {
  // Busiest leg: Ebute Metta (Lagos) -> Moniya (Ibadan).
  const [from, setFrom] = useState(stations[0]?.id ?? "");
  const [to, setTo] = useState(stations[stations.length - 1]?.id ?? "");
  const [date, setDate] = useState("");
  const [vehicleCode, setVehicleCode] = useState("");
  const [coachType, setCoachType] = useState("");
  const [email, setEmail] = useState("");

  const [trips, setTrips] = useState<TripOption[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const sameStation = from === to;

  // Watch past the booking window: queue the alert before seats are released.
  const earliest = today();
  const latest = addDays(earliest, maxDays + WATCH_HORIZON_DAYS);

  // The timetable shows dates further out than booking actually opens, so seats
  // can appear on a date nobody can buy yet.
  const beyondBooking = Boolean(date) && date > addDays(earliest, maxDays);

  useEffect(() => {
    if (!from || !to || !date || sameStation || beyondBooking)
      return setTrips(null);
    let stale = false;
    setTrips(null);
    fetch(`/api/trips?from=${from}&to=${to}&date=${date}`)
      .then((r) => r.json())
      .then((d) => !stale && setTrips(d.trips ?? []))
      .catch(() => !stale && setTrips([]));
    return () => {
      stale = true;
    };
  }, [from, to, date, sameStation, beyondBooking]);

  // Drop a train that isn't running on the new date.
  useEffect(() => {
    if (vehicleCode && trips && !trips.some((t) => t.code === vehicleCode)) {
      setVehicleCode("");
    }
  }, [trips, vehicleCode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          fromStation: from,
          toStation: to,
          travelDate: date,
          vehicleCode,
          coachType,
        }),
      });
      const body = await res.json();
      if (!res.ok) setError(body.error ?? "Something went wrong.");
      else setDone(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="done">
        <h1>Check your inbox</h1>
        <p className="lede">
          We sent a confirmation link to <strong>{email}</strong>. Click it and
          your alert goes live.
        </p>
      </div>
    );
  }

  const available = trips?.filter((t) => !t.soldOut).length ?? 0;

  return (
    <>
      <h1>Know the moment a seat opens</h1>
      <p className="lede">
        The train sells out fast. Tell us the trip you want and we&rsquo;ll
        email you as soon as seats are free.
      </p>

      <form onSubmit={submit} noValidate>
        <div className="field">
          <div className="head">
            <label htmlFor="from">From</label>
            <button
              type="button"
              className="swap"
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
            >
              Swap
            </button>
          </div>
          <select
            id="from"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          >
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="to">To</label>
          <select id="to" value={to} onChange={(e) => setTo(e.target.value)}>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="date">Date</label>
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
            <label htmlFor="time">
              Time <span className="opt">optional</span>
            </label>
            <select
              id="time"
              value={vehicleCode}
              onChange={(e) => setVehicleCode(e.target.value)}
            >
              <option value="">Any train</option>
              {trips?.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.departs} {period(t)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!sameStation && (beyondBooking || trips) && (
          <p className="status">
            {beyondBooking ? (
              <>
                <span className="dot muted" />
                Booking isn't open for this date yet. We'll email you when it
                opens.
              </>
            ) : trips!.length === 0 ? (
              <>
                <span className="dot muted" />
                No train runs on this date.
              </>
            ) : available > 0 ? (
              <>
                <span className="dot" />
                Seats are available now.{" "}
                <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
                  Book on nrc.gsds.ng
                </a>
                , no need to wait for an alert.
              </>
            ) : (
              <>
                <span className="dot muted" />
                Sold out. Tickets cannot be cancelled, so this date is unlikely
                to reopen.
              </>
            )}
          </p>
        )}

        <div className="field">
          <label htmlFor="class">
            Class <span className="opt">optional</span>
          </label>
          <select
            id="class"
            value={coachType}
            onChange={(e) => setCoachType(e.target.value)}
          >
            <option value="">Any class</option>
            {COACH_CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
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

        <button type="submit" disabled={busy || sameStation || !date}>
          {busy ? "Setting up…" : "Notify me"}
        </button>

        {sameStation && <p className="err">Pick two different stations.</p>}
        {error && <p className="err">{error}</p>}
      </form>
    </>
  );
}
