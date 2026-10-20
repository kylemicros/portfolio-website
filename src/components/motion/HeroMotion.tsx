"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

import { gsap, MOTION_OK, MOTION_REDUCED, SplitText, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

import type { SlashHandle } from "./Slash";
import { Slash, SLASH_IMPACT } from "./Slash";

interface HeroMotionProps {
  children: ReactNode;
  /** The kanji accent to brush in. It sits outside this wrapper, so it is looked up in the page. */
  kanjiSelector?: string;
  className?: string;
}

// The cut runs from low left to high right across the text column.
const SLASH_FROM = { x: -0.05, y: 0.78 };
const SLASH_TO = { x: 1.04, y: 0.22 };
const SLASH_BOW = 0.12;
// Seconds into the hero timeline. The slash's own timeline is about 1.4 s long.
const SLASH_AT = 0.08;
const SWING_END = SLASH_AT + 0.43;
const SMALL_SCREEN = 640;

// The kanji aura's values come from the approved demo, in absolute pixels at every kanji size,
// so the bursts read as a glitch on the smaller real kanji too.
const GLITCH_STEPS = 6;
const GLITCH_STEP = 0.035;
const GLITCH_RESET = 0.23;

/**
 * Starts the kanji's idle motion: a slow float, a breathing glow and short glitch bursts
 * every 2.2 to 4.2 s. It pauses while the kanji is off screen (or hidden, as under 480 px)
 * and while the tab is hidden. Returns a function that stops it and restores the layers.
 */
function startKanjiAura(kanji: Element): () => void {
  const float = kanji.querySelector("[data-kanji-float]");
  const glow = kanji.querySelector("[data-kanji-glow]");
  const hot = kanji.querySelector('[data-kanji-glitch="hot"]');
  const paper = kanji.querySelector('[data-kanji-glitch="paper"]');
  const main = kanji.querySelector("[data-kanji-main]");
  if (!float || !glow || !hot || !paper || !main) return () => {};

  const random = gsap.utils.random;
  let paused = true;
  let burstTl: gsap.core.Timeline | undefined;
  let next: gsap.core.Tween | undefined;

  const floatTween = gsap.to(float, { y: -12, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true });
  // The glow fades up from nothing first, so it never pops in, then breathes.
  const glowTl = gsap
    .timeline({ paused: true })
    .to(glow, { opacity: 0.3, duration: 0.6, ease: "sine.out" })
    .fromTo(glow, { opacity: 0.3 }, { opacity: 0.7, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: -1 });

  // Six instant steps 35 ms apart, then everything back at rest at 0.23 s. Sets only, no tweens.
  const burst = () => {
    burstTl = gsap.timeline({
      paused,
      onComplete: () => {
        next = gsap.delayedCall(random(2.2, 4.2), burst);
        if (paused) next.pause();
      },
    });
    for (let i = 0; i < GLITCH_STEPS; i++) {
      const top = random(0, 85);
      const height = random(4, 18);
      burstTl
        .set(hot, { opacity: 0.85, x: random(-14, -4), clipPath: `inset(${top}% 0 ${100 - top - height}% 0)` }, i * GLITCH_STEP)
        .set(paper, { opacity: 0.6, x: random(4, 12), clipPath: `inset(${random(0, 85)}% 0 ${random(5, 80)}% 0)` }, i * GLITCH_STEP)
        .set(main, { x: random(-5, 5), skewX: random(-6, 6) }, i * GLITCH_STEP);
    }
    burstTl.set([hot, paper], { opacity: 0 }, GLITCH_RESET).set(main, { x: 0, skewX: 0 }, GLITCH_RESET);
  };
  next = gsap.delayedCall(0.5, burst);
  next.pause();

  const setPaused = (value: boolean) => {
    paused = value;
    for (const animation of [floatTween, glowTl, burstTl, next]) {
      if (!animation) continue;
      if (value) animation.pause();
      else animation.resume();
    }
  };

  let inView = false;
  const update = () => setPaused(!inView || document.hidden);
  const observer = new IntersectionObserver(([entry]) => {
    inView = entry?.isIntersecting ?? false;
    update();
  });
  observer.observe(kanji);
  document.addEventListener("visibilitychange", update);

  return () => {
    observer.disconnect();
    document.removeEventListener("visibilitychange", update);
    next?.kill();
    burstTl?.kill();
    floatTween.kill();
    glowTl.kill();
    gsap.set([float, glow, hot, paper, main], { clearProps: "transform,opacity,clipPath" });
  };
}

/**
 * Plays the hero entrance over the text column: the kanji brushes in, the heading lines are
 * cut across in red, one big slash splits the column and settles, then the buttons settle.
 * The text is fully visible before, during and after; the motion only plays over it.
 * Afterwards the kanji floats, its glow breathes and it glitches now and then.
 * With reduced motion only the scar and a still glow are shown. Without JavaScript nothing changes.
 */
export function HeroMotion({ children, kanjiSelector, className }: Readonly<HeroMotionProps>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const slashRef = useRef<SlashHandle>(null);

  useGSAP(
    () => {
      let cancelled = false;
      let mm: gsap.MatchMedia | undefined;

      const play = () => {
        const root = rootRef.current;
        const content = contentRef.current;
        const bars = barsRef.current;
        const slash = slashRef.current;
        if (!root || !content || !bars || !slash) return;

        const tl = gsap.timeline();

        // 1. The kanji: a wet ink layer brushes down over the glyphs and dries away.
        const kanji = kanjiSelector ? document.querySelector(kanjiSelector) : null;
        const wet = kanji?.querySelector("[data-kanji-wet]");
        const wipe = kanji?.querySelector("[data-kanji-wipe]");
        if (wet && wipe) {
          tl.set(wet, { opacity: 1 }, 0)
            .fromTo(wipe, { attr: { y: -2400 } }, { attr: { y: 0 }, duration: 0.3, ease: "power2.inOut" }, 0)
            .to(wet, { opacity: 0, duration: 0.2, ease: "power1.out" }, 0.25);
        }

        // 2. The heading: find its lines, then sweep a thin red cut across each one.
        // The split is reverted straight after measuring, so the heading's markup never changes on screen.
        const heading = content.querySelector("h1");
        if (heading) {
          const split = SplitText.create(heading, { type: "lines", aria: "auto" });
          const rootBox = root.getBoundingClientRect();
          const lineBoxes = split.lines.map((line) => {
            const range = document.createRange();
            range.selectNodeContents(line);
            return range.getBoundingClientRect();
          });
          split.revert();

          const lineBars = lineBoxes
            .filter((box) => box.width > 0)
            .map((box) => {
              const bar = document.createElement("span");
              bar.className = "absolute h-[3px] origin-left rounded-full bg-blade-hot";
              Object.assign(bar.style, {
                left: `${box.left - rootBox.left}px`,
                top: `${box.top - rootBox.top + box.height * 0.56}px`,
                width: `${box.width}px`,
              });
              bars.appendChild(bar);
              return bar;
            });
          if (lineBars.length > 0) {
            tl.fromTo(lineBars, { scaleX: 0 }, { scaleX: 1, duration: 0.18, ease: "power3.out", stagger: 0.06 }, 0.1)
              .to(lineBars, { opacity: 0, duration: 0.14, ease: "power1.out", stagger: 0.06 }, 0.24);
          }
        }

        // 3. The slash, bounded to this column. The column is split along the cut.
        // 4. After the swing the buttons recoil a few pixels and settle. They stay opaque.
        // The copy of the column made at impact gets the same settle, in step with the original.
        const settle = { y: 0, duration: 0.4, ease: "power2.out", stagger: 0.05 };
        tl.add(
          slash.timeline({
            splitTarget: content,
            small: window.innerWidth < SMALL_SCREEN,
            onClone: (clone) => {
              const copies = clone.querySelectorAll("[data-hero-actions] > *");
              if (copies.length === 0) return;
              gsap.fromTo(
                copies,
                { y: 6 },
                { ...settle, delay: SWING_END - (SLASH_AT + SLASH_IMPACT), immediateRender: false }
              );
            },
          }),
          SLASH_AT
        );

        const actions = content.querySelectorAll("[data-hero-actions] > *");
        if (actions.length > 0) {
          tl.fromTo(actions, { y: 6 }, { ...settle, immediateRender: false, clearProps: "transform" }, SWING_END);
        }

        tl.call(() => bars.replaceChildren());

        // 5. Once the opening has finished, the kanji keeps a quiet idle motion.
        let stopAura: (() => void) | undefined;
        if (kanji) tl.call(() => (stopAura = startKanjiAura(kanji)));

        return () => {
          stopAura?.();
          bars.replaceChildren();
        };
      };

      // Lines are measured and the cut is placed once the fonts have loaded, so nothing shifts.
      void document.fonts.ready.then(() => {
        if (cancelled) return;
        mm = gsap.matchMedia();
        mm.add(MOTION_OK, play);
        mm.add(MOTION_REDUCED, () => {
          slashRef.current?.showScar();
          // A still glow behind the kanji, with no float and no bursts.
          const glow = kanjiSelector ? document.querySelector(`${kanjiSelector} [data-kanji-glow]`) : null;
          if (glow) gsap.set(glow, { opacity: 0.5 });
        });
      });

      return () => {
        cancelled = true;
        mm?.revert();
      };
    },
    { scope: rootRef, dependencies: [kanjiSelector] }
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div ref={contentRef}>{children}</div>
      <div ref={barsRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />
      {/* The cut ends past the column; the fade keeps its edge at the column soft. */}
      <Slash
        slashRef={slashRef}
        from={SLASH_FROM}
        to={SLASH_TO}
        bow={SLASH_BOW}
        bleedLeft
        className="[mask-image:linear-gradient(to_right,black_calc(100%_-_48px),transparent)]"
      />
    </div>
  );
}
