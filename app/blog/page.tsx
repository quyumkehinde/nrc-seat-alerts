import type { Metadata } from "next";
import Link from "next/link";
import { POSTS } from "@/content/posts";

export const metadata: Metadata = {
  title: "Lagos-Ibadan Train Guides",
  description:
    "Guides to the Lagos-Ibadan train: schedule, ticket prices and how to book on the NRC site.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  return (
    <main className="card page">
      <Link className="back" href="/">
        ← Seat alerts
      </Link>
      <h1>Lagos-Ibadan train guides</h1>
      <p className="lede">
        Schedules, fares and booking, kept current from the NRC booking system.
      </p>
      <ul className="postlist">
        {POSTS.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`}>
              <h2>{post.h1}</h2>
              <p>{post.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
