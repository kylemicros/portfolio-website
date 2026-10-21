// The opening splash plays once per browser session. A script in the page's <head> decides before
// the first paint and marks <html> with `data-splash`; the splash is only shown under that mark
// (globals.css), so without JavaScript, with reduced motion, or later in the session it never shows.

/** The session flag set once the splash has been seen (or skipped). */
const SEEN_KEY = "splash-seen";
/** Written and removed again to check that session storage works at all. */
const PROBE_KEY = "splash-probe";
const ATTRIBUTE = "data-splash";
/** The value the splash sets once it is running, which turns off the CSS fallback that hides it. */
const RUNNING = "run";
const END_EVENT = "splash-end";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** Whether the splash's slash has cut the screen open on this page load. */
let cutPlayed = false;

/**
 * The head script: marks <html> when JavaScript runs, motion is allowed, session storage works and
 * the splash has not been seen this session. Any error (storage blocked) shows nothing.
 * `wantsSplash` below makes the same decision and must stay in step with it.
 */
export const SPLASH_HEAD_SCRIPT = `(function(){try{var s=window.sessionStorage;if(s.getItem(${JSON.stringify(SEEN_KEY)})||window.matchMedia(${JSON.stringify(REDUCED_MOTION)}).matches)return;s.setItem(${JSON.stringify(PROBE_KEY)},"1");s.removeItem(${JSON.stringify(PROBE_KEY)});document.documentElement.setAttribute(${JSON.stringify(ATTRIBUTE)},"")}catch(e){}})()`;

/** The head script's decision, made again in the page. */
function wantsSplash(): boolean {
  try {
    const storage = window.sessionStorage;
    if (storage.getItem(SEEN_KEY) || window.matchMedia(REDUCED_MOTION).matches) return false;
    storage.setItem(PROBE_KEY, "1");
    storage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Whether the page is marked for the splash, or the splash is still playing. */
export function isSplashShowing(): boolean {
  return document.documentElement.hasAttribute(ATTRIBUTE);
}

/**
 * Called by the splash as it mounts: whether to play it. In development React resets the
 * attributes on <html> when it mounts the page a second time, so the mark is set again from the
 * same decision; in production only the head script decides, so a page whose head script did not
 * run never shows the splash late, over a page already seen.
 */
export function beginSplash(): boolean {
  const root = document.documentElement;
  const marked = root.hasAttribute(ATTRIBUTE) || (process.env.NODE_ENV !== "production" && wantsSplash());
  if (marked) root.setAttribute(ATTRIBUTE, RUNNING);
  return marked;
}

/** Records the splash as seen for the rest of the session. */
export function markSplashSeen(): void {
  try {
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Storage worked a moment ago; if it no longer does, the next page decides without it.
  }
}

/** Records that the splash's slash has played: the splash counts as seen, and the hero skips its own slash. */
export function markSplashCut(): void {
  cutPlayed = true;
  markSplashSeen();
}

/** Ends the splash: the page is unmarked and whatever waited for it starts. */
export function endSplash(): void {
  markSplashSeen();
  if (!isSplashShowing()) return;
  document.documentElement.removeAttribute(ATTRIBUTE);
  window.dispatchEvent(new Event(END_EVENT));
}

/**
 * Runs `start` once the splash has ended, or straight away when there is none. `start` is told
 * whether the splash's slash played on this page load. Returns a function that cancels the wait.
 */
export function whenSplashEnds(start: (afterCut: boolean) => void): () => void {
  if (!isSplashShowing()) {
    start(cutPlayed);
    return () => {};
  }
  const onEnd = () => start(cutPlayed);
  window.addEventListener(END_EVENT, onEnd, { once: true });
  return () => window.removeEventListener(END_EVENT, onEnd);
}
