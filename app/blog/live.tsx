import { getStations, searchTrips, type Trip } from "@/lib/nrc";
import { addDays, formatLong, today } from "@/lib/dates";

const LAGOS = "004a3e07-0b8b-4963-a7da-d6ddda455237"; // Ebute Metta
const IBADAN = "ec4334a8-2c00-401f-a77e-fc2585fc55d3"; // Moniya

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

/** Minutes between two HH:MM times on the same day. */
function duration(from: string, to: string): string {
  const mins = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const total = mins(to) - mins(from);
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`;
}

/** First upcoming date that actually has service, so tables are never empty. */
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

/** Popular legs, by station code. Fares are the same in both directions. */
const FARE_LEGS: [string, string][] = [
  ["MJS", "OA"],
  ["MJS", "PWS"],
  ["PWS", "OA"],
  ["BRF", "OA"],
  ["BRF", "PWS"],
  ["LA", "OA"],
];

/** Strip the honorific so fare rows stay readable. */
const shortStation = (name: string) =>
  name
    .replace(/^.*?Station\s+/, "")
    .replace(/\s+Station$/, "")
    .trim() || name;

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
