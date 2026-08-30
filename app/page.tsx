import { getStations, getMaxBookingDays } from "@/lib/nrc";
import Link from "next/link";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { FAQ } from "@/content/faq";
import { POSTS } from "@/content/posts";
import AlertForm from "./form";

export const revalidate = 3600; // The station list almost never changes.

export default async function Home() {
  const [stations, maxDays] = await Promise.all([
    getStations(),
    getMaxBookingDays(),
  ]);

  // Describes the tool to crawlers. Only claims what the page actually offers.
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: 'TravelApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' },
    areaServed: { '@type': 'Country', name: 'Nigeria' },
  }

  // Mirrors the visible FAQ below; Google requires the answers be on the page.
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  return (
    <main className="card">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="eyebrow">Lagos ⇄ Ibadan Train</div>
      <h1>Know the moment a seat opens</h1>
      <p className="lede">
        The train sells out fast. Tell us the trip you want and we&rsquo;ll
        email you as soon as seats are free.
      </p>

      <AlertForm stations={stations} maxDays={maxDays} />

      <section className="prose" style={{ marginTop: 26 }}>
        <h2>Common questions</h2>
        {FAQ.map(({ q, a }) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>

      <section className="prose" style={{ marginTop: 26 }}>
        <h2>Guides</h2>
        <ul>
          {POSTS.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`}>{post.h1}</Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="foot">
        Unofficial. Book at <a href="https://nrc.gsds.ng">nrc.gsds.ng</a>. Your
        email is only used for the alert you asked for.
      </p>
    </main>
  );
}
