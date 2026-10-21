/**
 * The moon's loop around the night sky: a full ellipse whose upper part crosses the sky from
 * right to left and whose lower part runs below the bottom edge, out of view, back to the right.
 * It starts low on the right and goes round about once a minute. On phones held upright it starts
 * in a gap between the hero's text blocks. A visitor can hold the moon somewhere else for a while;
 * let go, it eases back onto the loop.
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

/** A point in the sky, in px from its top left. */
export interface SkyPoint {
  x: number;
  y: number;
}

/** Where the visitor let go of the moon, and when, in seconds on the loop's clock. */
export interface MoonRelease extends SkyPoint {
  at: number;
}

/**
 * Everything that places the moon besides the sky's size and the visitor's motion preference.
 * The page owns it and hands every change to the sky, so both work out the same placement.
 */
export interface MoonMotion {
  /** When the loop was at its start, in ms on the shared clock (`skyNow`). */
  origin: number;
  /** Where the visitor holds the moon's centre, while they drag it. */
  held: SkyPoint | null;
  /** Where the visitor let go of it, so it can ease back onto the loop. */
  released: MoonRelease | null;
}

// Seconds the loop takes, and the share of them the moon spends at least partly in view. The
// part below the edge, which nobody sees, goes faster.
const PERIOD = 60;
const IN_VIEW = 0.75;
// Seconds the moon takes to ease back onto its loop once let go.
const RETURN = 1.4;
// The start's angle, in turns of a half circle, measured as on a clock face drawn the
// mathematical way (0 points right, a half turn points left, angles grow upward).
const START = 0.18;
// On short, wide screens (a phone on its side) the hero's kanji and heading fill the sky's
// upper half, so the moon starts lower on the right, below the kanji. The start eases from
// START_SHORT at SHORT_HEIGHT and below to START at TALL_HEIGHT and above.
const START_SHORT = 0.06;
const SHORT_HEIGHT = 450;
const TALL_HEIGHT = 760;
// The ellipse's centre sits this far down the sky; the loop rises above it.
const CENTRE_Y = 0.9;
// How high the loop climbs, as a share of the sky's height. Lower on portrait screens, where the
// sky is tall and narrow.
const RISE_LANDSCAPE = 0.74;
const RISE_PORTRAIT = 0.62;
// At the top of the loop the moon's top edge stays this far down the sky, below the site header.
const HEADER_CLEAR = 88;
// Space kept between the moon and the right edge where it starts.
const EDGE_MARGIN = 0.02;
// Phones held upright, narrower than PHONE_WIDTH, climb as high as the header allows. The hero's
// shaded text blocks fill most of their first screen, so the moon starts in a gap between them.
// The hero is laid out in px, so the gap is in px from the top. Below PHONE_NARROW the heading's
// last lines are short and the moon starts beside them, above the clouds; from there the
// heading wraps wider, and the moon starts beside the buttons, which these taller phones show
// on load.
const PHONE_WIDTH = 480;
const PHONE_NARROW = 400;
const PHONE_START_HIGH = 268;
const PHONE_START_LOW = 682;
// The highest a phone's start may sit on its ellipse, as the sine of its angle, so the ellipse
// keeps a sensible width.
const PHONE_START_LIMIT = 0.95;

interface Loop {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  r: number;
  /** Angles in radians: where the moon starts, comes into view on the right and goes out of view below the left. */
  start: number;
  rise: number;
  set: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The shared clock, in ms. It reads the same in the page and in its worker. */
export function skyNow(): number {
  return performance.timeOrigin + performance.now();
}

/** The moon's radius for a sky of this size: larger on large screens, within limits. */
export function moonRadius(width: number, height: number): number {
  return Math.min(72, Math.max(24, Math.min(width, height) * 0.075));
}

/** Where the loop starts on screens other than upright phones, in turns of a half circle. */
function startAngle(width: number, height: number): number {
  if (width < height) return START;
  const tall = clamp((height - SHORT_HEIGHT) / (TALL_HEIGHT - SHORT_HEIGHT), 0, 1);
  return START_SHORT + (START - START_SHORT) * tall;
}

/** The loop's ellipse for a sky of this size. */
function loopFor(width: number, height: number): Loop {
  const r = moonRadius(width, height);
  const cy = height * CENTRE_Y;
  const phone = width < height && width < PHONE_WIDTH;
  const highest = cy - HEADER_CLEAR - r;
  const rise = height * (width < height ? RISE_PORTRAIT : RISE_LANDSCAPE);
  const ry = Math.max(r, phone ? highest : Math.min(rise, highest));

  let start = Math.PI * startAngle(width, height);
  if (phone) {
    const startY = width < PHONE_NARROW ? PHONE_START_HIGH : Math.min(PHONE_START_LOW, height - 2 * r);
    start = Math.asin(clamp((cy - startY) / ry, -PHONE_START_LIMIT, PHONE_START_LIMIT));
  }

  // The horizontal radius puts the starting moon just inside the right edge, whatever the width.
  const cx = width / 2;
  const rx = (cx - r - width * EDGE_MARGIN) / Math.cos(start);
  // Below this angle under either end the whole moon is below the sky.
  const below = Math.asin(clamp((height + r - cy) / ry, -1, 1));
  // On narrow phones the ellipse is wider than the sky, and the whole moon is past the side edge
  // within this angle of either end. Out of view from there down, it comes into view higher up.
  const side = (cx + r) / rx;
  const beside = side < 1 ? Math.acos(side) : -Infinity;
  const hidden = beside >= below ? beside : -below;
  return { cx, cy, rx, ry, r, start, rise: hidden, set: Math.PI - hidden };
}

/**
 * The moon's angle on its loop after this many seconds: steady while in view, faster below the
 * edge. The speed changes only where the moon is wholly out of view.
 */
function angleAt(loop: Loop, seconds: number): number {
  const shown = loop.set - loop.rise;
  const hidden = 2 * Math.PI - shown;
  const startShare = ((loop.start - loop.rise) / shown) * IN_VIEW;
  const phase = (((seconds / PERIOD + startShare) % 1) + 1) % 1;
  if (phase < IN_VIEW) return loop.rise + (shown * phase) / IN_VIEW;
  return loop.set + (hidden * (phase - IN_VIEW)) / (1 - IN_VIEW);
}

/** Where the loop has the moon after this many seconds. At 0 it is at its start, in view on the right. */
export function loopAt(seconds: number, width: number, height: number): MoonPlacement {
  const loop = loopFor(width, height);
  const angle = angleAt(loop, seconds);
  return { x: loop.cx + Math.cos(angle) * loop.rx, y: loop.cy - Math.sin(angle) * loop.ry, r: loop.r };
}

/** A held moon stays wholly inside the sky. */
function inSky(point: SkyPoint, r: number, width: number, height: number): SkyPoint {
  return { x: clamp(point.x, r, Math.max(r, width - r)), y: clamp(point.y, r, Math.max(r, height - r)) };
}

/**
 * Where the moon is at this time on the shared clock: on its loop, where the visitor holds it, or
 * on its way back to the loop. With reduced motion the loop stands still at its start and a
 * released moon goes straight back there.
 */
export function moonAt(motion: MoonMotion, now: number, width: number, height: number, reduced: boolean): MoonPlacement {
  const seconds = (now - motion.origin) / 1000;
  const loop = loopAt(reduced ? 0 : seconds, width, height);
  if (motion.held) return { ...inSky(motion.held, loop.r, width, height), r: loop.r };

  const released = motion.released;
  if (!released || reduced) return loop;
  const t = (seconds - released.at) / RETURN;
  if (t < 0 || t >= 1) return loop;
  // Eased in and out, so the moon leaves the visitor's hand and joins the moving loop without a jolt.
  const k = t * t * (3 - 2 * t);
  const from = inSky(released, loop.r, width, height);
  return { x: from.x + (loop.x - from.x) * k, y: from.y + (loop.y - from.y) * k, r: loop.r };
}
