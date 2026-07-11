import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

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
        {/* Confetti-paper backdrop with floating doodles */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-background" />
          <div className="absolute inset-0 bg-grid" />
          <span className="absolute left-[6%] top-[12%] text-3xl opacity-40 animate-float">✦</span>
          <span className="absolute right-[10%] top-[20%] text-2xl opacity-40 animate-float" style={{ animationDelay: "1s" }}>★</span>
          <span className="absolute left-[14%] bottom-[18%] text-2xl opacity-30 animate-float" style={{ animationDelay: "2s" }}>♥</span>
          <span className="absolute right-[18%] bottom-[10%] text-3xl opacity-30 animate-float" style={{ animationDelay: "0.5s" }}>✦</span>
          <span className="absolute left-[45%] top-[6%] text-xl opacity-30 animate-float" style={{ animationDelay: "1.5s" }}>✧</span>
        </div>
        {children}
      </body>
    </html>
  );
}
