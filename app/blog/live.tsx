import {
  getStations,
  getTimetable,
  searchTrips,
  type Trip,
  type VehicleSchedule,
} from "@/lib/nrc";
import { addDays, formatLong, today } from "@/lib/dates";

const LAGOS = "004a3e07-0b8b-4963-a7da-d6ddda455237"; // Ebute Metta
const IBADAN = "ec4334a8-2c00-401f-a77e-fc2585fc55d3"; // Moniya

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

function duration(from: string, to: string): string {
  const mins = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const total = mins(to) - mins(from);
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`;
}

/** Keeps tables from rendering empty. */
async function nextServiceDay(from: string, to: string) {
  for (let i = 0; i < 5; i++) {
    const date = addDays(today(), i);
    const trips = await searchTrips(from, to, date);
    if (trips.length) return { date, trips };
  }
  return { date: today(), trips: [] as Trip[] };
}

function Timetable({ trips }: { trips: Trip[] }) {
  return (
    <div className="scroll-x">
      <table>
        <thead>
          <tr>
            <th>Train</th>
            <th>Departs</th>
            <th>Arrives</th>
            <th>Journey</th>
          </tr>
        </thead>
        <tbody>
          {trips.map((t) => (
            <tr key={t.tripId}>
              <td>{t.vehicleCode}</td>
              <td>{t.fromStation.departureTime}</td>
              <td>{t.toStation.arrivalTime}</td>
              <td>
                {duration(t.fromStation.departureTime, t.toStation.arrivalTime)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export async function LiveTimetable() {
  const [out, back] = await Promise.all([
    nextServiceDay(LAGOS, IBADAN),
    nextServiceDay(IBADAN, LAGOS),
  ]);

  if (!out.trips.length && !back.trips.length) {
    return <p>The NRC booking system is not returning a timetable right now.</p>;
  }

  return (
    <>
      <h2>Lagos to Ibadan</h2>
      <p className="meta">Service on {formatLong(out.date)}</p>
      <Timetable trips={out.trips} />

      <h2>Ibadan to Lagos</h2>
      <p className="meta">Service on {formatLong(back.date)}</p>
      <Timetable trips={back.trips} />
    </>
  );
}

export async function LiveFares() {
  const { trips } = await nextServiceDay(LAGOS, IBADAN);
  const coaches = trips[0]?.coaches ?? [];

  if (!coaches.length) {
    return <p>Fares are unavailable from the booking system right now.</p>;
  }

  return (
    <div className="scroll-x">
      <table>
        <thead>
          <tr>
            <th>Class</th>
            <th>Adult</th>
            <th>Child</th>
          </tr>
        </thead>
        <tbody>
          {coaches.map((c) => {
            const fare = (who: string) =>
              c.travellerCategory.find((t) => t.name === who)?.fareValue;
            const adult = fare("Adult");
            const child = fare("Child");
            return (
              <tr key={c.coachTypeId}>
                <td>{c.coachTypeName}</td>
                <td>{adult ? naira(adult) : "—"}</td>
                <td>{child ? naira(child) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Fares are identical in both directions, so one row covers each pair. */
const FARE_LEGS: [string, string][] = [
  ["MJS", "OA"],
  ["MJS", "PWS"],
  ["PWS", "OA"],
  ["BRF", "OA"],
  ["BRF", "PWS"],
  ["LA", "OA"],
];

/**
 * Drop the honorific so rows stay narrow. Two stations omit the word
 * "Station" entirely, so fall back to the final word, which is the place name.
 */
const shortStation = (name: string) => {
  if (/\bStation\b/.test(name)) {
    return name.replace(/^.*?\bStation\b\s*/, "").replace(/\s*\bStation\b$/, "").trim() || name;
  }
  return name.split(/\s+/).pop() ?? name;
};

export async function LiveFareMatrix() {
  const stations = await getStations();
  const byCode = new Map(stations.map((s) => [s.code, s]));

  const rows = await Promise.all(
    FARE_LEGS.map(async ([fromCode, toCode]) => {
      const from = byCode.get(fromCode);
      const to = byCode.get(toCode);
      if (!from || !to) return null;

      const { trips } = await nextServiceDay(from.id, to.id);
      const coaches = trips[0]?.coaches;
      if (!coaches?.length) return null;

      const fareFor = (name: string) => {
        const coach = coaches.find((c) => c.coachTypeName.startsWith(name));
        return coach?.travellerCategory.find((t) => t.name === "Adult")?.fareValue;
      };

      return {
        key: `${fromCode}-${toCode}`,
        route: `${shortStation(from.name)} to ${shortStation(to.name)}`,
        first: fareFor("First"),
        business: fareFor("Business"),
        standard: fareFor("Standard"),
      };
    })
  );

  const found = rows.filter((r) => r !== null);
  if (!found.length) {
    return <p>Fares for shorter journeys are unavailable right now.</p>;
  }

  return (
    <div className="scroll-x">
      <table>
        <thead>
          <tr>
            <th>Route</th>
            <th>First</th>
            <th>Business</th>
            <th>Standard</th>
          </tr>
        </thead>
        <tbody>
          {found.map((r) => (
            <tr key={r.key}>
              <td>{r.route}</td>
              <td>{r.first ? naira(r.first) : "n/a"}</td>
              <td>{r.business ? naira(r.business) : "n/a"}</td>
              <td>{r.standard ? naira(r.standard) : "n/a"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export async function StationList() {
  const stations = await getStations();
  return (
    <ul>
      {stations.map((s) => (
        <li key={s.id}>
          {s.name} <span style={{ opacity: 0.6 }}>({s.code})</span>
        </li>
      ))}
    </ul>
  );
}

/* Published timetable ------------------------------------------------------ */

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const weekday = (date: string) =>
  DAY_KEYS[new Date(`${date}T12:00:00Z`).getUTCDay()];

const runsOn = (service: VehicleSchedule, date: string) =>
  service[weekday(date)];

const stops = (service: VehicleSchedule) => service.vehicleRouteSchedules ?? [];

/** Lagos-bound services start at Ebute Metta. */
const isFromLagos = (service: VehicleSchedule) =>
  stops(service)[0]?.stationCode === "MJS";

const label = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

function DayServices({
  services,
  date,
}: {
  services: VehicleSchedule[];
  date: string;
}) {
  const running = services.filter((s) => runsOn(s, date));
  if (!running.length) return <p>No published service.</p>;

  return (
    <div className="scroll-x">
      <table>
        <thead>
          <tr>
            <th>Train</th>
            <th>Route</th>
            <th>Departs</th>
            <th>Arrives</th>
            <th>Calls at</th>
          </tr>
        </thead>
        <tbody>
          {running
            .slice()
            .sort(
              (a, b) =>
                stops(a)[0].departureTime.localeCompare(
                  stops(b)[0].departureTime
                ) || a.vehicleCode.localeCompare(b.vehicleCode)
            )
            .map((s) => {
              const list = stops(s);
              return (
                <tr key={`${s.vehicleCode}-${list[0].departureTime}`}>
                  <td>{s.vehicleCode}</td>
                  <td>{isFromLagos(s) ? "Lagos to Ibadan" : "Ibadan to Lagos"}</td>
                  <td>{list[0].departureTime}</td>
                  <td>{list[list.length - 1].arrivalTime}</td>
                  <td>{list.length} stations</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

/** The next seven days, from the published timetable rather than seat search. */
export async function WeekSchedule() {
  const services = await getTimetable();
  if (!services.length) {
    return <p>The published timetable is unavailable right now.</p>;
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i));

  return (
    <>
      {days.map((date, i) => (
        <div key={date}>
          <h3
            style={{
              margin: "22px 0 8px",
              fontSize: 14,
              fontWeight: 550,
            }}
          >
            {i === 0 ? `Today, ${label(date)}` : label(date)}
          </h3>
          <DayServices services={services} date={date} />
        </div>
      ))}
    </>
  );
}

/** Station-by-station call times for every published service. */
export async function StationCallTimes() {
  const services = await getTimetable();
  if (!services.length) return null;

  return (
    <>
      {services.map((s) => {
        const list = stops(s);
        const days = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const)
          .filter((d) => s[d])
          .map((d) => d[0].toUpperCase() + d.slice(1));

        return (
          <details key={`${s.vehicleCode}-${list[0].departureTime}`}>
            <summary>
              {s.vehicleCode} · {list[0].departureTime}{" "}
              {isFromLagos(s) ? "Lagos to Ibadan" : "Ibadan to Lagos"}
            </summary>
            <p className="meta" style={{ margin: "0 0 8px" }}>
              Runs {days.join(", ")}
              {s.totalTime ? ` · ${s.totalTime} minutes end to end` : ""}
            </p>
            <div className="scroll-x">
              <table>
                <thead>
                  <tr>
                    <th>Station</th>
                    <th>Arrives</th>
                    <th>Departs</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((stop, i) => (
                    <tr key={stop.sequence}>
                      <td>{shortStation(stop.stationName)}</td>
                      <td>{i === 0 ? "" : stop.arrivalTime}</td>
                      <td>{i === list.length - 1 ? "" : stop.departureTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
    </>
  );
}
