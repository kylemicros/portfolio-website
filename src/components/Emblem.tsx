"use client";

import { useRef } from "react";

import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface EmblemProps {
  size?: number;
  animate?: boolean;
  className?: string;
}

/**
 * The site mark: a red diamond around a diagonal, slightly curved blade with a round guard.
 * Decorative (the surrounding link or text names the owner).
 * The markup is fully drawn. With `animate`, the strokes draw in once, and only
 * when the visitor allows motion, so without JavaScript or with reduced motion it stays drawn.
 */
export function Emblem({ size = 32, animate = false, className }: Readonly<EmblemProps>) {
  const svgRef = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      if (!animate) return;

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          "[data-emblem-stroke]",
          { strokeDasharray: 100, strokeDashoffset: 100 },
          { strokeDashoffset: 0, duration: 0.9, ease: "power3.out", stagger: 0.12 }
        );
      });

      return () => mm.revert();
    },
    { scope: svgRef, dependencies: [animate] }
  );

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <path
        data-emblem-stroke
        pathLength={100}
        d="M24 2.5 45.5 24 24 45.5 2.5 24Z"
        className="stroke-blade"
        strokeWidth={3}
        strokeLinejoin="miter"
      />
      <path
        data-emblem-stroke
        pathLength={100}
        d="M9.2 38.8 15.2 32.8"
        className="stroke-paper"
        strokeWidth={3}
      />
      <circle
        data-emblem-stroke
        pathLength={100}
        cx={16.6}
        cy={31.4}
        r={2.6}
        className="stroke-paper"
        strokeWidth={1.75}
      />
      <path
        data-emblem-stroke
        pathLength={100}
        d="M17.3 28.6Q26.1 16.2 37.4 7.7 29.3 19.4 19.4 30.7Z"
        className="stroke-paper"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </svg>
  );
}
