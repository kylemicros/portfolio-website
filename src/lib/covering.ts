// Keeps a decorative layer laid over the page (the watching eye, the slides' hint) from hiding
// anything the visitor can use: while a link, a button or another control of the page is under
// it, it is marked `data-covering`, and its own CSS fades it out.

import { OFF_STAGE } from "@/lib/stage";

/** Anything on the page the visitor can use. */
const INTERACTIVE = 'a[href], button, input, select, textarea, summary, [role="button"], [tabindex]:not([tabindex="-1"])';
/** The quiet after the last scroll or resize event before checking again (ms). */
const WAIT_MS = 150;

/** Whether any control of the page, other than `element`'s own, is under `element`'s box. */
function covers(element: HTMLElement): boolean {
  const box = element.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return false;
  for (const control of document.querySelectorAll(INTERACTIVE)) {
    // A section the scrollytelling stage has taken off stage is not shown.
    if (element.contains(control) || control.closest(`[${OFF_STAGE}]`)) continue;
    const rect = control.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.left < box.right && rect.right > box.left && rect.top < box.bottom && rect.bottom > box.top) return true;
  }
  return false;
}

/**
 * Marks `element` with `data-covering` while a control of the page is under it. Checked at once,
 * then once the page has stopped scrolling and after a resize, never on every frame, so a move
 * still running may pass over a control for a moment. Returns a function that stops watching and
 * removes the mark.
 */
export function watchCovering(element: HTMLElement): () => void {
  let timer = 0;
  const check = () => {
    window.clearTimeout(timer);
    timer = 0;
    element.toggleAttribute("data-covering", covers(element));
  };
  const checkSoon = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(check, WAIT_MS);
  };
  window.addEventListener("scroll", checkSoon, { passive: true });
  window.addEventListener("resize", checkSoon);
  check();
  return () => {
    window.removeEventListener("scroll", checkSoon);
    window.removeEventListener("resize", checkSoon);
    window.clearTimeout(timer);
    element.removeAttribute("data-covering");
  };
}
