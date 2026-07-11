import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./splitbill.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-sb-display",
  display: "swap",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sb-body",
  display: "swap",
});

export default function SplitbillLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`sb-root ${display.variable} ${body.variable}`}>{children}</div>
  );
}
