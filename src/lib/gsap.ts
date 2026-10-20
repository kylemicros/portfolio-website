"use client";

import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

// Register plugins once, here. Later plugins (ScrollTrigger) join this call.
gsap.registerPlugin(useGSAP, SplitText);

// Media queries for gsap.matchMedia(): motion only runs when the visitor has not asked for less.
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const MOTION_REDUCED = "(prefers-reduced-motion: reduce)";

export { gsap, SplitText, useGSAP };
