"use client";

import { useEffect } from "react";

import type Lenis from "lenis";

import { gsap, MOTION_OK, ScrollTrigger } from "@/lib/gsap";
import { whenSplashEnds } from "@/lib/splash";

// Only a mouse or trackpad gets the glide: touch screens keep their own scrolling.
const FINE_POINTER = "(pointer: fine)";

/** An open dialog or the menu sheet: the wheel scrolls its own content there, natively. */
const inDialog = (node: HTMLElement) => node.getAttribute("role") === "dialog";

/**
 * Smooths wheel and trackpad scrolling with Lenis, driven by the GSAP ticker so ScrollTrigger
 * (the sky's clouds, the entrances) reads every frame of the glide. Everything else stays the
 * browser's own: touch, the keyboard, focus, the scrollbar and the jumps to a section (`#about`).
 * It only runs for a fine pointer with motion allowed, and starts once the page has loaded and any
 * opening splash has ended.
 * Renders nothing.
 */
export function SmoothScroll() {
  useEffect(() => {
    const motion = window.matchMedia(MOTION_OK);
    const fine = window.matchMedia(FINE_POINTER);
    const body = document.body;
    let stop: (() => void) | null = null;
    // Bumped on every change of preference, so a start still loading from an earlier one gives up.
    let run = 0;

    const start = async (current: number) => {
      // Lenis loads in its own chunk, so phones and reduced-motion visitors never download it.
      const { default: LenisClass } = await import("lenis");
      if (current !== run) return;

      const lenis: Lenis = new LenisClass({ autoRaf: false, syncTouch: false, prevent: inDialog });
      const offScroll = lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);

      // A dialog or the menu sheet locks the page (`data-scroll-locked` on the body); the wheel
      // must not move the page behind it.
      const syncLock = () => {
        if (body.hasAttribute("data-scroll-locked")) lenis.stop();
        else lenis.start();
      };
      const lock = new MutationObserver(syncLock);
      lock.observe(body, { attributes: true, attributeFilter: ["data-scroll-locked"] });
      syncLock();

      // A press, a key or a move of focus ends the glide where it is, so the browser's own scroll
      // that may follow (a link to a section, the keyboard, a drag of the scrollbar, focus moved
      // by a script or a screen reader) is not pulled back. Stopping and starting again is
      // Lenis's public way to drop the glide; a stopped (locked) page has no glide to drop.
      const settle = () => {
        if (!lenis.isSmooth) return;
        lenis.stop();
        lenis.start();
      };
      // Lenis ignores native scroll events while it glides, and its next frame would set the
      // page back. A scroll it did not make (`scrollIntoView`, `scrollTo` or `window.find` from a
      // script) leaves the page away from where Lenis last put it: drop the glide so that scroll
      // stays. The page's smooth scrolling is off during a glide (globals.css), so such a scroll
      // lands at once; one that asks for `behavior: "smooth"` itself is still overridden by the
      // glide. SNAP allows for the browser rounding Lenis's position to a pixel.
      const SNAP = 2;
      const onScroll = () => {
        if (lenis.isSmooth && Math.abs(lenis.actualScroll - lenis.animatedScroll) > SNAP) settle();
      };
      window.addEventListener("pointerdown", settle, { capture: true, passive: true });
      window.addEventListener("keydown", settle, { capture: true, passive: true });
      window.addEventListener("focusin", settle, { capture: true, passive: true });
      window.addEventListener("scroll", onScroll, { passive: true });

      stop = () => {
        window.removeEventListener("pointerdown", settle, { capture: true });
        window.removeEventListener("keydown", settle, { capture: true });
        window.removeEventListener("focusin", settle, { capture: true });
        window.removeEventListener("scroll", onScroll);
        lock.disconnect();
        gsap.ticker.remove(tick);
        offScroll();
        lenis.destroy();
      };
    };

    const update = () => {
      run += 1;
      stop?.();
      stop = null;
      if (motion.matches && fine.matches) void start(run);
    };

    let stopWaiting = () => {};
    // The opening splash holds the page still while it plays, so the glide starts after it.
    const begin = () => {
      stopWaiting = whenSplashEnds(() => {
        update();
        motion.addEventListener("change", update);
        fine.addEventListener("change", update);
      });
    };

    if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin, { once: true });

    return () => {
      run += 1;
      window.removeEventListener("load", begin);
      stopWaiting();
      motion.removeEventListener("change", update);
      fine.removeEventListener("change", update);
      stop?.();
      stop = null;
    };
  }, []);

  return null;
}
