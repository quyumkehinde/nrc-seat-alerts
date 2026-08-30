import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POSTS, findPost } from "@/content/posts";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { formatLong } from "@/lib/dates";
import {
  LiveFareMatrix,
  LiveFares,
  LiveTimetable,
  StationList,
} from "../live";

export const revalidate = 3600;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const post = findPost((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `${SITE_URL}/blog/${post.slug}`,
      publishedTime: post.published,
    },
  };
}

const Cta = () => (
  <div className="cta">
    <p>
      Tickets sell out within days of a date opening. Get an email the moment
      seats appear on the trip you want.
    </p>
    <Link href="/">Set up a free seat alert</Link>
  </div>
);

function Body({ slug }: { slug: string }) {
  if (slug === "lagos-ibadan-train-schedule") {
    return (
      <>
        <p>
          The Lagos-Ibadan service is run by the Nigerian Railway Corporation
          between <strong>Mobolaji Johnson Station</strong> in Ebute Metta,
          Lagos and <strong>Obafemi Awolowo Station</strong> in Moniya, Ibadan.
          The end-to-end journey takes roughly two and a half hours.
        </p>
        <p>
          <strong>The timetable is not fixed.</strong> The number of daily
          services and their departure times change from one day to the next,
          so the tables below are read live from the NRC booking system rather
          than copied from a printed schedule.
        </p>
        <LiveTimetable />
        <h2>Every station on the line</h2>
        <p>
          Trains call at up to nine stations. Not every service stops at all of
          them, and you can book any leg, not just the full route.
        </p>
        <StationList />
        <Cta />
      </>
    );
  }

  if (slug === "lagos-ibadan-train-ticket-prices") {
    return (
      <>
        <p>
          There are three classes on the Lagos-Ibadan train. Fares are the same
          in both directions and have been stable, but the table below is read
          live from the NRC booking system so it cannot go out of date.
        </p>
        <LiveFares />
        <h2>Which class is worth it?</h2>
        <p>
          Standard Class is the only one with a reduced child fare and is by
          far the cheapest way to travel. It is also the largest cabin by some
          margin, so it is usually the last to sell out on a newly opened date.
          First and Business charge the same for children as for adults.
        </p>
        <h2>Fares for shorter journeys</h2>
        <p>
          You do not have to travel the full route, and shorter journeys cost
          less. Fares are zoned rather than measured by distance, so several
          stations share a price. Travelling between Abeokuta and Ibadan is
          roughly half the cost of the full run.
        </p>
        <LiveFareMatrix />
        <p>
          Fares are identical in both directions, so Ibadan to Abeokuta costs
          the same as Abeokuta to Ibadan. Prices are per passenger, per leg.
          Group and voucher bookings are handled separately on the official
          site.
        </p>
        <Cta />
      </>
    );
  }

  return (
    <>
      <p>
        Tickets are sold only through the Nigerian Railway Corporation&rsquo;s
        official e-ticketing site,{" "}
        <a href="https://nrc.gsds.ng">nrc.gsds.ng</a>. There is no cost to
        create an account, and no agent is required.
      </p>
      <h2>Booking, step by step</h2>
      <ul>
        <li>Create an account on the NRC site and verify your details.</li>
        <li>Pick your departure and arrival stations, and a travel date.</li>
        <li>
          Choose a train and a class, then select seats for each passenger.
        </li>
        <li>Pay by card. Your ticket and QR code arrive by email.</li>
      </ul>
      <h2>How far ahead can you book?</h2>
      <p>
        This is the part that catches most people out. Booking does{" "}
        <strong>not</strong> open weeks in advance. The NRC site releases a
        rolling window, and in practice you can only reach dates{" "}
        <strong>less than a week away</strong>. Search any further out and the
        site simply returns nothing, which looks like no service rather than
        what it is: not on sale yet.
      </p>
      <p>
        A date that returns nothing today will usually become bookable within a
        day or two, and it is worth being ready for that moment.
      </p>
      <h2>Can you cancel or get a refund?</h2>
      <p>
        No. The NRC e-ticketing terms state that{" "}
        <strong>all sales are final</strong> and that no refunds are offered,
        and the booking system rejects cancellation once payment has gone
        through.
      </p>
      <p>
        This matters more than it first appears: because tickets cannot be
        handed back, a date that has sold out generally{" "}
        <strong>stays</strong> sold out. Waiting for someone else to drop a
        seat is not a plan.
      </p>
      <h2>What to do when a date is sold out</h2>
      <p>
        The seats you want are almost always released with the date itself, not
        recovered afterwards. So the aim is not to catch a cancellation, it is
        to be there the moment your travel date first enters the booking
        window.
      </p>
      <p>
        That moment is not announced, and checking the site by hand every day is
        how most people miss it. Watching for it is exactly what this site does.
      </p>
      <Cta />
    </>
  );
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) notFound();

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.published,
    dateModified: post.published,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <main className="card page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Link className="back" href="/blog">
        ← Guides
      </Link>
      <h1>{post.h1}</h1>
      <p className="meta">Updated {formatLong(post.published)}</p>
      <div className="prose">
        <Body slug={slug} />
      </div>
    </main>
  );
}
