import type { Metadata, Viewport } from "next";
import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadataBase = new URL("https://wavelength-game.vercel.app");

export const metadata: Metadata = {
  title: "Wavelength — Party Game",
  description: "The mind-reading party game. Give clues. Read minds. Get on the same wavelength.",
  metadataBase,
  keywords: [
    "Wavelength",
    "party game",
    "social game",
    "mind-reading game",
    "group game",
    "online party game",
  ],
  authors: [
    {
      name: "Wavelength",
      url: "https://wavelength-game.vercel.app",
    },
  ],
  creator: "Wavelength",
  publisher: "Wavelength",
  themeColor: "#0a0b0f",
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/logo.svg" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Wavelength — Party Game",
    description: "The mind-reading party game. Give clues. Read minds. Get on the same wavelength.",
    url: "/",
    siteName: "Wavelength",
    images: [
      {
        url: "/banner.svg",
        width: 1200,
        height: 630,
        alt: "Wavelength Party Game Banner",
        type: "image/svg+xml",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wavelength — Party Game",
    description: "The mind-reading party game. Give clues. Read minds. Get on the same wavelength.",
    images: ["/banner.svg"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
    },
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceMono.variable} antialiased min-h-screen`}
        style={{ background: "var(--bg)", color: "var(--fg)" }}
      >
        {children}
      </body>
    </html>
  );
}
