export type Post = {
  slug: string
  title: string
  /** Meta description and blog-index summary. Keep under ~155 characters. */
  description: string
  published: string
  h1: string
}

/** Ordered newest first. Bodies live in app/blog/[slug]/page.tsx. */
export const POSTS: Post[] = [
  {
    slug: "lagos-ibadan-train-schedule",
    title: "Lagos-Ibadan Train Schedule and Timetable",
    description:
      "Live Lagos-Ibadan train departure times, journey duration and every station on the line, read straight from the NRC booking system.",
    published: "2026-08-30",
    h1: "Lagos-Ibadan train schedule and timetable",
  },
  {
    slug: "lagos-ibadan-train-ticket-prices",
    title: "Lagos-Ibadan Train Ticket Prices",
    description:
      "Current Lagos-Ibadan train fares for First, Business and Standard Class, including child fares, taken live from the NRC booking system.",
    published: "2026-08-30",
    h1: "Lagos-Ibadan train ticket prices",
  },
  {
    slug: "how-to-book-lagos-ibadan-train",
    title: "How to Book the Lagos-Ibadan Train Online",
    description:
      "A step-by-step guide to booking Lagos-Ibadan train tickets on the NRC site, how far ahead booking opens, and what to do when a date is sold out.",
    published: "2026-08-30",
    h1: "How to book the Lagos-Ibadan train online",
  },
]

export const findPost = (slug: string) => POSTS.find((p) => p.slug === slug)
