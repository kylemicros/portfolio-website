import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Serif_JP } from "next/font/google";
import localFont from "next/font/local";

import { InkBackdrop } from "@/components/InkBackdrop";
import { RootFooter } from "@/components/RootFooter";
import { RootHeader } from "@/components/RootHeader";
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

// The brush face for the small section labels, which are set in capitals. The file holds only
// the capitals those labels use (A B C E I J N O P R S T U X), about 6 KB.
// Source: Yuji Syuku (Google Fonts, fonts.googleapis.com/css2?family=Yuji+Syuku&text=ABCEIJNOPRSTUX),
// licensed under the SIL Open Font License 1.1. Not preloaded: the labels sit below the first screen.
const yujiSyuku = localFont({
  src: "../assets/fonts/yuji-syuku-labels.woff2",
  variable: "--font-yuji-syuku",
  weight: "400",
  display: "swap",
  preload: false,
  declarations: [{ prop: "unicode-range", value: "U+41-43, U+45, U+49-4A, U+4E-50, U+52-55, U+58" }],
});

export const metadata: Metadata = {
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
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} ${notoSerifJp.variable} ${yujiSyuku.variable} bg-background text-foreground antialiased`}>
        <InkBackdrop />
        <div className="flex min-h-screen flex-col">
          <RootHeader />
          {children}
          <RootFooter />
        </div>
      </body>
    </html>
  );
}
