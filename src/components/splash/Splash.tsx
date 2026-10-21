"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

import type { SlashHandle } from "@/components/motion/Slash";
import { Slash } from "@/components/motion/Slash";
import { gsap } from "@/lib/gsap";
import type { SlashGeometry } from "@/lib/slash-geometry";
import { computeSlash, splitPolygons } from "@/lib/slash-geometry";
import { beginSplash, endSplash, isSplashShowing, markSplashSeen, releaseSplash } from "@/lib/splash";

import type { QuoteArt, QuoteSetting } from "./quote-art";
import { QUOTE_SIZES } from "./quote-sizes";

interface Parts {
  root: HTMLDivElement;
  /** What the slash cuts and the opening parts: the ground and the quote, with the slash on top. */
  stage: HTMLDivElement;
  /** The ground and the quote: split along the cut by the slash, then put back as it settles. */
  content: HTMLDivElement;
  /** Filled with a copy of the stage when the screen opens: the half below the cut. */
  lower: HTMLDivElement;
  quote: HTMLDivElement;
}

interface Run {
  /** The quote growing in and out. */
  timeline: gsap.core.Timeline | null;
  /** The slash and the opening, built when the cut starts. */
  cut: gsap.core.Timeline | null;
  /** When the splash mounted, on the clock of `performance.now()`. */
  startedAt: number;
  skipped: boolean;
  /** Lets the page go and removes the splash. */
  finish: () => void;
}

// Seconds: a dark hold, the quote fading in, held, fading out, then the slash, then the opening.
const HOLD = 0.3;
const FADE_IN = 1.0;
const SHOWN = 1.7;
const FADE_OUT = 0.6;
// The slash's glint starts this long before the quote has quite faded.
const OVERLAP = 0.2;
// The slash (the hero's own effect, about 1.4 s) plays a little slower than in the hero.
const SLASH_PACE = 0.9;
// The halves part once the slash has settled.
const PART = 0.55;
// The quote grows the whole time it is visible, as if the visitor walks up to it.
const SCALE_FROM = 0.85;
const SCALE_TO = 1.2;
// A skip goes to the slash at once and plays it and the opening this many times faster.
const SKIP_SPEED = 2;
// The cut across the whole screen, as fractions of the stage: from low left to high right, bowed.
// On narrow screens it starts a little further in, so the star before the swing shows whole.
const CUT_FROM = { x: -0.04, y: 0.8 };
const NARROW_CUT_FROM = { x: 0.05, y: 0.8 };
const CUT_TO = { x: 1.04, y: 0.2 };
const CUT_BOW = 0.1;
// Below this width (px) the slash is the hero's small-screen one: no shake, fewer droplets.
const SMALL_SCREEN = 640;
const NARROW = `(max-width: ${SMALL_SCREEN - 1}px)`;
// How far each half also slides along the cut, as a share of how far it moves away from it.
const SLIDE = 0.25;
// A page that took longer than this (ms) to start the splash has kept the visitor waiting enough.
const LATE = 3500;
// If the quote's outlines take longer than this (ms) to arrive, the splash goes straight to the cut.
const QUOTE_WAIT = 1500;
// The box each setting is fitted into at its resting scale, as fractions of the screen's width and
// height; the classes below say the same. On phones and short screens the box is 0.8 of the width,
// so the quote stays on screen up to the largest scale it reaches while fully opaque (about 1.14).
// Lines are only used on screens this short (px) or less, where columns would be too small to read.
const BOXES: Readonly<Record<QuoteSetting, { width: number; height: number; className: string }>> = {
  wide: { width: 0.76, height: 0.72, className: "h-[72svh] w-[76vw]" },
  narrow: { width: 0.8, height: 0.72, className: "h-[72svh] w-[80vw]" },
  lines: { width: 0.8, height: 0.78, className: "h-[78svh] w-[80vw]" },
};
const SHORT_SCREEN = 500;
// Keys that would scroll the page while the splash holds it still.
const SCROLL_KEYS = new Set([" ", "PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

const GROUND = "bg-[#0a0204] bg-[radial-gradient(ellipse_75%_70%_at_50%_50%,transparent_50%,rgb(0_0_0/0.35))]";

function subscribeNarrow(onChange: () => void): () => void {
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const isNarrow = () => window.matchMedia(NARROW).matches;
const notNarrow = () => false;

// Whether this page load plays the splash: the head script's mark, unless the page took too long to
// get this far. Decided once, by whichever reads it first (the splash's layout effect, or React
// rendering it), so the run and what is rendered always agree. On the server the splash is always
// rendered (and hidden by CSS without the mark), so the page hydrates the same markup either way.
let playing: boolean | undefined;
const playsSplash = () => (playing ??= isSplashShowing() && performance.now() <= LATE);
const onServer = () => true;
const noChanges = () => () => {};

/** Where the cut starts on this screen. */
const cutFrom = (narrow: boolean) => (narrow ? NARROW_CUT_FROM : CUT_FROM);

/** The cut on the stage, the same curve the slash draws. */
function cutGeometry(stage: HTMLDivElement): SlashGeometry {
  return computeSlash(
    { width: stage.clientWidth, height: stage.clientHeight },
    { from: cutFrom(isNarrow()), to: CUT_TO, bow: CUT_BOW, scaleWidth: window.innerWidth }
  );
}

/** How far the upper half moves to clear the screen; the lower half moves the opposite way. */
function partingOffset(g: SlashGeometry, stage: HTMLDivElement): { x: number; y: number } {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: 0, y: height },
    { x: width, y: height },
  ];
  // The corner furthest from the cut's chord, plus the bow and a little more, so no edge of a half
  // is left on screen. The normal points to the upper half's side of the cut.
  const away = g.normal;
  const bow = Math.hypot(g.c.x - (g.p0.x + g.p1.x) / 2, g.c.y - (g.p0.y + g.p1.y) / 2);
  const reach =
    Math.max(...corners.map((c) => Math.abs((c.x - g.p0.x) * away.x + (c.y - g.p0.y) * away.y))) + bow + 24;
  return {
    x: away.x * reach + g.dir.x * reach * SLIDE,
    y: away.y * reach + g.dir.y * reach * SLIDE,
  };
}

/**
 * The cut: the hero's slash across the whole screen (glint, swing, flash, split and settle, ink
 * droplets and the scar), then, once it has settled, the screen splits along the same curve and
 * the halves part onto the page. Built when the cut starts, so it measures the screen as it is
 * then, after any resize or turn of the phone during the quote.
 */
function startCut(parts: Parts, slash: SlashHandle, speed: number, onEnd: () => void): gsap.core.Timeline {
  const { root, stage, content, lower } = parts;
  const offset = { x: 0, y: 0 };
  markSplashSeen();
  const tl = gsap.timeline({ onComplete: onEnd });
  tl.add(slash.timeline({ splitTarget: content, small: window.innerWidth < SMALL_SCREEN }).timeScale(SLASH_PACE))
    .addLabel("open")
    .call(
      () => {
        const g = cutGeometry(stage);
        const { above, below } = splitPolygons(g);
        // The half below the cut is a copy of the stage, scar and all; its ids are dropped so the
        // page keeps one of each.
        const copies = [...stage.children].map((child) => child.cloneNode(true));
        for (const copy of copies) {
          if (!(copy instanceof Element)) continue;
          copy.removeAttribute("id");
          copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
        }
        lower.replaceChildren(...copies);
        stage.style.clipPath = above;
        lower.style.clipPath = below;
        Object.assign(offset, partingOffset(g, stage));
        // The page can be clicked through the gap.
        root.style.pointerEvents = "none";
      },
      undefined,
      "open"
    )
    .set(lower, { autoAlpha: 1 }, "open")
    .to(stage, { x: () => offset.x, y: () => offset.y, duration: PART, ease: "power2.in" }, "open")
    .to(lower, { x: () => -offset.x, y: () => -offset.y, duration: PART, ease: "power2.in" }, "open");
  return tl.timeScale(speed);
}

/** The quote grows in and out; `onCut` starts the cut just before it has faded. */
function playQuote(quote: HTMLDivElement, hold: number, onCut: () => void): gsap.core.Timeline {
  const tl = gsap.timeline();
  const visible = FADE_IN + SHOWN + FADE_OUT;
  tl.fromTo(quote, { scale: SCALE_FROM }, { scale: SCALE_TO, duration: visible, ease: "none" }, hold)
    .fromTo(quote, { autoAlpha: 0 }, { autoAlpha: 1, duration: FADE_IN, ease: "power1.out" }, hold)
    .to(quote, { autoAlpha: 0, duration: FADE_OUT, ease: "power1.in" }, hold + FADE_IN + SHOWN)
    .call(onCut, undefined, hold + visible - OVERLAP);
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
  const stage = find("stage");
  const content = find("content");
  const lower = find("lower");
  const quote = find("quote");
  if (
    !(stage instanceof HTMLDivElement) ||
    !(content instanceof HTMLDivElement) ||
    !(lower instanceof HTMLDivElement) ||
    !(quote instanceof HTMLDivElement)
  ) {
    return null;
  }
  return { root, stage, content, lower, quote };
}

/**
 * The opening splash, once per browser session: Esdeath's line grows in out of the dark and fades,
 * the hero's slash cuts across the whole screen, and once it has settled the screen opens along the
 * cut onto the page. Any key, click, tap or wheel skips to the cut. The overlay is hidden from
 * assistive technology, takes no focus and holds the page still while it plays; the page
 * underneath is in place the whole time. Whether it plays is decided before the first paint
 * (`@/lib/splash`): without that mark it is never shown. The quote's outlines load in their own
 * chunk, only when the splash plays.
 */
export function Splash() {
  const rootRef = useRef<HTMLDivElement>(null);
  const slashRef = useRef<SlashHandle>(null);
  const runRef = useRef<Run | null>(null);
  const [art, setArt] = useState<QuoteArt | null>(null);
  const [ended, setEnded] = useState(false);
  const narrow = useSyncExternalStore(subscribeNarrow, isNarrow, notNarrow);
  const plays = useSyncExternalStore(noChanges, playsSplash, onServer);

  // Decide, hold the page still and load the quote.
  useLayoutEffect(() => {
    // A page that arrives too late does not play it: the mark is dropped and the page starts.
    if (!playsSplash()) {
      if (isSplashShowing()) endSplash();
      return;
    }
    if (!beginSplash()) return;

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
      cut: null,
      startedAt: performance.now(),
      skipped: false,
      finish: () => {
        run.timeline = null;
        run.cut = null;
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
      if (run.cut) {
        run.cut.timeScale(SKIP_SPEED);
        return;
      }
      run.timeline?.kill();
      const parts = findParts(rootRef.current);
      const slash = slashRef.current;
      if (!parts || !slash) {
        run.finish();
        return;
      }
      gsap.to(parts.quote, { autoAlpha: 0, duration: 0.15, ease: "power1.out" });
      run.cut = startCut(parts, slash, SKIP_SPEED, run.finish);
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
      run.cut?.kill();
      runRef.current = null;
      // Taken down before it finished: the page is never left marked, with the hero, the sky and
      // the scrolling still waiting for it.
      releaseSplash();
    };
  }, []);

  // Once the quote is drawn, play the splash, counting the dark hold from when it mounted.
  useLayoutEffect(() => {
    const run = runRef.current;
    const parts = findParts(rootRef.current);
    const slash = slashRef.current;
    if (!art || !run || !parts || !slash || run.timeline || run.skipped) return;
    const waited = (performance.now() - run.startedAt) / 1000;
    run.timeline = playQuote(parts.quote, Math.max(0, HOLD - waited), () => {
      run.cut ??= startCut(parts, slash, 1, run.finish);
    });
  }, [art]);

  // Not playing, or over: nothing of it stays mounted, the slash's resize watchers included.
  if (ended || !plays) return null;

  return (
    <div ref={rootRef} data-splash-screen="" aria-hidden="true" className="fixed inset-0 z-60 hidden overflow-hidden">
      {/* A little larger than the screen, so the slash's shake never shows an edge. */}
      <div data-splash-part="stage" className="absolute -inset-2">
        <div data-splash-part="content" className={`absolute inset-0 grid place-items-center ${GROUND}`}>
          <div data-splash-part="quote" className="invisible will-change-[transform,opacity]">
            {art && <Quote art={art} />}
          </div>
        </div>
        <Slash slashRef={slashRef} from={cutFrom(narrow)} to={CUT_TO} bow={CUT_BOW} />
      </div>
      <div data-splash-part="lower" className="invisible absolute -inset-2" />
    </div>
  );
}
