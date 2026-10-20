"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

// Register plugins once, here.
gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

// Media queries for gsap.matchMedia(): motion only runs when the visitor has not asked for less.
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const MOTION_REDUCED = "(prefers-reduced-motion: reduce)";

let prepared = false;

/**
 * Page-wide ScrollTrigger set-up, run once however many components call it:
 * - every ScrollTrigger is measured again once the web fonts have loaded, since text set in its
 *   final font can move the sections below it;
 * - smooth scrolling (`data-scroll-ready` in globals.css) is only turned on once the page has
 *   loaded. ScrollTrigger measures by scrolling to the top and back, which would stop a smooth
 *   scroll the browser started on load: the jump to a link's target (`/#contact`) or back to
 *   where the visitor was before a reload. Kept instant, those land before anything measures.
 */
export function prepareScrollTriggers(): void {
  if (prepared) return;
  prepared = true;

  void document.fonts.ready.then(() => ScrollTrigger.refresh());

  const smooth = () => requestAnimationFrame(() => (document.documentElement.dataset.scrollReady = ""));
  if (document.readyState === "complete") smooth();
  else window.addEventListener("load", smooth, { once: true });
}

export { gsap, ScrollTrigger, SplitText, useGSAP };
