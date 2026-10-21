/** The ways the quote is set: short columns on wide screens, longer columns on upright phones, lines on short screens. */
export type QuoteSetting = "wide" | "narrow" | "lines";

/** A glyph placed in a layout: its index in the glyph list and the top-left of its cell. */
export type GlyphPlacement = readonly [glyph: number, x: number, y: number];

/**
 * One way to set the quote, in font units (1000 to the em). Each glyph's path fills a 1000 by 1000
 * cell from its top-left corner, y down.
 */
export interface QuoteLayout {
  readonly width: number;
  readonly height: number;
  readonly quote: readonly GlyphPlacement[];
  /** The credit's cells, in the credit's own units: they are drawn scaled by `creditScale`. */
  readonly credit: readonly GlyphPlacement[];
  readonly creditScale: number;
  /** The crimson rule before the credit, in place of a dash. */
  readonly rule: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}

/** The quote ready to draw: the glyph outlines and the layout that places them. */
export interface QuoteArt {
  readonly glyphs: readonly string[];
  readonly layout: QuoteLayout;
  readonly setting: QuoteSetting;
}
