import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NRC Seat Alerts — Lagos ⇄ Ibadan",
  description:
    "Get an email the moment seats open up on the Lagos - Ibadan train. Unofficial.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
