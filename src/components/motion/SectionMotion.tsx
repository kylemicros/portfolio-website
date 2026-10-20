"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

import { gsap, MOTION_OK, MOTION_REDUCED, prepareScrollTriggers, ScrollTrigger, useGSAP } from "@/lib/gsap";
import type { Point } from "@/lib/slash-geometry";
import { cn } from "@/lib/utils";

import type { SlashHandle } from "./Slash";
import { Slash } from "./Slash";

export interface SectionCut {
  /** Start of the cut, as fractions of the band it is drawn in. */
  from: Point;
  /** End of the cut, as fractions of the band. */
  to: Point;
  /** How far the cut bows, as a fraction of the band height. */
  bow: number;
  /** Multiplies the blade's thickness. Defaults to the small section size. */
  thickness?: number;
}

interface SectionMotionProps {
  children: ReactNode;
  /** The cut across the top band. `false` for no cut. */
  cut?: SectionCut | false;
  /** Classes for the band the cut is drawn in (its position and height). */
  cutClassName?: string;
  className?: string;
}

const DEFAULT_CUT: SectionCut = { from: { x: -0.04, y: 0.7 }, to: { x: 1.04, y: 0.3 }, bow: 0.18 };
const DEFAULT_THICKNESS = 0.55;
const DROPLETS = 10;
const SMALL_SCREEN = 640;
// Seconds after the start of the cut when the title starts to rise.
const REVEAL_AT = 0.3;

/**
 * Gives a section its entrance the first time it scrolls into view: a small blade cut across
 * its top band (no flash, no shake, no split), then its title and items rise into place.
 * - `data-reveal="title"`: the heading (y 24 to 0, fades in);
 * - `data-reveal="item"`: content that follows with a short stagger (y 16 to 0, fades in);
 * - `data-reveal="stamp"`: small labels pressed in like ink stamps (scale 1.25 to 1, fades in).
 * Content is only hidden once this script has armed it, and only while it is below the screen,
 * so without JavaScript or with reduced motion everything stays in its final state.
 */
export function SectionMotion({ children, cut = DEFAULT_CUT, cutClassName, className }: Readonly<SectionMotionProps>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const slashRef = useRef<SlashHandle>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      prepareScrollTriggers();

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // Already scrolled past (a reload further down the page): leave it as it is.
        if (root.getBoundingClientRect().bottom <= 0) {
          slashRef.current?.showScar();
          return;
        }

        // Only what is still below the screen starts hidden, so nothing visible blinks out.
        const belowScreen = (el: Element) => el.getBoundingClientRect().top >= window.innerHeight;
        const steps = [
          { kind: "title", from: { y: 24, opacity: 0 }, to: { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, offset: 0 },
          { kind: "item", from: { y: 16, opacity: 0 }, to: { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", stagger: 0.06 }, offset: 0.12 },
          { kind: "stamp", from: { scale: 1.25, opacity: 0 }, to: { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2)", stagger: 0.02 }, offset: 0.25 },
        ].map((step) => ({
          ...step,
          to: { ...step.to, clearProps: "transform,opacity" } satisfies gsap.TweenVars,
          targets: gsap.utils.toArray<HTMLElement>(`[data-reveal="${step.kind}"]`, root).filter(belowScreen),
        }));
        const armed = steps.flatMap((step) => step.targets);
        steps.forEach((step) => {
          if (step.targets.length > 0) gsap.set(step.targets, step.from);
        });

        // Every later animation is recorded here, so leaving this media query reverts it too.
        const ctx = gsap.context(() => {});
        const entered = new Set<HTMLElement>();
        const revealed = new Set<HTMLElement>();
        let played = false;
        let opening: gsap.core.Timeline | undefined;
        const revealAt = cut ? REVEAL_AT : 0;

        // Reveals what has reached the screen and is still hidden, in step order. The opening adds
        // everything it finds; a later arrival joins the opening while it has not reached that
        // step's place yet (so the title still leads), and otherwise (later cards on a phone)
        // plays at once.
        const reveal = (fromOpening = false) => {
          steps.forEach(({ targets, to, offset }) => {
            const ready = targets.filter((el) => entered.has(el) && !revealed.has(el));
            if (ready.length === 0) return;
            ready.forEach((el) => revealed.add(el));
            // A fresh copy each time: GSAP writes into the vars it is given (such as the parent
            // timeline), and a shared object would queue later reveals behind the opening.
            const at = revealAt + offset;
            const join = opening && (fromOpening || (opening.isActive() && opening.time() < at));
            if (opening && join) opening.to(ready, { ...to }, at);
            else ctx.add(() => gsap.to(ready, { ...to }));
          });
        };

        const play = () => {
          if (played) return;
          played = true;
          // Anything on screen now counts as entered, even if its own trigger has not run yet.
          armed.filter((el) => !belowScreen(el)).forEach((el) => entered.add(el));
          ctx.add(() => {
            opening = gsap.timeline();
            const slash = slashRef.current;
            if (cut && slash) {
              opening.add(slash.timeline({ small: window.innerWidth < SMALL_SCREEN, flash: false, shake: false, droplets: DROPLETS }), 0);
            }
            reveal(true);
          });
        };

        // Each hidden element notes when its top edge reaches the screen (so one brought into view
        // by keyboard focus never stays faded). All triggers are made here, up front, so every one
        // is measured with the page.
        if (armed.length > 0) {
          ScrollTrigger.batch(armed, {
            start: "top bottom",
            once: true,
            onEnter: (batch) => {
              batch.forEach((el) => {
                if (el instanceof HTMLElement) entered.add(el);
              });
              if (played) reveal();
            },
          });
        }
        ScrollTrigger.create({ trigger: root, start: "top 75%", once: true, onEnter: play });
        // A keyboard visitor tabbing in plays it at once, so focus never lands on something faded.
        root.addEventListener("focusin", play);

        return () => {
          root.removeEventListener("focusin", play);
          ctx.revert();
        };
      });
      mm.add(MOTION_REDUCED, () => {
        slashRef.current?.showScar();
      });

      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [cut] }
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {cut && (
        <div aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 top-0 h-24", cutClassName)}>
          <Slash
            slashRef={slashRef}
            from={cut.from}
            to={cut.to}
            bow={cut.bow}
            thickness={cut.thickness ?? DEFAULT_THICKNESS}
          />
        </div>
      )}
      {children}
    </div>
  );
}
