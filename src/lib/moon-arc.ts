/**
 * The moon's loop around the night sky: one smooth egg-shaped curve, wider than the sky, standing
 * on its broad end. The moon rides over the narrow top from right to left, in view, and leaves
 * past the left edge (on short screens, the bottom left) at a clear angle. It goes round the broad
 * lower part wholly out of view, glow and all, and comes back in past the right edge. It starts low on the right and goes round
 * about once a minute. On phones held upright it starts in a gap between the hero's text blocks.
 * A visitor can hold the moon somewhere else for a while; let go, it eases back onto the loop.
 * No DOM. Coordinates are in px from the top left of the sky.
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

// Seconds the loop takes. The moon moves at one steady speed while it or its glow is in view; the
// time left over goes on the part nobody sees, at whatever speed that takes.
const PERIOD = 60;
// The most of the loop's time the moon may spend in view.
const MOST_IN_VIEW = 0.75;
// Seconds the moon takes to pass through an edge of the sky, from touching it to wholly beyond
// it, at most. On narrow screens the moon moves faster so it never lingers half cut off.
const CROSSING = 2;
/**
 * How far the moon's glow reaches, in moon radii from its centre. The sky's shader fades the glow
 * out to nothing by there, so a moon this far past the edges leaves no trace in view.
 */
export const GLOW_REACH = 4;
// Seconds the moon takes to ease back onto its loop once let go.
const RETURN = 1.4;
// The start and the egg's top are placed on a guide ellipse. The start's angle on it, in turns of
// a half circle, measured as on a clock face drawn the mathematical way (0 points right, a half
// turn points left, angles grow upward).
const START = 0.18;
// On short, wide screens (a phone on its side) the hero's kanji and heading fill the sky's
// upper half, so the moon starts lower on the right, below the kanji. The start eases from
// START_SHORT at SHORT_HEIGHT and below to START at TALL_HEIGHT and above.
const START_SHORT = 0.06;
const SHORT_HEIGHT = 450;
const TALL_HEIGHT = 760;
// The guide's centre sits this far down the sky.
const CENTRE_Y = 0.9;
// How high the guide climbs, as a share of the sky's height. Lower on portrait screens, where the
// sky is tall and narrow. The egg's top is the guide's top.
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
// The highest a phone's start may sit on the guide, as the sine of its angle, so the arc over
// the top keeps some height.
const PHONE_START_LIMIT = 0.95;
/**
 * How egg-like the loop is. For an angle t round the egg, 0 at its top and growing as the moon
 * goes left over it, the moon's centre is at
 *   x = cx - a (sin t - EGG / 2 sin 2t),  y = top + b (1 - cos t).
 * With EGG at 0 that is an ellipse. Above 0 the top narrows and the bottom widens. Below 1/√2
 * the curve bends the same way all round, never runs straight, and its bend changes smoothly.
 */
const EGG = 0.5;
// The moon's glow clears the sky by at least this many radii more round the lower part.
const HIDDEN_MARGIN = 0.5;
// Where the start sits on the egg, as its angle t, is found in this many tries, then refined.
const START_TRIES = 200;
// The start's angle on the egg is kept at or above this many radians, so the egg stays an egg
// rather than one huge, nearly flat curve. Where the start is too low and close to the right
// edge for that, the egg's top comes down by TOP_STEP of the sky's height at a time until it fits.
const START_LEAST = 0.6;
const TOP_STEP = 0.01;
// The egg is measured in this many pieces, so the moon can go round it at the speeds above.
const EGG_STEPS = 1440;

interface Egg {
  cx: number;
  top: number;
  a: number;
  b: number;
  /** The start's angle on the egg, on the right of the top. */
  start: number;
}

interface Loop {
  egg: Egg;
  r: number;
  /** The angle round the egg at each of EGG_STEPS + 1 points, from the start to the start again. */
  angles: readonly number[];
  /** How far along the egg each of those points is from the start. */
  lengths: readonly number[];
  /** How far from the start the moon's glow has wholly left the sky, past the left edge. */
  hide: number;
  /** How far from the start the moon's glow comes back into the sky, past the right edge. */
  show: number;
  /** The moon's speed while it or its glow is in view, in px a second. */
  speed: number;
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

/** Where the start sits on the guide on screens other than upright phones, in turns of a half circle. */
function startAngle(width: number, height: number): number {
  if (width < height) return START;
  const tall = clamp((height - SHORT_HEIGHT) / (TALL_HEIGHT - SHORT_HEIGHT), 0, 1);
  return START_SHORT + (START - START_SHORT) * tall;
}

/** The moon's start, in view low on the right, and the height of the loop's top. */
function startFor(width: number, height: number, r: number): { start: SkyPoint; top: number } {
  const centre = height * CENTRE_Y;
  const phone = width < height && width < PHONE_WIDTH;
  const highest = centre - HEADER_CLEAR - r;
  const climb = height * (width < height ? RISE_PORTRAIT : RISE_LANDSCAPE);
  const reach = Math.max(r, phone ? highest : Math.min(climb, highest));

  // How high the start sits on the guide, as the sine of its angle there.
  let lift = Math.sin(Math.PI * startAngle(width, height));
  if (phone) {
    const startY = width < PHONE_NARROW ? PHONE_START_HIGH : Math.min(PHONE_START_LOW, height - 2 * r);
    lift = clamp((centre - startY) / reach, -PHONE_START_LIMIT, PHONE_START_LIMIT);
  }
  return { start: { x: width - r - width * EDGE_MARGIN, y: centre - lift * reach }, top: centre - reach };
}

/** The moon's centre at this angle round the egg. */
function eggPoint(egg: Egg, t: number): SkyPoint {
  return {
    x: egg.cx - egg.a * (Math.sin(t) - (EGG / 2) * Math.sin(2 * t)),
    y: egg.top + egg.b * (1 - Math.cos(t)),
  };
}

/** The egg's angle at its widest, where its sides are upright. */
const WIDEST = Math.acos((1 - Math.sqrt(1 + 8 * EGG * EGG)) / (4 * EGG));

/** The egg with this top that has the moon's start at this angle on it. */
function eggThrough(cx: number, top: number, start: SkyPoint, t: number): Egg {
  const a = Math.max(1, start.x - cx) / (Math.sin(t) * (1 - EGG * Math.cos(t)));
  const b = Math.max(1, start.y - top) / (1 - Math.cos(t));
  return { cx, top, a, b, start: t };
}

/**
 * Whether the egg's lower part keeps the moon and its glow wholly out of view: at the height
 * where the glow is wholly below the sky, the egg is already wider than the sky by the glow's
 * reach on both sides. The egg bends the same way all round, so each side stays at least that
 * wide from there up to its widest point, and above that moves steadily inward and upward: the
 * moon comes into view once, and leaves once.
 */
function hidesBelow(egg: Egg, width: number, height: number, r: number): boolean {
  const clear = (GLOW_REACH + HIDDEN_MARGIN) * r;
  const c = 1 - (height + clear - egg.top) / egg.b;
  if (c <= -1) return false;
  const t = Math.acos(c);
  return egg.a * Math.sin(t) * (1 - EGG * Math.cos(t)) >= width / 2 + clear;
}

/**
 * The egg for a sky of this size: its top is the guide's top, it passes through the start, and
 * it is the smallest egg whose lower part keeps the moon wholly out of view. Its top comes down
 * only where the start is too low and too close to the right edge for that.
 */
function eggFor(width: number, height: number, r: number): Egg {
  const { start, top } = startFor(width, height, r);
  const cx = width / 2;
  let best: Egg | null = null;
  for (let lowered = top; lowered < start.y - r; lowered += TOP_STEP * height) {
    // The largest angle, so the smallest egg, that still hides the lower part.
    let found = 0;
    for (let i = START_TRIES; i > 0 && !found; i--) {
      const t = (WIDEST * i) / (START_TRIES + 1);
      if (hidesBelow(eggThrough(cx, lowered, start, t), width, height, r)) found = t;
    }
    if (!found) continue;
    let low = found;
    let high = found + WIDEST / (START_TRIES + 1);
    for (let i = 0; i < 24; i++) {
      const mid = (low + high) / 2;
      if (hidesBelow(eggThrough(cx, lowered, start, mid), width, height, r)) low = mid;
      else high = mid;
    }
    const egg = eggThrough(cx, lowered, start, low);
    if (low >= START_LEAST) return egg;
    if (!best || low > best.start) best = egg;
  }
  return best ?? eggThrough(cx, top, start, START_LEAST);
}

/** How far the moon's centre is from the sky, 0 inside it. */
function beyond(point: SkyPoint, width: number, height: number): number {
  return Math.hypot(Math.max(0, -point.x, point.x - width), Math.max(0, -point.y, point.y - height));
}

/** Whether the whole disc is inside the sky. */
function inside(point: SkyPoint, r: number, width: number, height: number): boolean {
  return point.x >= r && point.x <= width - r && point.y >= r && point.y <= height - r;
}

/** The loop for a sky of this size. */
function loopFor(width: number, height: number): Loop {
  const r = moonRadius(width, height);
  const egg = eggFor(width, height, r);
  const angles = [-egg.start];
  const lengths = [0];
  const points = [eggPoint(egg, angles[0])];
  for (let i = 1; i <= EGG_STEPS; i++) {
    const angle = angles[0] + (2 * Math.PI * i) / EGG_STEPS;
    const point = eggPoint(egg, angle);
    const last = points[i - 1];
    angles.push(angle);
    lengths.push(lengths[i - 1] + Math.hypot(point.x - last.x, point.y - last.y));
    points.push(point);
  }
  const total = lengths[EGG_STEPS];
  const hidden = (i: number) => beyond(points[i], width, height) >= GLOW_REACH * r;

  // Out of view from the first point past the left edge whose glow is wholly out, back in after
  // the last such point before the start comes round again.
  let hide = 0;
  while (hide < EGG_STEPS && !hidden(hide)) hide++;
  let show = EGG_STEPS;
  while (show > hide && !hidden(show)) show--;

  // How far the moon goes while the disc is cut by an edge, as it leaves and as it comes back.
  let leftIn = hide;
  while (leftIn > 0 && !inside(points[leftIn], r, width, height)) leftIn--;
  let leftOut = leftIn;
  while (leftOut < hide && beyond(points[leftOut], width, height) < r) leftOut++;
  let backIn = show;
  while (backIn < EGG_STEPS && !inside(points[backIn], r, width, height)) backIn++;
  let backOut = backIn;
  while (backOut > show && beyond(points[backOut], width, height) < r) backOut--;
  const crossing = Math.max(lengths[leftOut] - lengths[leftIn], lengths[backIn] - lengths[backOut]);

  const shown = lengths[hide] + total - lengths[show];
  // Where the moon never leaves the sky, or never enters it, it goes round at one speed.
  const steady = hide === EGG_STEPS || shown === 0;
  const speed = steady ? total / PERIOD : Math.max(shown / (MOST_IN_VIEW * PERIOD), crossing / CROSSING);
  return { egg, r, angles, lengths, hide: lengths[hide], show: lengths[show], speed };
}

// The loop for the last sky size asked for. Working one out takes a few thousand steps, and the
// sky asks for the same size every frame.
let lastLoop: { width: number; height: number; loop: Loop } | null = null;

function cachedLoop(width: number, height: number): Loop {
  if (lastLoop?.width !== width || lastLoop.height !== height) lastLoop = { width, height, loop: loopFor(width, height) };
  return lastLoop.loop;
}

/** How far along the egg from the start the moon is after this many seconds. */
function distanceAt(loop: Loop, seconds: number): number {
  const { hide, show, speed, lengths } = loop;
  const total = lengths[EGG_STEPS];
  const phase = ((seconds % PERIOD) + PERIOD) % PERIOD;
  const leaving = hide / speed;
  // The time left over once the moon has crossed the sky goes on the part out of view.
  const away = Math.max(0, PERIOD - (hide + total - show) / speed);
  if (phase < leaving) return phase * speed;
  if (phase < leaving + away) return hide + ((show - hide) * (phase - leaving)) / away;
  return Math.min(total, show + (phase - leaving - away) * speed);
}

/** The moon's centre this far along the egg from the start. */
function pointAlong(loop: Loop, distance: number): SkyPoint {
  const { lengths, angles, egg } = loop;
  let low = 0;
  let high = EGG_STEPS;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (lengths[mid] <= distance) low = mid;
    else high = mid;
  }
  const piece = lengths[high] - lengths[low];
  const k = piece > 0 ? clamp((distance - lengths[low]) / piece, 0, 1) : 0;
  return eggPoint(egg, angles[low] + (angles[high] - angles[low]) * k);
}

/** Where the loop has the moon after this many seconds. At 0 it is at its start, in view on the right. */
export function loopAt(seconds: number, width: number, height: number): MoonPlacement {
  const loop = cachedLoop(width, height);
  return { ...pointAlong(loop, distanceAt(loop, seconds)), r: loop.r };
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
