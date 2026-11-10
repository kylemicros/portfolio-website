"use client";

import { useEffect, useRef } from "react";

import { watchCovering } from "@/lib/covering";
import { MOTION_OK } from "@/lib/gsap";
import { whenSplashEnds } from "@/lib/splash";
import { cn } from "@/lib/utils";

type Point = readonly [number, number];

// Only with a mouse or trackpad on a wide window: on phones and touch screens it stays hidden.
const SHOWN = "(pointer: fine) and (min-width: 1024px)";
// How far the pupil moves from the centre, in the drawing's units (a pixel each), and how far away
// the pointer must be for it to go all the way.
const REACH_X = 10;
const REACH_Y = 4;
const FULL_AT = 240;
// The pupil closes 1 - 1/e of the way to the pointer every EASE_MS, and stops once it is this close.
const EASE_MS = 70;
const SETTLED = 0.02;
// Blinks come 2 to 7 s apart; one in five is a double blink.
const BLINK_MIN_MS = 2000;
const BLINK_SPREAD_MS = 5000;
const DOUBLE = 0.2;
// A blink as a person's (ms): the lids close about twice as fast as they open, stay shut for a
// moment, and ease into the open position slowly. The second of a double blink starts as the
// first is nearly open.
const CLOSE_MS = 90;
const SHUT_MS = 40;
const OPEN_MS = 210;
const SECOND_AT_MS = 300;

// The eye is drawn 72 by 48: its whole shape (the lids' outer edge), and the opening between the
// lids, from corner to corner, its upper edge bent up towards OPEN_UPPER and its lower edge down
// towards OPEN_LOWER. Shut, both edges bend to SEAM, so they meet in one seam curving a little down:
// the upper lid travels most of the way, the lower one rises a little.
const OUTLINE = "M2 24 Q36 -8 70 24 Q36 56 2 24 Z";
const LEFT: Point = [8, 24];
const RIGHT: Point = [64, 24];
const OPEN_UPPER = 4;
const OPEN_LOWER = 44;
const SEAM = 31;
const OPENING_ID = "watching-eye-opening";
const WHITE_ID = "watching-eye-white";

/** One lid's fangs: where they meet along its edge (0 to 1), how long they are, and how they lean. */
interface FangRow {
  cuts: readonly number[];
  lengths: readonly number[];
  leans: readonly number[];
}

// Uneven fangs along each lid's edge, the lower row set off from the upper.
const UPPER_ROW: FangRow = {
  cuts: [0.08, 0.17, 0.26, 0.35, 0.45, 0.55, 0.64, 0.73, 0.83, 0.92],
  lengths: [3, 5, 4, 6.5, 5, 7, 4.5, 5.5, 3.5],
  leans: [0.6, -0.5, 0.8, -0.4, 0.3, -0.8, 0.5, -0.6, 0.4],
};
const LOWER_ROW: FangRow = {
  cuts: [0.12, 0.21, 0.31, 0.41, 0.5, 0.6, 0.7, 0.79, 0.88],
  lengths: [2.5, 4.5, 6, 4, 6, 3.5, 5, 3],
  leans: [-0.4, 0.6, -0.7, 0.5, -0.3, 0.7, -0.5, 0.4],
};

/** A point on a quadratic curve from `a` to `b` bent towards `c`, at `t` from 0 to 1. */
function onCurve(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return [u * u * a[0] + 2 * t * u * c[0] + t * t * b[0], u * u * a[1] + 2 * t * u * c[1] + t * t * b[1]];
}

const fixed = (n: number) => n.toFixed(2);

/**
 * A row of fangs as one path: each stands on the lid's edge (bent towards `bend`) and points into
 * the opening (`way` 1 down, -1 up), its length scaled by `grown` (0 to 1).
 */
function fangs(bend: number, way: 1 | -1, row: FangRow, grown: number): string {
  const c: Point = [36, bend];
  return row.lengths
    .map((length, i) => {
      const from = onCurve(LEFT, c, RIGHT, row.cuts[i] ?? 0);
      const to = onCurve(LEFT, c, RIGHT, row.cuts[i + 1] ?? 1);
      const tip: Point = [(from[0] + to[0]) / 2 + (row.leans[i] ?? 0) * grown, (from[1] + to[1]) / 2 + way * length * grown];
      return `M${fixed(from[0])} ${fixed(from[1])}L${fixed(tip[0])} ${fixed(tip[1])}L${fixed(to[0])} ${fixed(to[1])}Z`;
    })
    .join("");
}

/** Every changing part of the lids at `open`, from 0 (shut) to 1 (open). */
function lidShapes(open: number) {
  const upper = SEAM + (OPEN_UPPER - SEAM) * open;
  const lower = SEAM + (OPEN_LOWER - SEAM) * open;
  const edge = (bend: number) => `M${LEFT[0]} ${LEFT[1]}Q36 ${fixed(bend)} ${RIGHT[0]} ${RIGHT[1]}`;
  return {
    opening: `${edge(upper)}Q36 ${fixed(lower)} ${LEFT[0]} ${LEFT[1]}Z`,
    upperEdge: edge(upper),
    lowerEdge: edge(lower),
    // The fangs draw back into the lids as they close, like teeth behind closing lips.
    upperFangs: fangs(upper, 1, UPPER_ROW, open),
    lowerFangs: fangs(lower, -1, LOWER_ROW, open),
  };
}

const OPEN_SHAPES = lidShapes(1);

/**
 * How open the eye is, `t` ms into a blink: it closes with gathering speed, stays shut, then opens
 * fast at first and settles slowly into place.
 */
function blinkOpen(t: number): number {
  if (t <= 0 || t >= CLOSE_MS + SHUT_MS + OPEN_MS) return 1;
  if (t < CLOSE_MS) {
    const x = t / CLOSE_MS;
    return 1 - x * x;
  }
  if (t < CLOSE_MS + SHUT_MS) return 0;
  const x = (t - CLOSE_MS - SHUT_MS) / OPEN_MS;
  return 1 - (1 - x) ** 4;
}

// The ink of the outlines, darker than any red of the site.
const INK = "#140205";

// The eye sits in a round disc of flesh, the lids' skin, centred on it. The disc's ink ring (2.5
// wide) reaches 35.25 from the centre, so the drawing is the 72 square around it. The eye is drawn a
// little smaller than its 72 by 48 drawing so the disc can hold it.
const CENTRE: Point = [36, 24];
const DISC_R = 34;
const VIEW = { x: 0, y: -12, size: 72 };
const EYE_SCALE = 0.88;
const DISC_ID = "watching-eye-disc";

/**
 * An eye that watches the visitor from the bottom left of the page: a crimson disc of flesh holding
 * a pale eye whose blood-red iris and pupil follow the pointer with a slight ease, between lids
 * whose rims bare uneven fangs while it is open, like a mouth. Now and then, irregularly, it blinks
 * as a person does (sometimes twice): the upper lid sweeps down, the lower rises a little, and they
 * meet in one closed seam, the fangs drawing back behind the lids as they close; then it opens more
 * slowly and the fangs come back. The eye and the fangs only show inside the opening between the
 * lids. With reduced motion the pupil follows without the ease and the eye never blinks.
 * The pupil only moves while it has somewhere to go, a blink only draws while it plays, and nothing
 * runs while the tab is hidden. While the footer is on screen, or a link or button of the page is
 * under it once the page has stopped scrolling, it fades out, so it never covers anything the
 * visitor can use.
 * Decorative: hidden from assistive technology, and the pointer passes through it. Shown only for
 * a mouse or trackpad on a wide window, once script runs and any opening splash has ended.
 */
export function WatchingEye() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pupilRef = useRef<SVGGElement>(null);
  const openingRef = useRef<SVGPathElement>(null);
  const upperEdgeRef = useRef<SVGPathElement>(null);
  const lowerEdgeRef = useRef<SVGPathElement>(null);
  const upperFangsRef = useRef<SVGPathElement>(null);
  const lowerFangsRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const pupil = pupilRef.current;
    const opening = openingRef.current;
    const upperEdge = upperEdgeRef.current;
    const lowerEdge = lowerEdgeRef.current;
    const upperFangs = upperFangsRef.current;
    const lowerFangs = lowerFangsRef.current;
    if (!root || !pupil || !opening || !upperEdge || !lowerEdge || !upperFangs || !lowerFangs) return;
    const shown = window.matchMedia(SHOWN);
    const motion = window.matchMedia(MOTION_OK);

    let running = false;
    let frame = 0;
    let last = 0;
    let blinkTimer = 0;
    // The blink playing, if any: its frame, when it started, and whether it is a double one.
    let blinkFrame = 0;
    let blinkStart = 0;
    let blinkTwice = false;
    // The eye's centre on the screen, and where the pupil is and is going.
    let centre = { x: 0, y: 0 };
    const at = { x: 0, y: 0 };
    const aim = { x: 0, y: 0 };

    const place = () => pupil.setAttribute("transform", `translate(${at.x.toFixed(2)} ${at.y.toFixed(2)})`);

    // The eye is at the disc's centre, the middle of the piece.
    const measure = () => {
      const box = root.getBoundingClientRect();
      centre = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    };

    const step = (time: number) => {
      frame = 0;
      const dt = last ? Math.min(100, time - last) : 16;
      last = time;
      const k = 1 - Math.exp(-dt / EASE_MS);
      at.x += (aim.x - at.x) * k;
      at.y += (aim.y - at.y) * k;
      if (Math.abs(aim.x - at.x) < SETTLED && Math.abs(aim.y - at.y) < SETTLED) {
        at.x = aim.x;
        at.y = aim.y;
        last = 0;
      } else {
        frame = requestAnimationFrame(step);
      }
      place();
    };

    const follow = () => {
      if (document.hidden) return;
      if (!motion.matches) {
        cancelAnimationFrame(frame);
        frame = 0;
        at.x = aim.x;
        at.y = aim.y;
        place();
        return;
      }
      if (!frame) frame = requestAnimationFrame(step);
    };

    /** Points the pupil at a point on the screen, or straight ahead for null. */
    const lookAt = (point: { x: number; y: number } | null) => {
      if (!point) {
        aim.x = 0;
        aim.y = 0;
      } else {
        const dx = point.x - centre.x;
        const dy = point.y - centre.y;
        const distance = Math.hypot(dx, dy);
        const reach = distance > 0 ? Math.min(1, distance / FULL_AT) / distance : 0;
        aim.x = dx * reach * REACH_X;
        aim.y = dy * reach * REACH_Y;
      }
      follow();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "touch") lookAt({ x: event.clientX, y: event.clientY });
    };
    // The pointer has left the window.
    const onMouseOut = (event: MouseEvent) => {
      if (!event.relatedTarget) lookAt(null);
    };

    /** Draws the lids at `open`, from 0 (shut) to 1 (open). */
    const setLids = (open: number) => {
      const shapes = open >= 1 ? OPEN_SHAPES : lidShapes(Math.max(0, open));
      opening.setAttribute("d", shapes.opening);
      upperEdge.setAttribute("d", shapes.upperEdge);
      lowerEdge.setAttribute("d", shapes.lowerEdge);
      upperFangs.setAttribute("d", shapes.upperFangs);
      lowerFangs.setAttribute("d", shapes.lowerFangs);
    };

    /** Ends any blink at once, with the eye open. */
    const onBlinkEnd = () => {
      if (!blinkFrame && !root.dataset.blink) return;
      cancelAnimationFrame(blinkFrame);
      blinkFrame = 0;
      blinkStart = 0;
      delete root.dataset.blink;
      setLids(1);
    };

    const blinkStep = (time: number) => {
      blinkStart ||= time;
      const t = time - blinkStart;
      const open = blinkTwice ? Math.min(blinkOpen(t), blinkOpen(t - SECOND_AT_MS)) : blinkOpen(t);
      const end = (blinkTwice ? SECOND_AT_MS : 0) + CLOSE_MS + SHUT_MS + OPEN_MS;
      if (t >= end) {
        onBlinkEnd();
        return;
      }
      setLids(open);
      blinkFrame = requestAnimationFrame(blinkStep);
    };

    const blink = (twice: boolean) => {
      onBlinkEnd();
      blinkTwice = twice;
      // Marks the blink while it plays (once or twice).
      root.dataset.blink = twice ? "twice" : "once";
      blinkFrame = requestAnimationFrame(blinkStep);
    };
    const scheduleBlink = () => {
      window.clearTimeout(blinkTimer);
      if (!running || !motion.matches || document.hidden) return;
      blinkTimer = window.setTimeout(() => {
        // Faded out (the footer, or a control under it): no one sees a blink.
        if (!root.hasAttribute("data-footer") && !root.hasAttribute("data-covering")) blink(Math.random() < DOUBLE);
        scheduleBlink();
      }, BLINK_MIN_MS + Math.random() * BLINK_SPREAD_MS);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        last = 0;
        window.clearTimeout(blinkTimer);
        onBlinkEnd();
      } else {
        follow();
        scheduleBlink();
      }
    };
    const onMotion = () => {
      onBlinkEnd();
      follow();
      scheduleBlink();
    };

    // The footer on screen: the eye steps aside (an observer, so nothing runs per frame).
    const footer = document.querySelector("footer");
    const nearFooter = new IntersectionObserver((entries) => {
      const seen = entries.some((entry) => entry.isIntersecting);
      root.toggleAttribute("data-footer", seen);
    });

    // A link or a button of the page under it: the eye steps aside there too (`watchCovering`).
    let stopCovering = () => {};

    const start = () => {
      if (running) return;
      running = true;
      root.dataset.ready = "";
      if (footer) nearFooter.observe(footer);
      stopCovering = watchCovering(root);
      measure();
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("mouseout", onMouseOut, { passive: true });
      window.addEventListener("resize", measure);
      document.addEventListener("visibilitychange", onVisibility);
      motion.addEventListener("change", onMotion);
      scheduleBlink();
    };

    const stop = () => {
      if (!running) return;
      running = false;
      delete root.dataset.ready;
      nearFooter.disconnect();
      root.removeAttribute("data-footer");
      stopCovering();
      stopCovering = () => {};
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", onVisibility);
      motion.removeEventListener("change", onMotion);
      window.clearTimeout(blinkTimer);
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      onBlinkEnd();
    };

    const update = () => (shown.matches ? start() : stop());

    let watching = false;
    const stopWaiting = whenSplashEnds(() => {
      watching = true;
      update();
      shown.addEventListener("change", update);
    });

    return () => {
      stopWaiting();
      if (watching) shown.removeEventListener("change", update);
      stop();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-watching-eye=""
      className={cn(
        "pointer-events-none fixed bottom-3 left-3 z-30 hidden transition-opacity duration-300 lg:pointer-fine:data-ready:block",
        "data-footer:opacity-0 data-covering:opacity-0 motion-reduce:transition-none"
      )}
    >
      <svg
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.size} ${VIEW.size}`}
        width={VIEW.size}
        height={VIEW.size}
        focusable="false"
        className="block overflow-visible drop-shadow-[0_0_6px_rgb(0_0_0/0.85)]"
      >
        <defs>
          <clipPath id={OPENING_ID}>
            <path ref={openingRef} d={OPEN_SHAPES.opening} />
          </clipPath>
          {/* The disc's flesh, darker towards its rim. */}
          <radialGradient id={DISC_ID}>
            <stop offset="0.55" stopColor="#4a0710" />
            <stop offset="1" stopColor="#2a030a" />
          </radialGradient>
          {/* The white, sallow and darker towards the lids. */}
          <radialGradient id={WHITE_ID} cx="0.5" cy="0.5" r="0.6">
            <stop offset="0.35" stopColor="var(--paper)" />
            <stop offset="1" stopColor="#b88a80" />
          </radialGradient>
        </defs>
        <circle cx={CENTRE[0]} cy={CENTRE[1]} r={DISC_R} fill={`url(#${DISC_ID})`} stroke={INK} strokeWidth="2.5" />
        <circle cx={CENTRE[0]} cy={CENTRE[1]} r={DISC_R - 3} strokeWidth="0.8" className="fill-none stroke-blade/45" />
        {/* The eye, a little smaller, in the middle of the disc. The disc is its lids' flesh. */}
        <g transform={`translate(${CENTRE[0]} ${CENTRE[1]}) scale(${EYE_SCALE}) translate(${-CENTRE[0]} ${-CENTRE[1]})`}>
          <g clipPath={`url(#${OPENING_ID})`}>
            <path d={OUTLINE} fill={`url(#${WHITE_ID})`} />
            <g ref={pupilRef}>
              {/* The iris, the slit of the pupil darker inside it, and a glint. */}
              <circle cx="36" cy="24" r="8.5" className="fill-blade-hot" />
              <circle cx="36" cy="24" r="8.5" strokeWidth="1.2" className="fill-none stroke-blade" />
              <ellipse cx="36" cy="24" rx="2.4" ry="6.5" className="fill-[#3b0309]" />
              <circle cx="39" cy="20.5" r="1.4" className="fill-paper/85" />
            </g>
            <path ref={upperFangsRef} d={OPEN_SHAPES.upperFangs} stroke={INK} strokeWidth="0.6" strokeLinejoin="round" className="fill-[#f6f1e6]" />
            <path ref={lowerFangsRef} d={OPEN_SHAPES.lowerFangs} stroke={INK} strokeWidth="0.6" strokeLinejoin="round" className="fill-[#ece4d4]" />
          </g>
          {/* The lids' rims in ink (shut, they make one seam), and the lids' outer edge. */}
          <path ref={upperEdgeRef} d={OPEN_SHAPES.upperEdge} stroke={INK} strokeWidth="1.2" strokeLinecap="round" className="fill-none" />
          <path ref={lowerEdgeRef} d={OPEN_SHAPES.lowerEdge} stroke={INK} strokeWidth="1.2" strokeLinecap="round" className="fill-none" />
          <path d={OUTLINE} stroke={INK} strokeWidth="2" strokeLinejoin="round" className="fill-none" />
        </g>
      </svg>
    </div>
  );
}
