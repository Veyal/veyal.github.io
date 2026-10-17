import type { Metadata, Viewport } from "next";
import { Recursive } from "next/font/google";
import "./globals.css";

/*
 * One variable family for the whole site. The CASL axis turns it casual for
 * headlines, and the MONO axis turns it into the code face for HTTP labels.
 */
const recursive = Recursive({
  subsets: ["latin"],
  axes: ["CASL", "MONO"],
  variable: "--font-rec",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Andrew Salim (@Veyal): penetration tester, maker of Interseptor",
  description:
    "Interseptor is an intercepting proxy and pentest workbench in one Go binary, built by Andrew Salim (@Veyal), an OSCP and OSWE certified penetration tester. Plus small browser tools.",
  metadataBase: new URL("https://veyal.github.io"),
  openGraph: {
    title: "Interseptor, by Andrew Salim (@Veyal)",
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
  themeColor: "#0d2621",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={recursive.variable}>
      <body>{children}</body>
    </html>
  );
}
