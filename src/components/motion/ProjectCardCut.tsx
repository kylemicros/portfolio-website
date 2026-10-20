"use client";

import { useRef } from "react";

import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";

import type { SlashHandle } from "./Slash";
import { Slash } from "./Slash";

const CUT_FROM = { x: -0.05, y: 0.86 };
const CUT_TO = { x: 1.05, y: 0.16 };
const CUT_BOW = 0.1;
const THICKNESS = 0.35;
const DROPLETS = 6;
/** At most one cut per card in this many milliseconds. */
const MIN_GAP_MS = 600;

/**
 * A quick small cut across a project card's screenshot when a mouse pointer enters the card,
 * or when the card's first link gets keyboard focus. No flash, and no scar left behind.
 * Touch and pen input never trigger it, so a tap only follows the link.
 * Place it inside the positioned, clipped box around the screenshot, inside a `data-project-card`.
 */
export function ProjectCardCut() {
  const rootRef = useRef<HTMLDivElement>(null);
  const slashRef = useRef<SlashHandle>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const card = root?.closest("[data-project-card]");
      if (!root || !(card instanceof HTMLElement)) return;

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        let lastAt = Number.NEGATIVE_INFINITY;
        let cutCtx: gsap.Context | undefined;

        const cut = () => {
          const now = performance.now();
          if (now - lastAt < MIN_GAP_MS) return;
          lastAt = now;
          // Reverting the last cut removes anything it left, such as droplets still in flight.
          cutCtx?.revert();
          cutCtx = gsap.context(() => {
            slashRef.current?.timeline({ small: true, flash: false, shake: false, droplets: DROPLETS, keepScar: false });
          });
        };

        const onPointerEnter = (event: PointerEvent) => {
          if (event.pointerType === "mouse") cut();
        };
        const link = card.querySelector<HTMLElement>("a[href]");
        const onFocus = () => {
          if (link?.matches(":focus-visible")) cut();
        };

        card.addEventListener("pointerenter", onPointerEnter);
        link?.addEventListener("focus", onFocus);
        return () => {
          card.removeEventListener("pointerenter", onPointerEnter);
          link?.removeEventListener("focus", onFocus);
          cutCtx?.revert();
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
      <Slash slashRef={slashRef} from={CUT_FROM} to={CUT_TO} bow={CUT_BOW} thickness={THICKNESS} />
    </div>
  );
}
