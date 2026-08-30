import { getStations, getMaxBookingDays } from "@/lib/nrc";
import AlertForm from "./form";

export const revalidate = 3600; // The station list almost never changes.

export default async function Home() {
  const [stations, maxDays] = await Promise.all([
    getStations(),
    getMaxBookingDays(),
  ]);

  return (
    <main className="card">
      <div className="eyebrow">Lagos ⇄ Ibadan</div>
      <h1>Know the moment a seat opens</h1>
      <p className="lede">
        The train sells out fast. Tell us the trip you want and we&rsquo;ll
        email you as soon as seats are free.
      </p>

      <AlertForm stations={stations} maxDays={maxDays} />

      <p className="foot">
        Unofficial. Book at <a href="https://nrc.gsds.ng">nrc.gsds.ng</a>. Your
        email is only used for the alert you asked for.
      </p>
    </main>
  );
}
