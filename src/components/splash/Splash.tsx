"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { gsap } from "@/lib/gsap";
import { beginSplash, endSplash, markSplashCut } from "@/lib/splash";

import type { QuoteArt, QuoteSetting } from "./quote-art";
import { QUOTE_SIZES } from "./quote-sizes";

interface Parts {
  root: HTMLDivElement;
  /** The ground in one piece, until the cut. */
  whole: HTMLDivElement;
  /** The ground's two halves, either side of the cut. */
  upper: HTMLDivElement;
  lower: HTMLDivElement;
  quote: HTMLDivElement;
  slash: SVGSVGElement;
}

interface Run {
  timeline: gsap.core.Timeline | null;
  /** When the splash mounted, on the clock of `performance.now()`. */
  startedAt: number;
  skipped: boolean;
  /** Lets the page go and removes the splash. */
  finish: () => void;
}

// Seconds: a dark hold, the quote fading in, held, fading out, the slash, then the halves parting.
const HOLD = 0.3;
const FADE_IN = 0.7;
const SHOWN = 1.4;
const FADE_OUT = 0.4;
const SLASH = 0.2;
const PART = 0.5;
// The quote grows the whole time it is visible, as if the visitor walks up to it.
const SCALE_FROM = 0.85;
const SCALE_TO = 1.2;
// A skip plays the slash and the parting this many times faster.
const SKIP_SPEED = 2.5;
// The cut runs from low left to high right: where it meets the left and right edges, as fractions
// of the screen's height. The halves' clip paths below use the same numbers.
const CUT_LEFT = 0.78;
const CUT_RIGHT = 0.22;
// How far each half also slides along the cut, as a share of how far it moves away from it.
const SLIDE = 0.25;
// A page that took longer than this (ms) to start the splash has kept the visitor waiting enough.
const LATE = 3500;
// If the quote's outlines take longer than this (ms) to arrive, the splash goes straight to the cut.
const QUOTE_WAIT = 1500;
// The box each setting is fitted into at its resting scale, as fractions of the screen's width and
// height; the classes below say the same. On phones and short screens the box is 0.8 of the width,
// so the quote stays on screen up to the largest scale it reaches while fully opaque (about 1.14). Lines are only used on screens this short (px) or less,
// where columns would be too small to read.
const BOXES: Readonly<Record<QuoteSetting, { width: number; height: number; className: string }>> = {
  wide: { width: 0.76, height: 0.72, className: "h-[72svh] w-[76vw]" },
  narrow: { width: 0.8, height: 0.72, className: "h-[72svh] w-[80vw]" },
  lines: { width: 0.8, height: 0.78, className: "h-[78svh] w-[80vw]" },
};
const SHORT_SCREEN = 500;
// Keys that would scroll the page while the splash holds it still.
const SCROLL_KEYS = new Set([" ", "PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

const GROUND = "absolute inset-0 bg-[#0a0204] bg-[radial-gradient(ellipse_75%_70%_at_50%_50%,transparent_50%,rgb(0_0_0/0.35))]";

/** The cut across the screen, from its left edge to its right edge, in px. */
function cutLine(): { from: { x: number; y: number }; to: { x: number; y: number } } {
  const width = window.innerWidth;
  const height = window.innerHeight;
  return { from: { x: 0, y: CUT_LEFT * height }, to: { x: width, y: CUT_RIGHT * height } };
}

/** How far the upper half moves to clear the screen; the lower half moves the opposite way. */
function partingOffset(): { x: number; y: number } {
  const { from, to } = cutLine();
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const along = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
  // The normal pointing to the upper half's side of the cut.
  const away = { x: along.y, y: -along.x };
  const corners = [
    { x: 0, y: 0 },
    { x: to.x, y: 0 },
    { x: 0, y: window.innerHeight },
    { x: to.x, y: window.innerHeight },
  ];
  // The corner furthest from the cut, plus a little, so no edge of a half is left on screen.
  const reach = Math.max(...corners.map((c) => Math.abs((c.x - from.x) * away.x + (c.y - from.y) * away.y))) + 24;
  return {
    x: away.x * reach + along.x * reach * SLIDE,
    y: away.y * reach + along.y * reach * SLIDE,
  };
}

/** Lays the slash's lines along the cut, running a little past both edges of the screen. */
function placeSlash(slash: SVGSVGElement): void {
  const { from, to } = cutLine();
  const overshoot = 0.05;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  slash.setAttribute("viewBox", `0 0 ${window.innerWidth} ${window.innerHeight}`);
  for (const line of slash.querySelectorAll("line")) {
    line.setAttribute("x1", String(from.x - dx * overshoot));
    line.setAttribute("y1", String(from.y - dy * overshoot));
    line.setAttribute("x2", String(to.x + dx * overshoot));
    line.setAttribute("y2", String(to.y + dy * overshoot));
  }
}

/** The slash, then the ground splits along it and the halves part. */
function addCut(tl: gsap.core.Timeline, parts: Parts): void {
  const { root, whole, upper, lower, slash } = parts;
  const lines = slash.querySelectorAll("line");
  const offset = { x: 0, y: 0 };
  tl.addLabel("cut")
    .call(() => placeSlash(slash))
    .set(slash, { autoAlpha: 1 })
    .fromTo(
      lines,
      { strokeDashoffset: 1 },
      {
        strokeDashoffset: 0,
        duration: SLASH,
        ease: "power2.in",
        onStart: () => {
          markSplashCut();
          Object.assign(offset, partingOffset());
        },
      }
    )
    .addLabel("part")
    // The halves take over from the whole ground, and the page can be clicked through the gap.
    .set(whole, { autoAlpha: 0 })
    .set([upper, lower], { autoAlpha: 1 })
    .set(root, { pointerEvents: "none" })
    .to(slash, { autoAlpha: 0, duration: 0.15, ease: "power1.out" }, "part")
    .to(upper, { x: () => offset.x, y: () => offset.y, duration: PART, ease: "power2.in" }, "part")
    .to(lower, { x: () => -offset.x, y: () => -offset.y, duration: PART, ease: "power2.in" }, "part");
}

/** The whole splash: the quote grows in and out, then the cut. */
function playSplash(parts: Parts, hold: number, onEnd: () => void): gsap.core.Timeline {
  const { quote } = parts;
  const tl = gsap.timeline({ onComplete: onEnd });
  const visible = FADE_IN + SHOWN + FADE_OUT;
  tl.fromTo(quote, { scale: SCALE_FROM }, { scale: SCALE_TO, duration: visible, ease: "none" }, hold)
    .fromTo(quote, { autoAlpha: 0 }, { autoAlpha: 1, duration: FADE_IN, ease: "power1.out" }, hold)
    .to(quote, { autoAlpha: 0, duration: FADE_OUT, ease: "power1.in" }, hold + FADE_IN + SHOWN);
  addCut(tl, parts);
  return tl;
}

/** The setting that draws the glyphs largest on this screen. */
function chooseSetting(): QuoteSetting {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const settings: QuoteSetting[] = height <= SHORT_SCREEN ? ["wide", "narrow", "lines"] : ["wide", "narrow"];
  const size = (setting: QuoteSetting) =>
    Math.min((BOXES[setting].width * width) / QUOTE_SIZES[setting].width, (BOXES[setting].height * height) / QUOTE_SIZES[setting].height);
  return settings.reduce((best, setting) => (size(setting) > size(best) ? setting : best));
}

/** Loads the glyph outlines and the layout for a setting, each setting's glyphs in its own chunk. */
async function loadQuote(setting: QuoteSetting): Promise<QuoteArt> {
  if (setting === "lines") {
    const { GLYPHS, LINES } = await import("./quote-horizontal");
    return { glyphs: GLYPHS, layout: LINES, setting };
  }
  const { GLYPHS, WIDE, NARROW } = await import("./quote-vertical");
  return { glyphs: GLYPHS, layout: setting === "wide" ? WIDE : NARROW, setting };
}

/** The quote drawn from its glyph outlines. */
function Quote({ art }: Readonly<{ art: QuoteArt }>) {
  const { glyphs, layout, setting } = art;
  const { width, height, quote, credit, creditScale, rule } = layout;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      focusable="false"
      className={`${BOXES[setting].className} drop-shadow-[0_0_1vmin_color-mix(in_oklab,var(--blade-hot)_45%,transparent)]`}
    >
      <defs>
        {glyphs.map((d, index) => (
          <path key={index} id={`splash-glyph-${index}`} d={d} />
        ))}
      </defs>
      <g className="fill-paper">
        {quote.map(([glyph, x, y], index) => (
          <use key={index} href={`#splash-glyph-${glyph}`} x={x} y={y} />
        ))}
      </g>
      <rect x={rule.x} y={rule.y} width={rule.width} height={rule.height} className="fill-blade" />
      <g className="fill-blade-hot" transform={`scale(${creditScale})`}>
        {credit.map(([glyph, x, y], index) => (
          <use key={index} href={`#splash-glyph-${glyph}`} x={x} y={y} />
        ))}
      </g>
    </svg>
  );
}

/** The splash's parts, found by their `data-splash-part` names. */
function findParts(root: HTMLDivElement | null): Parts | null {
  if (!root) return null;
  const find = (name: string) => root.querySelector(`[data-splash-part="${name}"]`);
  const whole = find("whole");
  const upper = find("upper");
  const lower = find("lower");
  const quote = find("quote");
  const slash = find("slash");
  if (
    !(whole instanceof HTMLDivElement) ||
    !(upper instanceof HTMLDivElement) ||
    !(lower instanceof HTMLDivElement) ||
    !(quote instanceof HTMLDivElement) ||
    !(slash instanceof SVGSVGElement)
  ) {
    return null;
  }
  return { root, whole, upper, lower, quote, slash };
}

/**
 * The opening splash, once per browser session: Esdeath's line grows in out of the dark, fades,
 * and a crimson slash cuts the screen open onto the page. Any key, click, tap or wheel skips to the
 * cut. The overlay is hidden from assistive technology, takes no focus and holds the page still
 * while it plays; the page underneath is in place the whole time. Whether it plays is decided
 * before the first paint (`@/lib/splash`): without that mark it is never shown. The quote's
 * outlines load in their own chunk, only when the splash plays.
 */
export function Splash() {
  const rootRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<Run | null>(null);
  const [art, setArt] = useState<QuoteArt | null>(null);
  const [ended, setEnded] = useState(false);

  // Decide, hold the page still and load the quote.
  useLayoutEffect(() => {
    if (!beginSplash()) return;
    if (performance.now() > LATE) {
      endSplash();
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) event.preventDefault();
      skip();
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      skip();
    };
    const holdStill = (event: TouchEvent) => event.preventDefault();
    const detach = () => {
      window.removeEventListener("keydown", onKey, { capture: true });
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("touchmove", holdStill, { capture: true });
      window.removeEventListener("pointerdown", skip, { capture: true });
    };

    const run: Run = {
      timeline: null,
      startedAt: performance.now(),
      skipped: false,
      finish: () => {
        run.timeline = null;
        detach();
        endSplash();
        setEnded(true);
      },
    };
    runRef.current = run;
    let cancelled = false;

    // To the cut at once, played faster; if the cut is already under way, it only speeds up.
    function skip() {
      if (run.skipped) return;
      run.skipped = true;
      const { timeline } = run;
      if (timeline && timeline.time() >= timeline.labels.cut) {
        timeline.timeScale(SKIP_SPEED);
        return;
      }
      timeline?.kill();
      const parts = findParts(rootRef.current);
      if (!parts) {
        run.finish();
        return;
      }
      gsap.to(parts.quote, { autoAlpha: 0, duration: 0.1, ease: "power1.out" });
      const tl = gsap.timeline({ onComplete: run.finish });
      addCut(tl, parts);
      run.timeline = tl.timeScale(SKIP_SPEED);
    }

    window.addEventListener("keydown", onKey, { capture: true });
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    window.addEventListener("touchmove", holdStill, { capture: true, passive: false });
    window.addEventListener("pointerdown", skip, { capture: true, passive: true });

    // On a slow connection the visitor is not kept in the dark: the cut plays without the quote.
    const giveUp = window.setTimeout(skip, QUOTE_WAIT);
    loadQuote(chooseSetting()).then(
      (quote) => {
        window.clearTimeout(giveUp);
        // Skipped while loading: the cut is already playing without the quote.
        if (!cancelled && !run.skipped) setArt(quote);
      },
      () => {
        // The outlines did not load: open straight onto the page.
        window.clearTimeout(giveUp);
        if (!cancelled) skip();
      }
    );

    return () => {
      cancelled = true;
      window.clearTimeout(giveUp);
      detach();
      run.timeline?.kill();
      runRef.current = null;
    };
  }, []);

  // Once the quote is drawn, play the splash, counting the dark hold from when it mounted.
  useLayoutEffect(() => {
    const run = runRef.current;
    const parts = findParts(rootRef.current);
    if (!art || !run || !parts || run.timeline || run.skipped) return;
    const waited = (performance.now() - run.startedAt) / 1000;
    run.timeline = playSplash(parts, Math.max(0, HOLD - waited), run.finish);
  }, [art]);

  if (ended) return null;

  return (
    <div ref={rootRef} data-splash-screen="" aria-hidden="true" className="fixed inset-0 z-60 hidden overflow-hidden">
      <div data-splash-part="whole" className={GROUND} />
      <div data-splash-part="upper" className={`${GROUND} invisible [clip-path:polygon(0_0,100%_0,100%_22%,0_78%)]`} />
      <div data-splash-part="lower" className={`${GROUND} invisible [clip-path:polygon(0_78%,100%_22%,100%_100%,0_100%)]`} />
      <div className="absolute inset-0 grid place-items-center">
        <div data-splash-part="quote" className="invisible will-change-[transform,opacity]">
          {art && <Quote art={art} />}
        </div>
      </div>
      <svg
        data-splash-part="slash"
        focusable="false"
        className="invisible absolute inset-0 size-full drop-shadow-[0_0_6px_var(--blade-hot)]"
      >
        <line pathLength={1} strokeDasharray="1 1" strokeWidth={6} className="stroke-blade-hot" />
        <line pathLength={1} strokeDasharray="1 1" strokeWidth={1.5} className="stroke-paper" />
      </svg>
    </div>
  );
}
