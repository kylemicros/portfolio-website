import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Serif_JP } from "next/font/google";

import { RootFooter } from "@/components/RootFooter";
import { RootHeader } from "@/components/RootHeader";
import { NightSky } from "@/components/sky/NightSky";
import { siteConfig } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Only Latin glyphs are used. Google serves CJK families in unicode-range chunks,
// so the browser downloads just the Latin chunk; only that chunk is preloaded.
// The variable font covers 700 and 900 with one set of @font-face rules instead of two.
const notoSerifJp = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  weight: "variable",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Makes the generated share image's URL absolute.
  metadataBase: new URL(siteConfig.url),
  title: `${siteConfig.name} | ${siteConfig.role}`,
  description: siteConfig.hero.description,
  keywords: [...siteConfig.skills, siteConfig.role, siteConfig.location],
  authors: [{ name: siteConfig.name }],
  openGraph: {
    title: `${siteConfig.name} | ${siteConfig.role}`,
    description: siteConfig.hero.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | ${siteConfig.role}`,
    description: siteConfig.hero.description,
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#08080a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The font variables sit on <html>, where Tailwind sets the page's `font-sans`.
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSerifJp.variable}`}
    >
      <body className="bg-background text-foreground antialiased">
        <NightSky />
        <div className="flex min-h-screen flex-col">
          <RootHeader />
          {children}
          <RootFooter />
        </div>
      </body>
    </html>
  );
}
