import type { QuoteSetting } from "./quote-art";

// Generated with the glyph modules: each layout's size in font units, so the splash can choose a
// layout before its glyphs load.
export const QUOTE_SIZES: Readonly<Record<QuoteSetting, { readonly width: number; readonly height: number }>> = {
  wide: { width: 12150, height: 9000 },
  narrow: { width: 7800, height: 12000 },
  lines: { width: 12000, height: 7800 },
};
