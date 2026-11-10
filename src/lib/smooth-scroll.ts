// The page's smooth scrolling (Lenis, started by `SmoothScroll`), for code that scrolls the page
// itself, such as the slides (`@/lib/slides`): they scroll a section's content with Lenis's own
// glide and read where that glide is heading. Null while it is not running: phones, touch, reduced
// motion, or the splash.

import type Lenis from "lenis";

let current: Lenis | null = null;

/** Called by `SmoothScroll` as Lenis starts (with it) and stops (with null). */
export function setSmoothScroll(lenis: Lenis | null): void {
  current = lenis;
}

/** The running Lenis, or null. */
export function smoothScroll(): Lenis | null {
  return current;
}
