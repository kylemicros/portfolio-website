"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

import { gsap, MOTION_OK, prepareScrollTriggers, useGSAP } from "@/lib/gsap";

interface BriefMotionProps {
  children: ReactNode;
  className?: string;
}

/**
 * The Brief's entrance, played once as it comes into view: the contact box's border draws on
 * from its top-left corner to its bottom-right one (its four edges, `data-brief-edge`, grow from
 * the start of each line), and the lines on the left (`data-brief-line`) fade in one after another.
 * The edges are scaled, not resized, so nothing in the page moves.
 * Only what is still below the screen is hidden first: without JavaScript, with reduced motion,
 * or when the Brief is already on screen as the page loads (a jump to `/#contact`), it is shown
 * as it is.
 */
export function BriefMotion({ children, className }: Readonly<BriefMotionProps>) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      prepareScrollTriggers();

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        if (root.getBoundingClientRect().top < window.innerHeight) return;

        const edges = (side: string) => gsap.utils.toArray<HTMLElement>(`[data-brief-edge="${side}"]`, root);
        const across = [...edges("top"), ...edges("bottom")];
        const down = [...edges("left"), ...edges("right")];
        const first = [...edges("top"), ...edges("left")];
        const second = [...edges("right"), ...edges("bottom")];
        const lines = gsap.utils.toArray<HTMLElement>("[data-brief-line]", root);

        gsap.set(across, { scaleX: 0 });
        gsap.set(down, { scaleY: 0 });
        gsap.set(lines, { opacity: 0, y: 10 });

        // The top and left edges leave the top-left corner; the right and bottom edges then
        // close the box at the bottom-right corner.
        const draw = { duration: 0.45, ease: "power2.inOut", clearProps: "transform" };
        gsap
          .timeline({ scrollTrigger: { trigger: root, start: "top 80%", once: true } })
          .to(first, { scaleX: 1, scaleY: 1, ...draw }, 0)
          .to(second, { scaleX: 1, scaleY: 1, ...draw }, 0.45)
          .to(lines, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", stagger: 0.12, clearProps: "opacity,transform" }, 0.1);
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
