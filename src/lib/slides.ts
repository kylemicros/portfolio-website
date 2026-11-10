// The slides on the scrollytelling stage (`ScrollStage`): one flick of the wheel or trackpad, or
// one press of an arrow key, moves to the next or previous section, as a slide show does. A
// section taller than the screen (and the last, which scrolls on to the footer) scrolls as usual
// inside; at its end a new flick moves on, never the one that reached the end.
//
// A trackpad's flick sends 40 or more wheel events over two to three seconds as its momentum dies
// away, and a fast turn of a mouse wheel sends a burst: each is one flick (`flickStarts` in
// `@/lib/flick` tells them apart), and moves one section. Once a flick has moved the page, or
// scrolled a section's content, the rest of it is spent. While a move runs the input is held; a new
// flick that starts meanwhile, even inside the first one's momentum, plays once the page has
// arrived. A move glides by the page's own smooth scrolling, the way the header's links and the
// rail glide to a section, so the stage, the rail and the header's seal follow it as they follow
// any scroll; nothing is written to the address or the history, as with the wheel without slides.

import { flickStarts } from "@/lib/flick";
import { isSplashShowing } from "@/lib/splash";
import { smoothScroll } from "@/lib/smooth-scroll";

/** A section's place on the slides, in scroll positions. */
export interface SlideStop {
  /** From `start` to `end` it is on stage on its own. */
  start: number;
  end: number;
  /**
   * Where its content starts and ends: the same place for a section that fits the screen, while
   * a taller one (and the last section, which goes on to the footer) scrolls between the two.
   */
  first: number;
  last: number;
}

/** What the stage tells the slides. */
export interface SlideStage {
  /** Every section's stop, in page order, as the stage measures them now. */
  stops: () => readonly SlideStop[];
}

/** How far a flick must travel, in px, before it moves: a touch on the trackpad that barely moves does not. */
const MIN_FLICK = 4;
/** The longest a move may hold the input, in ms, should the page never report its end. */
const MOVE_LIMIT_MS = 1500;
/** Lenis's line height, for a wheel that counts in lines, so the content scrolls as it does with Lenis. */
const LINE_PX = 100 / 6;
/** What an arrow key scrolls inside a section, in px, and what Page Up/Down and Space scroll, as a share of the screen. */
const KEY_LINE_PX = 60;
const KEY_PAGE = 0.85;
/** How long the target of the last key press is kept while held keys scroll a section, in ms. */
const KEY_AIM_MS = 400;

/** An open dialog or the menu sheet, or anything Lenis is told to leave alone: its own scrolling. */
const OWN_SCROLL = '[role="dialog"], [data-lenis-prevent]';
/** Elements that use the arrow keys or Home and End themselves. */
const OWN_KEYS =
  'input, textarea, select, video, audio, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="listbox"], [role="slider"], [role="spinbutton"], [role="menu"], [role="menubar"], [role="tablist"], [role="radiogroup"], [role="grid"], [role="tree"], [role="treegrid"]';
/** Elements that a press of Space acts on. */
const PRESSABLE = 'button, summary, label, [role="button"], [role="checkbox"], [role="switch"], [role="menuitem"], [role="tab"], [role="option"]';

/** A key's move: a line or a screen of a section's content (or the next section), or the first or last section. */
interface KeyMove {
  by: "line" | "page" | "end";
  direction: 1 | -1;
}

/** The move a key asks for, or null. */
function keyMove(event: KeyboardEvent): KeyMove | null {
  if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return null;
  if (event.key === " ") return { by: "page", direction: event.shiftKey ? -1 : 1 };
  if (event.shiftKey) return null;
  switch (event.key) {
    case "ArrowDown":
    case "ArrowRight":
      return { by: "line", direction: 1 };
    case "ArrowUp":
    case "ArrowLeft":
      return { by: "line", direction: -1 };
    case "PageDown":
      return { by: "page", direction: 1 };
    case "PageUp":
      return { by: "page", direction: -1 };
    case "End":
      return { by: "end", direction: 1 };
    case "Home":
      return { by: "end", direction: -1 };
    default:
      return null;
  }
}

/** Whether the page is locked under a dialog, or the event is inside something that scrolls itself. */
function ownScroll(target: EventTarget | null): boolean {
  if (document.body.hasAttribute("data-scroll-locked")) return true;
  return target instanceof Element && target.closest(OWN_SCROLL) !== null;
}

/** Whether the focused element keeps this key for itself. */
function ownKey(target: EventTarget | null, key: string): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(OWN_KEYS)) return true;
  return key === " " && target.closest(PRESSABLE) !== null;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Where in the stops a scroll position is: on a section's turn, or in the cross-fade after `i`. */
function locate(stops: readonly SlideStop[], scroll: number): { i: number; between: boolean } {
  const on = stops.findIndex((stop) => scroll >= stop.start - 2 && scroll <= stop.end + 2);
  if (on >= 0) return { i: on, between: false };
  let before = 0;
  stops.forEach((stop, i) => {
    if (stop.start <= scroll) before = i;
  });
  return { i: before, between: true };
}

/**
 * Starts the slides on the stage. Returns a function that stops them.
 */
export function startSlides(stage: SlideStage): () => void {
  // The flick under way: how far it has gone, and what it has done ("new": nothing yet; "inner":
  // scrolled a section's content; "spent": moved, or reached the first or last section).
  const startsFlick = flickStarts();
  let travel = 0;
  let flick: "new" | "inner" | "spent" = "new";
  // The move under way, if any: where it goes, and until when it holds the input at most.
  let moveTo: number | null = null;
  let moveUntil = 0;
  // A new flick that came while a move ran: how far it went, to play once the page has arrived.
  let held: number | null = null;
  // Where the last key press sent a section's content, and when.
  let keyAim: number | null = null;
  let keyAt = 0;

  /** Where the page is, or where its glide is taking it. */
  const position = () => {
    const lenis = smoothScroll();
    return lenis && !lenis.isStopped ? lenis.targetScroll : window.scrollY;
  };

  const moving = () => moveTo !== null && performance.now() < moveUntil;

  /** Lets go of the input once a move has arrived. */
  const arrived = () => {
    if (moveTo === null) return;
    // Never arrived in time (something else scrolled the page): the held flick is stale.
    if (performance.now() >= moveUntil) {
      moveTo = null;
      held = null;
      return;
    }
    if (Math.abs(window.scrollY - moveTo) > 1) return;
    moveTo = null;
    if (held === null) return;
    // The held flick now plays as if it had come just now: a section's content first, else on.
    const delta = held;
    held = null;
    const stops = stage.stops();
    const from = position();
    if (!within(stops, from, delta, false)) step(stops, from, Math.sign(delta));
  };

  /** Glides to a section, as a link to it does. */
  const slideTo = (top: number) => {
    const lenis = smoothScroll();
    // A wheel's glide still running would pull against the move.
    if (lenis?.isSmooth) {
      lenis.stop();
      lenis.start();
    }
    keyAim = null;
    held = null;
    moveTo = Math.round(top);
    moveUntil = performance.now() + MOVE_LIMIT_MS;
    window.scrollTo({ top, behavior: "smooth" });
    arrived();
  };

  /** Scrolls a section's content, with the wheel's own glide where there is one. */
  const scrollWithin = (top: number, byKey: boolean) => {
    const lenis = smoothScroll();
    if (byKey) {
      keyAim = top;
      keyAt = performance.now();
      window.scrollTo({ top, behavior: "smooth" });
      return;
    }
    if (lenis && !lenis.isStopped) {
      lenis.scrollTo(top, {
        programmatic: false,
        lerp: lenis.options.lerp,
        duration: lenis.options.duration,
        easing: lenis.options.easing,
      });
    } else {
      window.scrollTo({ top, behavior: "instant" });
    }
  };

  /** Where a section is entered from the side it is reached from: its start going down, its end going up. */
  const entry = (stop: SlideStop, way: number) => (way > 0 ? stop.first : stop.last);

  /**
   * Scrolls the content of the section on stage by `delta` if it has more that way, and returns
   * true; returns false when it has none (or the page is between two sections).
   */
  const within = (stops: readonly SlideStop[], from: number, delta: number, byKey: boolean): boolean => {
    const at = locate(stops, from);
    const stop = stops[at.i];
    if (at.between || !stop) return false;
    const base = clamp(from, stop.first, stop.last);
    const room = delta > 0 ? stop.last - base : base - stop.first;
    if (room <= 1) return false;
    scrollWithin(clamp(base + delta, stop.first, stop.last), byKey);
    return true;
  };

  /** Moves to the next section that way, if there is one; returns whether it moved. */
  const step = (stops: readonly SlideStop[], from: number, way: number): boolean => {
    const at = locate(stops, from);
    const to = at.between ? (way > 0 ? at.i + 1 : at.i) : at.i + way;
    const stop = stops[to];
    if (!stop) return false;
    slideTo(entry(stop, way));
    return true;
  };

  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey || ownScroll(event.target)) return;
    // A sideways swipe is the browser's own (back and forward).
    if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const unit = event.deltaMode === 1 ? LINE_PX : event.deltaMode === 2 ? window.innerHeight : 1;
    const delta = event.deltaY * unit;
    const way = Math.sign(delta);

    if (startsFlick(delta, event.timeStamp)) {
      flick = "new";
      travel = 0;
    }
    // The splash holding the page still: this flick is used up.
    if (event.defaultPrevented || isSplashShowing()) {
      flick = "spent";
      return;
    }
    const stops = stage.stops();
    if (stops.length < 2) return;
    // Every wheel on the stage is the slides' from here: Lenis must not scroll the page as well.
    event.preventDefault();
    event.stopPropagation();
    // A move under way holds the input. The flick that started it stays spent; a new one, once it
    // has gone far enough to count, is held and plays when the page has arrived.
    if (moving()) {
      if (flick === "new") {
        travel += delta;
        if (Math.abs(travel) >= MIN_FLICK) {
          held = travel;
          flick = "spent";
        }
      }
      return;
    }
    if (flick === "spent") return;

    const from = position();
    if (within(stops, from, delta, false)) {
      flick = "inner";
      return;
    }
    // The flick that brought the content to its end stops there.
    if (flick === "inner") return;
    travel += delta;
    if (Math.abs(travel) < MIN_FLICK) return;
    step(stops, from, way);
    flick = "spent";
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    const move = keyMove(event);
    // The browser's find bar needs no check here: any key the page sees ends find mode first
    // (`ScrollStage` listens in the capture phase).
    if (!move || isSplashShowing() || ownScroll(event.target) || ownKey(event.target, event.key)) return;
    const stops = stage.stops();
    if (stops.length < 2) return;
    event.preventDefault();
    if (moving()) return;

    if (move.by === "end") {
      const lastIndex = stops.length - 1;
      const at = locate(stops, position());
      const lastStop = stops[lastIndex];
      const firstStop = stops[0];
      if (event.repeat || !lastStop || !firstStop) return;
      // End goes to the last section, and on to the page's end once there; Home to the top.
      const top = move.direction < 0 ? firstStop.first : at.i === lastIndex && !at.between ? lastStop.last : lastStop.first;
      if (Math.abs(top - position()) > 1) slideTo(top);
      return;
    }

    // Held keys aim on from where the last press aimed, so the content keeps up with them.
    const aiming = keyAim !== null && performance.now() - keyAt < KEY_AIM_MS;
    const from = aiming && keyAim !== null ? keyAim : position();
    const size = move.by === "line" ? KEY_LINE_PX : window.innerHeight * KEY_PAGE;
    if (within(stops, from, move.direction * size, true)) return;
    // A held key stops at the content's end; only a new press moves on.
    if (event.repeat) return;
    step(stops, from, move.direction);
  };

  window.addEventListener("wheel", onWheel, { capture: true, passive: false });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("scroll", arrived, { passive: true });

  return () => {
    window.removeEventListener("wheel", onWheel, { capture: true });
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("scroll", arrived);
  };
}
