// Which of the home page's sections the visitor is in, by its id (`about`), for the seal on the
// header's links and the mobile menu's rows. While the scrollytelling stage (`ScrollStage`) runs,
// it is the section the stage shows, the one its rail marks: on the stage the hero stays on
// screen under the other sections, so measuring the page would give the wrong answer there.
// Otherwise (phones, touch, reduced motion, a short or narrow window) it is the section that
// fills most of the screen below the header (`watchSections`). Null on a page without them.

import { useSyncExternalStore } from "react";

let current: string | null = null;
/** Whether the stage runs, and the section it shows. */
let stageOn = false;
let stageSection: string | null = null;
/** The section measured from the page, while the stage is off. */
let pageSection: string | null = null;
/** Measures the page again at once, while `watchSections` runs. */
let measurePage: (() => void) | null = null;

const listeners = new Set<() => void>();

/** Tells the subscribers only when the section changes, so a scroll alone never re-renders. */
const publish = () => {
  const next = stageOn ? stageSection : pageSection;
  if (next === current) return;
  current = next;
  listeners.forEach((listener) => listener());
};

/** Called by the stage on every render, with the id of the section it shows. */
export function showStageSection(id: string | null): void {
  stageOn = true;
  stageSection = id;
  publish();
}

/** Called by the stage as it stops: the page is measured again. */
export function endStageSection(): void {
  stageOn = false;
  stageSection = null;
  if (measurePage) measurePage();
  else publish();
}

/**
 * Watches which of `sections` fills most of the screen below the site header, while the stage is
 * off. At the end of the page that is the last section, even when it is too short to fill most of
 * the screen, since the visitor cannot scroll further into it. Returns a function that stops
 * watching and leaves no section current.
 */
export function watchSections(sections: readonly HTMLElement[]): () => void {
  let frame = 0;

  const measure = () => {
    frame = 0;
    if (stageOn) return;
    const header = document.querySelector<HTMLElement>("[data-site-header]");
    const top = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
    const bottom = window.innerHeight;
    let found: string | null = null;
    let most = 0;
    for (const section of sections) {
      const box = section.getBoundingClientRect();
      const seen = Math.min(box.bottom, bottom) - Math.max(box.top, top);
      if (seen > most) {
        most = seen;
        found = section.id || null;
      }
    }
    const last = sections[sections.length - 1];
    const end = document.documentElement.scrollHeight - window.innerHeight;
    if (last && window.scrollY >= end - 2 && last.getBoundingClientRect().top < bottom) {
      found = last.id || null;
    }
    pageSection = found;
    publish();
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(measure);
  };

  measurePage = measure;
  measure();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);

  return () => {
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    cancelAnimationFrame(frame);
    if (measurePage === measure) measurePage = null;
    pageSection = null;
    publish();
  };
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => current;
// The server never knows the scroll, so no section is current in its HTML.
const getServerSnapshot = () => null;

/** The id of the section the visitor is in, or null; renders again only when it changes. */
export function useCurrentSection(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** The id of the section a link to the home page points to (`/#about` gives `about`). */
export function linkSection(href: string): string {
  return href.split("#")[1] ?? "";
}
