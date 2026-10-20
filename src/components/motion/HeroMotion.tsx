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

/**
 * Plays the hero entrance over the text column: the kanji brushes in, the heading lines are
 * cut across in red, one big slash splits the column and settles, then the buttons settle.
 * The text is fully visible before, during and after; the motion only plays over it.
 * With reduced motion only the scar is shown. Without JavaScript nothing changes.
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

        return () => bars.replaceChildren();
      };

      // Lines are measured and the cut is placed once the fonts have loaded, so nothing shifts.
      void document.fonts.ready.then(() => {
        if (cancelled) return;
        mm = gsap.matchMedia();
        mm.add(MOTION_OK, play);
        mm.add(MOTION_REDUCED, () => slashRef.current?.showScar());
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
