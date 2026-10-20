"use client";

import type { ComponentProps } from "react";
import { useRef } from "react";

import { Stamp } from "@/components/Stamp";
import { gsap, MOTION_OK, prepareScrollTriggers, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface LandingStampProps extends ComponentProps<"span"> {
  /**
   * `view`: lands the first time it scrolls into view; already on screen as the page loads, it
   * is simply shown. `load`: lands just after the page loads; it is hidden by its own CSS until
   * then while motion is allowed, and shown in place without JavaScript.
   */
  when: "view" | "load";
}

// Seconds after the page loads when a `load` stamp lands.
const LOAD_DELAY = 0.35;
// Without JavaScript a `load` stamp's entrance never runs, so it is shown in place.
const NO_SCRIPT_STAMP = "[data-landing-stamp]{opacity:1}";

/**
 * A red ink stamp that comes down once with the same thud as the hero's: large and turned a
 * little further, then flat at its resting angle (set with a `rotate` class). With reduced
 * motion it is shown in place.
 */
export function LandingStamp({ when, className, children, ...props }: Readonly<LandingStampProps>) {
  const stampRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const stamp = stampRef.current;
      if (!stamp) return;

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const resting = gsap.getProperty(stamp, "rotation");
        const rotation = typeof resting === "number" ? resting : Number.parseFloat(resting) || 0;
        const land: gsap.TweenVars = { opacity: 1, scale: 1, rotation, duration: 0.22, ease: "power4.in" };
        const from = { opacity: 0, scale: 1.6, rotation: rotation - 6 };

        if (when === "load") {
          gsap.fromTo(stamp, from, { ...land, delay: LOAD_DELAY });
          return;
        }
        // On screen already: nothing to land.
        if (stamp.getBoundingClientRect().top < window.innerHeight) return;
        prepareScrollTriggers();
        gsap.fromTo(stamp, from, { ...land, scrollTrigger: { trigger: stamp, start: "top 95%", once: true } });
      });

      return () => mm.revert();
    },
    { dependencies: [when] }
  );

  return (
    <>
      <Stamp
        ref={stampRef}
        {...props}
        data-landing-stamp={when === "load" ? "" : undefined}
        className={cn(when === "load" && "opacity-0 motion-reduce:opacity-100", className)}
      >
        {children}
      </Stamp>
      {when === "load" && (
        <noscript>
          <style>{NO_SCRIPT_STAMP}</style>
        </noscript>
      )}
    </>
  );
}
