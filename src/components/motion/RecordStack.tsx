"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

import { gsap, prepareScrollTriggers, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface RecordStackProps {
  children: ReactNode;
  className?: string;
}

// Large screens only, and only when the visitor has not asked for less motion.
const STACK = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";

/**
 * The Service record's stack. From `lg`, with motion allowed, the record cards
 * (`data-record-card`) stick under the header one below the other, so each new card slides up
 * over the one before; the covered card shrinks a little and dims as it goes under, and each
 * card's logo or seal (`data-record-stamp`), always visible, is pressed once as the card comes
 * into view.
 * Each card follows an empty marker (`data-stack-mark`) that never sticks, so its place in the
 * page can be measured while the card itself is stuck.
 * When the stack ends, the cards let go together: each card's bottom margin is set so that every
 * stuck card's margin box ends on the same line, and a spacer after the last card lets it land
 * and hold before they go.
 * The stack is only switched on here (`data-stack`), so below `lg`, with reduced motion and
 * without JavaScript the cards are a plain list.
 */
export function RecordStack({ children, className }: Readonly<RecordStackProps>) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      prepareScrollTriggers();

      const mm = gsap.matchMedia();
      mm.add(STACK, () => {
        root.dataset.stack = "";

        const cards = gsap.utils.toArray<HTMLElement>("[data-record-card]", root);
        const marks = gsap.utils.toArray<HTMLElement>("[data-stack-mark]", root);
        const stickyTop = (card: HTMLElement) => Number.parseFloat(getComputedStyle(card).top) || 0;

        // A stuck card stays inside the list, margin box included, so a card whose margin box
        // ends higher would be held while the rest are pushed up into it. Ending them all on one
        // line lets them go together. The next marker takes the extra off its own top margin;
        // the two margins collapse into the usual gap, so nothing in the page moves.
        const reset = () => {
          cards.forEach((card) => (card.style.marginBottom = ""));
          marks.forEach((mark) => (mark.style.marginTop = ""));
        };
        const align = () => {
          reset();
          const ends = cards.map((card) => stickyTop(card) + card.offsetHeight);
          const line = Math.max(...ends);
          cards.forEach((card, i) => {
            const nextMark = marks[i + 1];
            const extra = line - (ends[i] ?? line);
            if (!nextMark || extra <= 0) return;
            const gap = Number.parseFloat(getComputedStyle(nextMark).marginTop) || 0;
            card.style.marginBottom = `${extra}px`;
            // Two positive margins collapse to the larger, so the marker's only changes when the
            // extra is larger than the gap.
            if (extra > gap) nextMark.style.marginTop = `${gap - extra}px`;
          });
        };
        align();
        ScrollTrigger.addEventListener("refreshInit", align);

        cards.forEach((card, i) => {
          const mark = marks[i];
          const stamp = card.querySelector("[data-record-stamp]");
          if (mark && stamp) {
            // The logo or seal stays in place and in view; as the card comes up the screen it is
            // pressed once, from large and turned to flat. Nothing starts hidden.
            gsap.fromTo(
              stamp,
              { scale: 1.4, rotation: -8 },
              {
                scale: 1,
                rotation: 0,
                duration: 0.3,
                ease: "power4.in",
                immediateRender: false,
                scrollTrigger: { trigger: mark, start: "top 85%", once: true },
              }
            );
          }

          // The card goes under the next one: from when the next card's top meets this card's
          // bottom (this card is stuck by then) until the next card reaches its own place.
          const next = cards[i + 1];
          const nextMark = marks[i + 1];
          if (next && nextMark) {
            gsap.fromTo(
              card,
              { scale: 1, filter: "brightness(1)" },
              {
                scale: 0.94,
                filter: "brightness(0.6)",
                transformOrigin: "50% 0%",
                ease: "none",
                scrollTrigger: {
                  trigger: nextMark,
                  start: () => `top ${stickyTop(card) + card.offsetHeight}px`,
                  end: () => `top ${stickyTop(next)}px`,
                  scrub: true,
                },
              }
            );
          }
        });

        return () => {
          ScrollTrigger.removeEventListener("refreshInit", align);
          reset();
          delete root.dataset.stack;
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} className={cn("group/stack", className)}>
      {children}
      {/* Room for the last card to land and the full stack to hold before it scrolls away. It is
          set by CSS under the same conditions as the stack, not by script, so it is already in
          the page's HTML and nothing below it moves once script runs. */}
      <div aria-hidden="true" className="hidden h-40 lg:motion-safe:block" />
    </div>
  );
}
