"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

import { gsap, MOTION_OK, prepareScrollTriggers, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface ExperienceLineProps {
  children: ReactNode;
  /** Classes for the timeline container. */
  className?: string;
  /** Classes placing the line inside the container (its left offset and vertical inset). */
  lineClassName?: string;
}

// Where on screen the tip of the line sits while it draws (as a ScrollTrigger position).
const TIP = "70%";

/**
 * The experience timeline's brush line. It draws down as the visitor scrolls, and each role's
 * marker (`data-timeline-marker`) turns blade-hot as the tip passes it.
 * The markup is the finished state: the line fully drawn and every marker hot. Only when motion
 * is allowed does script rewind it, so without JavaScript or with reduced motion it stays drawn.
 */
export function ExperienceLine({ children, className, lineClassName }: Readonly<ExperienceLineProps>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const track = trackRef.current;
      const line = lineRef.current;
      if (!root || !track || !line) return;
      prepareScrollTriggers();

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // The tip stays on the same screen line from start to end, so a marker meets it
        // exactly when the marker's centre crosses that line. The scroll positions are measured
        // on the track, which has the same box as the line but is never scaled.
        gsap.fromTo(
          line,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: { trigger: track, start: `top ${TIP}`, end: `bottom ${TIP}`, scrub: true },
          }
        );

        const markers = gsap.utils.toArray<HTMLElement>("[data-timeline-marker]", root);
        const setCold = (marker: HTMLElement, cold: boolean) => {
          if (cold) marker.dataset.cold = "";
          else delete marker.dataset.cold;
        };
        markers.forEach((marker) => {
          setCold(marker, true);
          ScrollTrigger.create({
            trigger: marker,
            start: `center ${TIP}`,
            onEnter: () => setCold(marker, false),
            onLeaveBack: () => setCold(marker, true),
          });
        });

        return () => markers.forEach((marker) => setCold(marker, false));
      });

      return () => mm.revert();
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div ref={trackRef} aria-hidden="true" className={cn("absolute w-px bg-border/60", lineClassName)} />
      <div
        ref={lineRef}
        aria-hidden="true"
        className={cn(
          "absolute w-0.5 origin-top rounded-full bg-linear-to-b from-blade-hot via-blade to-blade/40",
          lineClassName
        )}
      />
      {children}
    </div>
  );
}
