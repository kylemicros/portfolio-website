"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

import { gsap, loadScrambleText, MOTION_OK, prepareScrollTriggers, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { arrivalStart } from "@/lib/stage";

interface CaseDecodeProps {
  children: ReactNode;
  className?: string;
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/";
const STAGGER = 0.08;

/**
 * The Cases index's entrance, played once as the index comes into view: the titles
 * (`data-decode`) decode out of scrambled characters one after another, and the case numbers
 * (`data-count`, holding the number) count up from 00. Both are copies hidden from assistive
 * technology, which reads the real text beside them, and the effect always ends on the real text.
 * Without JavaScript, with reduced motion, or when the index is already on screen or above it
 * as the page loads, nothing changes.
 */
export function CaseDecode({ children, className }: Readonly<CaseDecodeProps>) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      prepareScrollTriggers();

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, (context) => {
        // Already in view or scrolled past (a reload further down the page): leave it as it is.
        if (root.getBoundingClientRect().top < window.innerHeight) return;

        let cancelled = false;
        // The plugin loads once the index is within a screen of view, so it is not part of the
        // page's first load; until it has loaded, the index simply stays as it is.
        const load = () =>
          loadScrambleText().then(() => {
            if (cancelled || root.getBoundingClientRect().top < window.innerHeight) return;

            // Added to this media query's context, so leaving it reverts the effect and puts the
            // real text back.
            context.add(() => {
              const counts = gsap.utils.toArray<HTMLElement>("[data-count]", root);
              const finals = counts.map((count) => count.textContent ?? "");
              // Still below the screen, so the numbers can start at 00 unseen.
              counts.forEach((count) => (count.textContent = "00"));

              const entrance = gsap.timeline({
                scrollTrigger: { trigger: root, start: arrivalStart(80), once: true },
              });
              gsap.utils.toArray<HTMLElement>("[data-decode]", root).forEach((title, index) => {
                const text = title.textContent ?? "";
                entrance.to(
                  title,
                  { duration: 0.7, ease: "none", scrambleText: { text, chars: CHARS, revealDelay: 0.2, speed: 0.6 } },
                  index * STAGGER
                );
              });
              counts.forEach((count, index) => {
                const target = Number(count.dataset.count);
                const final = finals[index] ?? "";
                const tally = { value: 0 };
                entrance.to(
                  tally,
                  {
                    value: Number.isFinite(target) ? target : 0,
                    duration: 0.6,
                    ease: "power1.out",
                    onUpdate: () => {
                      count.textContent = String(Math.round(tally.value)).padStart(2, "0");
                    },
                    onComplete: () => {
                      count.textContent = final;
                    },
                  },
                  index * STAGGER
                );
              });

              return () => {
                counts.forEach((count, index) => (count.textContent = finals[index] ?? ""));
              };
            });
          });

        ScrollTrigger.create({ trigger: root, start: "top bottom+=100%", once: true, onEnter: () => void load() });

        return () => {
          cancelled = true;
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
