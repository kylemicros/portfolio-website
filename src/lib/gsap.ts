"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";

// Register plugins once, here. Later plugins (ScrollTrigger, SplitText) join this call.
gsap.registerPlugin(useGSAP);

// Media query for gsap.matchMedia(): motion only runs when the visitor has not asked for less.
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export { gsap, useGSAP };
