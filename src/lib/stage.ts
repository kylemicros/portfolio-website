// What the scrollytelling stage (`ScrollStage`) tells the effects in the sections: when a
// section arrives on stage, and whether it is on stage now. Without the stage (phones, touch,
// reduced motion, a short or narrow window) nothing here changes an effect.

import type { ScrollTrigger } from "@/lib/gsap";

/** The mark the stage puts on a section that is not on stage. */
export const OFF_STAGE = "data-off-stage";

/** Where an element's section takes its turn on the stage, in scroll positions. */
export interface StageTurn {
  /** The element's top in the page without the stage. */
  top: number;
  /** From this scroll on its section is on stage, faded in and in its place. */
  arrival: number;
}

/** Set by the stage while it runs: the turn of the section an element is in, if it has one. */
let turnOf: ((element: Element) => StageTurn | null) | null = null;

/** Called by the stage as it starts (with its lookup) and stops (with null). */
export function setStageTurns(lookup: ((element: Element) => StageTurn | null) | null): void {
  turnOf = lookup;
}

/**
 * The start of an entrance that plays once as its trigger comes into view, `top <percent>%`.
 * On the stage it starts there or as the trigger's section arrives on stage, if that is later,
 * so it plays where it can be seen; anywhere else it is just `top <percent>%`.
 */
export function arrivalStart(percent: number): ScrollTrigger.StartEndFunc {
  const start = `top ${percent}%`;
  return (self) => {
    const turn = self.trigger && turnOf ? turnOf(self.trigger) : null;
    if (!turn) return start;
    return Math.max(turn.top - (percent / 100) * window.innerHeight, turn.arrival);
  };
}

/**
 * Calls `onChange` with whether the section holding `element` is on stage, now and whenever that
 * changes. Without the stage it is always on. Returns a function that stops watching.
 */
export function watchStage(element: Element, onChange: (onStage: boolean) => void): () => void {
  const section = element.closest("section");
  if (!section) {
    onChange(true);
    return () => {};
  }
  let last: boolean | undefined;
  const check = () => {
    const onStage = !section.hasAttribute(OFF_STAGE);
    if (onStage === last) return;
    last = onStage;
    onChange(onStage);
  };
  const observer = new MutationObserver(check);
  observer.observe(section, { attributes: true, attributeFilter: [OFF_STAGE] });
  check();
  return () => observer.disconnect();
}
