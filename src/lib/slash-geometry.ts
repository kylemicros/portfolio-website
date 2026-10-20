/**
 * Geometry for the blade slash: a quadratic curve across a box, the crescent shapes drawn
 * along it, and the two clip polygons that split content along it.
 * Pure functions, no DOM, React or GSAP. All coordinates are in px, relative to the box.
 */

export interface Point {
  x: number;
  y: number;
}

export interface SlashGeometry {
  /** Start of the curve. */
  p0: Point;
  /** Control point of the quadratic curve. */
  c: Point;
  /** End of the curve. */
  p1: Point;
  /** Unit vector perpendicular to the chord, pointing to the "above" side. */
  normal: Point;
  /** Unit vector along the chord, in the swing direction. */
  dir: Point;
  /** Thickness factor, 0.6 to 1.2, from the reference width of 1400 px. */
  scale: number;
}

export interface SlashOptions {
  /** Start, as fractions of the box (may sit outside 0 to 1). */
  from: Point;
  /** End, as fractions of the box. */
  to: Point;
  /** How far the curve bows away from the chord, as a fraction of the box height. */
  bow: number;
  /** Width the thickness scales from. Defaults to the box width. */
  scaleWidth?: number;
}

const REFERENCE_WIDTH = 1400;
const MIN_SCALE = 0.6;
const MAX_SCALE = 1.2;
// Far enough outside the box that the split polygons cover overflowing content too.
const FAR = 10000;

export function computeSlash(
  box: { width: number; height: number },
  opts: SlashOptions
): SlashGeometry {
  const { width, height } = box;
  const p0 = { x: opts.from.x * width, y: opts.from.y * height };
  const p1 = { x: opts.to.x * width, y: opts.to.y * height };

  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const length = Math.hypot(dx, dy) || 1;
  const dir = { x: dx / length, y: dy / length };
  const normal = { x: dy / length, y: -dx / length };

  const bow = opts.bow * height;
  const c = {
    x: (p0.x + p1.x) / 2 + normal.x * bow,
    y: (p0.y + p1.y) / 2 + normal.y * bow,
  };

  const scale = Math.max(
    MIN_SCALE,
    Math.min(MAX_SCALE, (opts.scaleWidth ?? width) / REFERENCE_WIDTH)
  );

  return { p0, c, p1, normal, dir, scale };
}

/** The point at `t` (0 to 1) along the curve. */
export function pointAt(g: SlashGeometry, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * g.p0.x + 2 * u * t * g.c.x + t * t * g.p1.x,
    y: u * u * g.p0.y + 2 * u * t * g.c.y + t * t * g.p1.y,
  };
}

/** The curve itself as an SVG path, for stroke-based masks. */
export function curvePath(g: SlashGeometry): string {
  return `M${g.p0.x},${g.p0.y} Q${g.c.x},${g.c.y} ${g.p1.x},${g.p1.y}`;
}

/**
 * A filled crescent along the curve: needle tips at both ends, `halfWidth` thick in the middle.
 * `shift` moves it along the normal (negative values trail behind the blade).
 */
export function crescentPath(g: SlashGeometry, halfWidth: number, shift = 0): string {
  const sx = g.normal.x * shift;
  const sy = g.normal.y * shift;
  const a = { x: g.p0.x + sx, y: g.p0.y + sy };
  const b = { x: g.p1.x + sx, y: g.p1.y + sy };
  const outer = { x: g.c.x + sx + g.normal.x * halfWidth, y: g.c.y + sy + g.normal.y * halfWidth };
  const inner = { x: g.c.x + sx - g.normal.x * halfWidth, y: g.c.y + sy - g.normal.y * halfWidth };
  return `M${a.x},${a.y} Q${outer.x},${outer.y} ${b.x},${b.y} Q${inner.x},${inner.y} ${a.x},${a.y} Z`;
}

/**
 * CSS `polygon(...)` clip paths for the content above and below the curve.
 * `origin` is the clipped element's top-left corner in the box, so the polygons line up
 * when that element does not start at the box's corner.
 */
export function splitPolygons(
  g: SlashGeometry,
  samples = 40,
  origin: Point = { x: 0, y: 0 }
): { above: string; below: string } {
  const px = (x: number, y: number) => `${x - origin.x}px ${y - origin.y}px`;

  const curve: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const q = pointAt(g, i / samples);
    curve.push(px(q.x, q.y));
  }

  const above = [
    px(-FAR, g.p0.y),
    px(-FAR, -FAR),
    px(FAR, -FAR),
    px(FAR, g.p1.y),
    ...[...curve].reverse(),
  ];
  const below = [
    px(-FAR, g.p0.y),
    ...curve,
    px(FAR, g.p1.y),
    px(FAR, FAR),
    px(-FAR, FAR),
  ];

  return { above: `polygon(${above.join(", ")})`, below: `polygon(${below.join(", ")})` };
}
