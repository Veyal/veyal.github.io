import type { Metadata, Viewport } from "next";
import { Fredoka, Recursive } from "next/font/google";
import "./globals.css";

/*
 * Fredoka is the round display face (Kirby-logo friendly). Recursive covers
 * body text, and its MONO axis turns it into the code face for HTTP labels.
 */
const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  display: "swap",
});

const recursive = Recursive({
  subsets: ["latin"],
  axes: ["CASL", "MONO"],
  variable: "--font-rec",
  display: "swap",
});

export const metadata: Metadata = {
  title: "veyal: Interseptor and small security tools",
  description:
    "Interseptor is an intercepting proxy and pentest workbench in one Go binary. Plus the portfolio and small browser tools of a penetration tester who goes by Veyal.",
  metadataBase: new URL("https://veyal.github.io"),
  openGraph: {
    title: "Interseptor: catch every request before it lands",
    description:
      "Catch every request before it lands. An intercepting proxy and pentest workbench in one Go binary.",
    url: "https://veyal.github.io",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#fff8fb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${recursive.variable} ${fredoka.variable}`}>
      <body>{children}</body>
    </html>
  );
}
