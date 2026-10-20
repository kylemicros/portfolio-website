"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

import { gsap, loadScrambleText, MOTION_OK, prepareScrollTriggers, ScrollTrigger, useGSAP } from "@/lib/gsap";

interface ToolkitDecodeProps {
  children: ReactNode;
  className?: string;
}

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789#/+";

/**
 * Decodes the visible skill labels (`data-decode`) out of scrambled characters once, the first
 * time the toolkit comes into view, one label after another. The labels are plain text in the
 * markup and the effect always ends on that text, so without JavaScript or with reduced motion
 * nothing changes. The scrambled copies are hidden from assistive technology, which reads the
 * real labels beside them.
 */
export function ToolkitDecode({ children, className }: Readonly<ToolkitDecodeProps>) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      prepareScrollTriggers();

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, (context) => {
        // Already above the screen (a reload further down the page): leave the labels as they are.
        if (root.getBoundingClientRect().bottom <= 0) return;

        let cancelled = false;
        // The plugin loads once the toolkit is within a screen of view, so it is not part of the
        // page's first load; until it has loaded, the labels simply stay as they are.
        const load = () =>
          loadScrambleText().then(() => {
            if (cancelled) return;

            // Added to this media query's context, so leaving it reverts the effect and puts the
            // real text back.
            context.add(() => {
              const decode = gsap.timeline({
                scrollTrigger: { trigger: root, start: "top 80%", once: true },
              });
              gsap.utils.toArray<HTMLElement>("[data-decode]", root).forEach((label, index) => {
                const text = label.textContent ?? "";
                decode.to(
                  label,
                  { duration: 0.6, ease: "none", scrambleText: { text, chars: CHARS, revealDelay: 0.15, speed: 0.6 } },
                  index * 0.03
                );
              });
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
