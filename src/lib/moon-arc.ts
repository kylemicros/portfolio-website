/**
 * The moon's path across the night sky: half an ellipse, from low on the right at the top of the
 * page, over the top of the sky, to past the bottom left corner at the end of the page. On phones
 * held upright it starts in a gap between the hero's text blocks.
 * Pure functions, no DOM. Coordinates are in px from the top left of the sky.
 */

export interface MoonPlacement {
  /** Centre, from the left. */
  x: number;
  /** Centre, from the top. */
  y: number;
  /** Radius. */
  r: number;
}

// The angles of the path, in turns of a half circle, measured as on a clock face drawn the
// mathematical way (0 points right, a half turn points left, angles grow upward).
const START = 0.18;
const END = 1.17;
// On short, wide screens (a phone on its side) the hero's kanji and heading fill the sky's
// upper half, so the moon starts lower on the right, below the kanji. The start eases from
// START_SHORT at SHORT_HEIGHT and below to START at TALL_HEIGHT and above.
const START_SHORT = 0.06;
const SHORT_HEIGHT = 450;
const TALL_HEIGHT = 760;
// The ellipse's centre sits this far down the sky; the path rises above it.
const CENTRE_Y = 0.9;
// How high the path climbs, as a share of the sky's height. Lower on portrait screens, where the
// sky is tall and narrow.
const RISE_LANDSCAPE = 0.74;
const RISE_PORTRAIT = 0.62;
// Space kept between the moon and the right edge where it starts.
const EDGE_MARGIN = 0.02;
// Phones held upright, narrower than PHONE_WIDTH, have their own path. The hero's shaded text
// blocks fill most of the first screen there, so the moon starts in a gap between them. The
// hero is laid out in px, so the gap is in px from the top. Below PHONE_NARROW the heading's
// last lines are short and the moon starts beside them, above the clouds; from there the
// heading wraps wider, and the moon starts beside the buttons, which these taller phones show
// on load.
const PHONE_WIDTH = 480;
const PHONE_NARROW = 400;
const PHONE_START_HIGH = 268;
const PHONE_START_LOW = 682;
// The top of the phone path, kept below the site header.
const PHONE_TOP = 110;

/** The moon's radius for a sky of this size: larger on large screens, within limits. */
export function moonRadius(width: number, height: number): number {
  return Math.min(72, Math.max(24, Math.min(width, height) * 0.075));
}

/** Where the path starts for a sky of this size, in turns of a half circle. */
function startAngle(width: number, height: number): number {
  if (width < height) return START;
  const tall = Math.min(1, Math.max(0, (height - SHORT_HEIGHT) / (TALL_HEIGHT - SHORT_HEIGHT)));
  return START_SHORT + (START - START_SHORT) * tall;
}

/**
 * The ellipse of the phone path: its top at PHONE_TOP, its end far enough down that the whole
 * moon is below the sky, with a radius to spare.
 */
function phoneEllipse(height: number, r: number): { cy: number; ry: number } {
  // At the end angle the path is this share of the vertical radius below the centre.
  const below = -Math.sin(Math.PI * END);
  const ry = (height + 2 * r - PHONE_TOP) / (1 + below);
  return { cy: PHONE_TOP + ry, ry };
}

/**
 * Where the moon sits for a scroll progress from 0 (top of the page) to 1 (the end).
 * At 0 it is fully in view on the right; at 1 it is fully out of view below the left side.
 */
export function moonAt(progress: number, width: number, height: number): MoonPlacement {
  const p = Math.min(1, Math.max(0, progress));
  const r = moonRadius(width, height);

  if (width < height && width < PHONE_WIDTH) {
    const { cy, ry } = phoneEllipse(height, r);
    const startY = width < PHONE_NARROW ? PHONE_START_HIGH : Math.min(PHONE_START_LOW, height - 2 * r);
    // The start angle that puts the moon at startY. Below the centre it is a little under zero.
    const start = Math.asin(Math.min(1, Math.max(-1, (cy - startY) / ry))) / Math.PI;
    const angle = Math.PI * (start + (END - start) * p);
    // The path starts just inside the right edge, and at its widest the moon's centre reaches the
    // left edge, so the moon stays at least half in view until it sinks below the sky.
    const rx = (width - r - width * EDGE_MARGIN) / (1 + Math.cos(Math.PI * start));
    return { x: rx + Math.cos(angle) * rx, y: cy - Math.sin(angle) * ry, r };
  }

  const start = startAngle(width, height);
  const angle = Math.PI * (start + (END - start) * p);

  // The horizontal radius puts the starting moon just inside the right edge, whatever the width.
  const cx = width / 2;
  const rx = (cx - r - width * EDGE_MARGIN) / Math.cos(Math.PI * start);
  const ry = height * (width < height ? RISE_PORTRAIT : RISE_LANDSCAPE);
  const cy = height * CENTRE_Y;

  return { x: cx + Math.cos(angle) * rx, y: cy - Math.sin(angle) * ry, r };
}
