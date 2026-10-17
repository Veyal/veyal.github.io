import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { KirbyBackdrop } from "@/components/site/KirbyBackdrop";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Andrew Salim (@Veyal) — friendly neighborhood hacker",
  description:
    "Hi, I'm Andrew! I hack things for a living (nicely). OSCP, OSWE & GMOB certified security person, tool tinkerer, and professional button presser. Come play with my free browser tools!",
  metadataBase: new URL("https://veyal.github.io"),
  openGraph: {
    title: "Andrew Salim (@Veyal) — friendly neighborhood hacker",
    description:
      "I hack things for a living (nicely). Security person, tool tinkerer, professional button presser — with free browser tools to play with.",
    url: "https://veyal.github.io",
    images: ["/profile.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Confetti-paper backdrop with scroll-parallax doodles */}
        <KirbyBackdrop />
        {children}
      </body>
    </html>
  );
}
