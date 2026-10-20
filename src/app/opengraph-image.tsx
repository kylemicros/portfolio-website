import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

// The preview shown where a link to the site is shared. Generated once, at build time.

const { name, role, hero } = siteConfig;

export const alt = `${name}, ${role}: ${hero.title}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The theme's colours, as hex: the image renderer does not read the site's CSS.
const INK = "#08080a";
const PAPER = "#ece6da";
const MUTED = "#bdbdc7";
const BLADE = "#c8102e";
const BLADE_HOT = "#ff2a3d";

// The site's emblem, the same file the browser uses as its icon.
const emblem = await readFile(join(process.cwd(), "src/app/icon.svg"), "base64");
const emblemSrc = `data:image/svg+xml;base64,${emblem}`;

/**
 * The headline's words, those of the emphasis in red when the emphasis really is part of it. The
 * image renderer lays out each child as its own box, so each word is one, and they wrap as text.
 */
function headlineWords(): { word: string; red: boolean }[] {
  const { title, titleEmphasis } = hero;
  const index = titleEmphasis ? title.indexOf(titleEmphasis) : -1;
  const end = titleEmphasis && index >= 0 ? index + titleEmphasis.length : -1;

  const words: { word: string; red: boolean }[] = [];
  for (const match of title.matchAll(/\S+/g)) {
    const at = match.index;
    words.push({ word: match[0], red: index >= 0 && at >= index && at < end });
  }
  return words;
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "72px 80px",
          backgroundColor: INK,
          borderLeft: `16px solid ${BLADE}`,
          color: PAPER,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <img src={emblemSrc} width={104} height={104} alt="" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 40, letterSpacing: -0.5 }}>{name}</div>
            <div style={{ fontSize: 24, letterSpacing: 4, textTransform: "uppercase", color: MUTED }}>{role}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", maxWidth: 960, fontSize: 76, lineHeight: 1.1, letterSpacing: -1.5 }}>
          {headlineWords().map(({ word, red }, i) => (
            <span key={i} style={{ marginRight: 20, color: red ? BLADE_HOT : PAPER }}>
              {word}
            </span>
          ))}
        </div>
      </div>
    ),
    size
  );
}
