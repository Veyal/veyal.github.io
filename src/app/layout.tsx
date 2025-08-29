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
  title: "Veyal Personal Web",
  description: "Personal Website for Veyal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Game World Background */}
        <div className="game-world">
          <div className="layer-1"></div>
          <div className="layer-2"></div>
          <div className="layer-3">
            {/* Floating Stars */}
            <div className="floating-star" style={{ top: '10%', left: '15%', animationDelay: '0s' }}>⭐</div>
            <div className="floating-star" style={{ top: '30%', right: '20%', animationDelay: '1s' }}>✨</div>
            <div className="floating-star" style={{ top: '60%', left: '10%', animationDelay: '2s' }}>⭐</div>
            <div className="floating-star" style={{ top: '80%', right: '15%', animationDelay: '1.5s' }}>✨</div>
            <div className="floating-star" style={{ top: '45%', left: '40%', animationDelay: '0.5s' }}>⭐</div>
            
            {/* Warp Stars */}
            <div className="warp-star" style={{ top: '20%', left: '80%' }}></div>
            <div className="warp-star" style={{ bottom: '30%', left: '20%', animationDelay: '1.5s' }}></div>
            
            {/* Bubbles */}
            <div className="bubble" style={{ width: '40px', height: '40px', top: '70%', left: '5%', animationDelay: '0s' }}></div>
            <div className="bubble" style={{ width: '30px', height: '30px', top: '40%', right: '10%', animationDelay: '2s' }}></div>
            <div className="bubble" style={{ width: '50px', height: '50px', bottom: '20%', right: '30%', animationDelay: '1s' }}></div>
            <div className="bubble" style={{ width: '25px', height: '25px', top: '15%', left: '50%', animationDelay: '3s' }}></div>
            
            {/* Dream Clouds */}
            <div className="dream-cloud" style={{ top: '10%', left: '30%', animationDelay: '0s' }}></div>
            <div className="dream-cloud" style={{ top: '50%', right: '20%', animationDelay: '5s' }}></div>
            <div className="dream-cloud" style={{ bottom: '15%', left: '60%', animationDelay: '10s' }}></div>
            
            {/* Rainbow Streaks */}
            <div className="rainbow-streak" style={{ width: '100px', top: '25%', animationDelay: '0s' }}></div>
            <div className="rainbow-streak" style={{ width: '80px', top: '75%', animationDelay: '1.5s' }}></div>
            
            {/* Power-ups */}
            <div className="power-up" style={{ top: '35%', left: '25%', animationDelay: '0s' }}></div>
            <div className="power-up" style={{ bottom: '40%', right: '35%', animationDelay: '1s' }}></div>
            
            {/* Platforms */}
            <div className="platform" style={{ width: '120px', height: '20px', bottom: '25%', left: '10%' }}></div>
            <div className="platform" style={{ width: '100px', height: '20px', bottom: '45%', right: '25%' }}></div>
            
            {/* Castle Silhouette */}
            <div className="castle-silhouette"></div>
          </div>
        </div>
        
        {children}
      </body>
    </html>
  );
}
