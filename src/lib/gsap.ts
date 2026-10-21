"use client";

import gsap from "gsap";
import type { Flip as FlipPlugin } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

// Register plugins once, here.
gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

// Flip and ScrambleText are not needed for the first paint, so they load in their own chunks when a
// component first asks for them, and are registered here once.
let flip: Promise<typeof FlipPlugin> | undefined;
export function loadFlip(): Promise<typeof FlipPlugin> {
  flip ??= import("gsap/Flip").then(({ Flip }) => {
    gsap.registerPlugin(Flip);
    return Flip;
  });
  return flip;
}

let scrambleText: Promise<void> | undefined;
export function loadScrambleText(): Promise<void> {
  scrambleText ??= import("gsap/ScrambleTextPlugin").then(({ ScrambleTextPlugin }) => {
    gsap.registerPlugin(ScrambleTextPlugin);
  });
  return scrambleText;
}

// Media queries for gsap.matchMedia(): motion only runs when the visitor has not asked for less.
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const MOTION_REDUCED = "(prefers-reduced-motion: reduce)";
/**
 * The scrollytelling stage (`ScrollStage`): a wide and tall enough window, a mouse or trackpad,
 * motion allowed. globals.css repeats it for the rules that apply before the script runs.
 */
export const STAGE = "(min-width: 1024px) and (min-height: 640px) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

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
