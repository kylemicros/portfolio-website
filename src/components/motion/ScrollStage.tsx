"use client";

import { useRef } from "react";

import type { NavbarLink } from "@/components/Navbar";
import { gsap, prepareScrollTriggers, ScrollTrigger, STAGE, useGSAP } from "@/lib/gsap";
import { SCRIPT_MARK } from "@/lib/splash";
import { OFF_STAGE, setStageTurns } from "@/lib/stage";
import { cn } from "@/lib/utils";

interface ScrollStageProps {
  /** The sections on the progress rail, in page order: the header's links to them (`/#about`). */
  links: readonly NavbarLink[];
}

/** A section of the page and its turn on the stage, in scroll positions. */
interface Scene {
  el: HTMLElement;
  /** Its top in the page without the stage, and its height. */
  top: number;
  height: number;
  /** Taller than the screen: its content moves on the stage until it has all been seen. */
  tall: boolean;
  /** Where its top sits on the screen while it is held. */
  place: number;
  /** From this scroll on it is held in place (CSS `position: sticky`). */
  hold: number;
  /** It fades in from `fadeIn` to `fadeIn + fade`, and is in its place from `arrive`. */
  fadeIn: number;
  fade: number;
  arrive: number;
  /** The scroll range in which it is on stage on its own. */
  restStart: number;
  restEnd: number;
}

// The share of the scroll between two sections spent before the cross-fade, and on it.
const WAIT = 0.25;
const FADE = 0.45;
// The step between the Record's stacked cards, in rem, as in `ExperienceCard`. In a short window
// the step closes up so every card keeps `STACK_ROOM` rem clear of the bottom edge, down to
// `STACK_MIN_STEP` rem, which still shows each card's numbered tab.
const STACK_STEP = 1.75;
const STACK_MIN_STEP = 1.25;
const STACK_ROOM = 2;

// Milliseconds to wait after a move through the history for the router's own scroll, if any.
const TRAVERSE_WAIT = 400;

const clamp01 = gsap.utils.clamp(0, 1);
const smooth = gsap.parseEase("sine.inOut");

/** Keys that open the browser's find bar or move to the next match. */
const isFindKey = (event: KeyboardEvent): boolean =>
  event.key === "F3" || ((event.metaKey || event.ctrlKey) && !event.altKey && /^[fg]$/i.test(event.key));

/**
 * The scrollytelling stage. With a mouse or trackpad on a wide and tall enough screen and motion
 * allowed (`STAGE`), one section is on screen at a time, in one place: as the visitor scrolls, the
 * section on stage fades out and the next fades in where it will stay, and back again on the way
 * up. A section taller than the screen moves its content on the stage until all of it has been
 * seen; in the Record the head stays in view and the cards stack under it. The sections keep
 * their layout, and the page keeps its height, so smooth scrolling and links to a section work as
 * they do without the stage. The effects that play as a section comes into view wait until it is
 * on stage (`arrivalStart` in `@/lib/stage`), and a section that is not on stage is marked so its
 * idle motion pauses (`watchStage`).
 * Links to a section, keyboard focus and a load on a `#section` land on that section. Once the
 * browser's find bar is opened from the keyboard, the sections not on stage stay searchable
 * (`hidden="until-found"`, at their own size), and a match brings its section on stage.
 * The rail on the right shows the place in the page in place of the scrollbar (hidden on the stage
 * by globals.css); a click on a tick goes to that section. Elsewhere (phones, touch, reduced
 * motion, a small window, no JavaScript) the page is as it always is.
 * Renders the rail; place it last in `<main>`, after the sections.
 */
export function ScrollStage({ links }: Readonly<ScrollStageProps>) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const main = root?.parentElement;
      if (!root || !main) return;
      prepareScrollTriggers();

      const mm = gsap.matchMedia();

      mm.add(STAGE, () => {
        const sections = Array.from(main.children).filter(
          (el): el is HTMLElement => el instanceof HTMLElement && el.tagName === "SECTION"
        );
        const fill = root.querySelector<HTMLElement>("[data-rail-fill]");
        const ticks = gsap.utils.toArray<HTMLElement>("[data-rail-tick]", root);
        // Each tick's section, by the id in its link.
        const tickScene = ticks.map((tick) => sections.findIndex((section) => section.id === tick.dataset.railTick));
        const header = document.querySelector<HTMLElement>("[data-site-header]");
        if (sections.length < 2) return;

        // The head script marks the page; in development React can drop the mark when it mounts
        // the page again, and the script is running here in any case.
        document.documentElement.setAttribute(SCRIPT_MARK, "");

        // The Record: its head, and the stack's cards and the markers that keep their places.
        const record = sections.find((section) => section.querySelector("[data-record-card]"));
        const recordHead = record?.querySelector<HTMLElement>(":scope > div > :first-child") ?? null;
        const cards = record ? gsap.utils.toArray<HTMLElement>("[data-record-card]", record) : [];
        const marks = record ? gsap.utils.toArray<HTMLElement>("[data-stack-mark]", record) : [];

        // `hidden="until-found"` falls back to plain `hidden` (no layout at all) where it is not
        // supported, so it is only used where the browser knows `beforematch`.
        const findable = "onbeforematch" in document.body;

        let scenes: Scene[] = [];
        let maxScroll = 0;
        let inkFrom = Number.POSITIVE_INFINITY;
        let measuring = false;
        let wantInk = false;
        let painted: string[] = [];
        let finding = false;
        // While finding: the section on stage (moved by `beforematch`), and whether the wheel has
        // scrolled since.
        let findScene = 0;
        let wheeled = false;
        /** The section the stage shows most, as of the last render. */
        let shownScene = 0;
        let stackStep = 0;

        /** Lets a section be searched by the find bar without showing it, at its own size, or shows it again. */
        const conceal = (scene: Scene, on: boolean) => {
          const el = scene.el;
          const hidden = el.getAttribute("hidden") === "until-found";
          if (on) {
            if (hidden) return;
            el.style.containIntrinsicHeight = `${scene.height}px`;
            el.setAttribute("hidden", "until-found");
            return;
          }
          if (hidden) el.removeAttribute("hidden");
          // Also once the browser has shown a match there itself, which leaves the size behind.
          if (el.style.containIntrinsicHeight) el.style.containIntrinsicHeight = "";
        };
        const revealAll = () => scenes.forEach((scene) => conceal(scene, false));

        /** Every section where the page puts it, to be measured. */
        const release = () => {
          revealAll();
          sections.forEach((section) => {
            const style = section.style;
            style.position = "";
            style.top = "";
            style.transform = "";
          });
          painted = [];
        };

        /** Where an element sits in the page without the stage. */
        const naturalTop = (element: Element, i: number): number => {
          const scene = scenes[i];
          const section = sections[i];
          if (!scene || !section) return 0;
          // A stacked card may be held; the marker before it never is.
          const card = element.closest("[data-record-card]");
          const mark = card?.previousElementSibling;
          const anchor = mark?.hasAttribute("data-stack-mark") ? mark : null;
          const offset = card && anchor
            ? anchor.getBoundingClientRect().top + element.getBoundingClientRect().top - card.getBoundingClientRect().top
            : element.getBoundingClientRect().top;
          return scene.top + offset - section.getBoundingClientRect().top;
        };

        /** The Record's head and cards as the page sets them. */
        const unstack = () => {
          if (recordHead) {
            recordHead.style.position = "";
            recordHead.style.top = "";
            recordHead.style.zIndex = "";
          }
          cards.forEach((card) => (card.style.top = ""));
        };

        /**
         * The Record on the stage: its head stays where it is when the section arrives, and the
         * cards stack under the head instead of under the site header. Returns the step used, or
         * -1 when the cards stack as the page sets them.
         */
        const stackUnderHead = (): number => {
          if (!record || !recordHead) return 0;
          recordHead.style.position = "";
          recordHead.style.top = "";
          const sectionTop = record.getBoundingClientRect().top;
          const headTop = recordHead.getBoundingClientRect().top - sectionTop;
          const first = marks[0];
          if (!first) return 0;
          const firstCard = first.getBoundingClientRect().top - sectionTop;
          const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
          // The closest step that keeps every card clear of the bottom edge, at most the usual one.
          const room = window.innerHeight - STACK_ROOM * rem - firstCard;
          const step = cards.reduce(
            (best, card, i) => (i === 0 ? best : Math.min(best, (room - card.offsetHeight) / i)),
            STACK_STEP * rem
          );
          // Too short even for the closest step (large text): the head scrolls away and the cards
          // stack under the site header, as without the stage, which leaves them the most room.
          if (step < STACK_MIN_STEP * rem) {
            unstack();
            return -1;
          }
          const px = Math.floor(step);
          recordHead.style.position = "sticky";
          recordHead.style.top = `${headTop}px`;
          recordHead.style.zIndex = "1";
          cards.forEach((card) => (card.style.top = `calc(${firstCard}px + var(--stack-i) * ${px}px)`));
          return px;
        };

        /** Measures the sections where the page puts them and sets their turns; the stage must be off. */
        const measure = () => {
          const vh = window.innerHeight;
          maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
          scenes = sections.map((section, i) => {
            const box = section.getBoundingClientRect();
            const top = box.top + window.scrollY;
            const height = box.height;
            const tall = height > vh;
            let hold: number;
            let place: number;
            const lastMark = marks[marks.length - 1];
            const lastCard = cards[cards.length - 1];
            const stack = lastCard?.parentElement;
            if (section === record && lastMark && lastCard && stack) {
              // Held once the last card has landed and the full stack has held as long as the
              // page holds it without the stage (the room after the last card), just before the
              // cards would let go. The empty end of the section below them is never needed.
              const cardTop = lastMark.getBoundingClientRect().top;
              const landed = cardTop + window.scrollY - (Number.parseFloat(getComputedStyle(lastCard).top) || 0);
              const cardEnd = cardTop + lastCard.offsetHeight + (Number.parseFloat(getComputedStyle(lastCard).marginBottom) || 0);
              hold = landed + Math.max(0, stack.getBoundingClientRect().bottom - cardEnd);
              place = top - hold;
            } else if (tall) {
              hold = top + height - vh;
              place = vh - height;
            } else {
              // The first section stays where the page starts it; the others in the middle.
              place = i === 0 ? top : Math.max(0, (vh - height) / 2);
              hold = top - place;
            }
            hold = Math.min(maxScroll, Math.max(0, hold));
            return { el: section, top, height, tall, place, hold, fadeIn: 0, fade: 1, arrive: hold, restStart: 0, restEnd: 0 };
          });
          scenes.forEach((scene, i) => {
            const before = scenes[i - 1];
            // A tall section arrives with its top at the top of the screen, then moves on.
            scene.arrive = scene.tall ? Math.min(scene.top, scene.hold) : scene.hold;
            if (!before) {
              scene.fadeIn = 0;
              scene.fade = 1;
              return;
            }
            const span = Math.max(2, scene.arrive - before.hold);
            scene.fadeIn = before.hold + span * WAIT;
            scene.fade = span * FADE;
          });
          scenes.forEach((scene, i) => {
            const next = scenes[i + 1];
            scene.restStart = i === 0 ? 0 : scene.fadeIn + scene.fade;
            scene.restEnd = next ? next.fadeIn : Number.POSITIVE_INFINITY;
          });
          const second = scenes[1];
          inkFrom = second ? second.fadeIn + second.fade / 2 : Number.POSITIVE_INFINITY;
        };

        /** Each section stays in place once its content is through; the last scrolls on to the footer. */
        const holdAll = () => {
          scenes.forEach((scene, i) => {
            if (i === scenes.length - 1) return;
            scene.el.style.position = "sticky";
            scene.el.style.top = `${scene.top - scene.hold}px`;
          });
        };

        const paint = (i: number, opacity: string, transform: string) => {
          const el = scenes[i]?.el;
          const key = `${opacity}|${transform}`;
          if (!el || painted[i] === key) return;
          el.style.opacity = opacity;
          el.style.transform = transform;
          el.style.pointerEvents = opacity === "0" ? "none" : "";
          el.toggleAttribute(OFF_STAGE, opacity === "0");
          painted[i] = key;
        };

        /** Shows the section or sections on stage for the current scroll, and the rail. */
        const render = () => {
          if (measuring) return;
          const scroll = window.scrollY;
          let current = 0;
          let best = -1;

          scenes.forEach((scene, i) => {
            const next = scenes[i + 1];
            const shown = i === 0 ? 1 : smooth(clamp01((scroll - scene.fadeIn) / scene.fade));
            const gone = next ? smooth(clamp01((scroll - next.fadeIn) / next.fade)) : 0;
            const opacity = shown * (1 - gone);
            // On its way to its place it is shown there already, so it never moves up the screen.
            let transform = "";
            if (i > 0 && scroll >= scene.fadeIn && scroll < scene.arrive) {
              const target = scene.tall ? 0 : scene.place;
              transform = `translateY(${(target - (scene.top - scroll)).toFixed(1)}px)`;
            }
            const shownAs = opacity <= 0.001 ? "0" : opacity >= 0.999 ? "1" : opacity.toFixed(3);
            paint(i, shownAs, transform);
            conceal(scene, finding && shownAs === "0");
            if (opacity > best) {
              best = opacity;
              current = i;
            }
          });

          shownScene = current;
          ticks.forEach((tick, i) => tick.toggleAttribute("data-active", tickScene[i] === current));
          // A wheel that has brought another section on stage while the find bar is open: the
          // visitor has moved on, so every section is searchable and readable as usual again.
          if (finding && wheeled && current !== findScene) stopFinding();
          if (fill) fill.style.transform = `scaleY(${maxScroll > 0 ? scroll / maxScroll : 0})`;
          wantInk = scroll > inkFrom;
          syncInk();
        };

        // The header sets its red line from whether the hero is on screen, and the hero now stays
        // on screen under the other sections; the stage keeps the line where the scroll says.
        const syncInk = () => {
          if (!header || header.hasAttribute("data-ink") === wantInk) return;
          header.toggleAttribute("data-ink", wantInk);
        };
        const ink = new MutationObserver(syncInk);
        if (header) ink.observe(header, { attributes: true, attributeFilter: ["data-ink"] });

        const sceneOf = (element: Element) => scenes.findIndex((scene) => scene.el.contains(element));

        // ScrollTrigger measures every effect on the page with the stage off; the sections are
        // measured with it, and the stage comes back once it is done. Should the Record's step
        // have changed (a resize, or the fonts arriving), the stack's own measures were taken
        // with the old one, so everything is measured once more.
        let restack = false;
        const onRefreshInit = () => {
          measuring = true;
          release();
          const step = stackUnderHead();
          restack = stackStep !== 0 && step !== stackStep;
          stackStep = step;
          measure();
        };
        const onRefresh = () => {
          measuring = false;
          holdAll();
          render();
          if (restack) {
            restack = false;
            requestAnimationFrame(() => ScrollTrigger.refresh());
          }
        };
        ScrollTrigger.addEventListener("refreshInit", onRefreshInit);
        ScrollTrigger.addEventListener("refresh", onRefresh);

        // Content that changes size after the page has loaded (the header's icons arrive a moment
        // later) moves every section below it: measure again. The stage itself never changes
        // the page's height.
        let pageHeight = document.body.offsetHeight;
        let resized = 0;
        const grown = new ResizeObserver(() => {
          const height = document.body.offsetHeight;
          if (measuring || height === pageHeight) return;
          pageHeight = height;
          cancelAnimationFrame(resized);
          resized = requestAnimationFrame(() => ScrollTrigger.refresh());
        });
        grown.observe(document.body);

        /** The scroll position that shows an element's section on stage, with the element in view. */
        const landing = (element: Element, i: number, offset: number): number => {
          const scene = scenes[i];
          if (!scene) return window.scrollY;
          const wanted = element === scene.el ? scene.top : naturalTop(element, i) - offset;
          return Math.min(maxScroll, Math.max(scene.restStart, Math.min(wanted, scene.restEnd)));
        };

        const onStage = (i: number): boolean => {
          const scene = scenes[i];
          const scroll = window.scrollY;
          return !!scene && scroll >= scene.restStart - 2 && scroll <= scene.restEnd + 2;
        };

        const targetOf = (hash: string): Element | null => {
          if (hash.length < 2) return null;
          const element = document.getElementById(decodeURIComponent(hash.slice(1)));
          return element && main.contains(element) ? element : null;
        };

        /** Goes to a section's turn, gliding by the page's own scroll behaviour, and puts it in the address. */
        const goTo = (target: Element, i: number, hash: string) => {
          if (hash !== window.location.hash) window.history.pushState(null, "", hash);
          window.scrollTo({ top: landing(target, i, 0) });
        };

        // A link to a section: the browser would scroll to where the section is shown, which is
        // not its place in the page. Go to the section's turn on stage instead.
        const onClick = (event: MouseEvent) => {
          if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
          if (!(link instanceof HTMLAnchorElement)) return;
          const url = new URL(link.href);
          if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
          const target = targetOf(url.hash);
          const i = target ? sceneOf(target) : -1;
          if (!target || i < 0) return;
          // Before the link's own handler, which would scroll to the shown place.
          event.preventDefault();
          event.stopPropagation();
          goTo(target, i, url.hash);
        };

        // A tick on the rail: that section, as the header's link to it.
        const onRailClick = (event: MouseEvent) => {
          if (event.button !== 0) return;
          const tick = event.target instanceof Element ? event.target.closest("[data-rail-tick]") : null;
          const i = tick instanceof HTMLElement ? (tickScene[ticks.indexOf(tick)] ?? -1) : -1;
          const scene = scenes[i];
          if (!scene) return;
          goTo(scene.el, i, scene.el.id ? `#${scene.el.id}` : window.location.hash);
        };

        /** Brings the section in the address on stage, if it is not already. */
        const landOnHash = (behavior: ScrollBehavior) => {
          const target = targetOf(window.location.hash);
          const i = target ? sceneOf(target) : -1;
          if (target && i >= 0 && !onStage(i)) window.scrollTo({ top: landing(target, i, 0), behavior });
        };
        // A section's address typed in or changed by a script: the browser scrolls to the shown
        // place, so go to its turn instead. A move through the history: the router scrolls to
        // the section as it is shown, which may barely move; once that scroll has ended (or
        // none came), glide to the section's turn, as the router glides to it without the stage.
        let traversing = false;
        let traverseTimer = 0;
        const stopTraversing = () => {
          window.clearTimeout(traverseTimer);
          window.removeEventListener("scrollend", traversed);
          traversing = false;
        };
        function traversed() {
          stopTraversing();
          landOnHash("auto");
        }
        const onPopState = () => {
          stopTraversing();
          traversing = true;
          traverseTimer = window.setTimeout(traversed, TRAVERSE_WAIT);
          window.addEventListener("scrollend", traversed, { once: true });
        };
        const onHashChange = () => {
          if (!traversing) landOnHash("instant");
        };

        // Find in page. The sections not on stage are drawn transparent, so a match in one would
        // be marked where nothing shows. Once the find bar is opened from the keyboard, they are
        // made `hidden="until-found"` instead: the browser still searches them and, before it
        // shows a match, fires `beforematch`, which brings the section on stage. Hidden sections
        // are also out of reach of Tab and screen readers, so this ends, before anything acts, on
        // any other key or a press in the page, when the page has focus again (the find bar
        // closed) or the tab is hidden, and when the wheel brings another section on stage.
        const stopFinding = () => {
          if (!finding) return;
          finding = false;
          wheeled = false;
          revealAll();
        };
        const onWheel = () => {
          if (finding) wheeled = true;
        };
        const onVisibility = () => {
          if (document.hidden) stopFinding();
        };

        // Keyboard focus (or a screen reader) moving into a section that is not on stage: bring
        // that section on stage, with the focused element in view.
        let pressed = 0;
        const onPointerDown = () => {
          pressed = performance.now();
          stopFinding();
        };
        const onFocusIn = (event: FocusEvent) => {
          const target = event.target;
          if (!(target instanceof Element) || performance.now() - pressed < 500) return;
          requestAnimationFrame(() => {
            const i = sceneOf(target);
            if (i < 0 || document.activeElement !== target) return;
            const box = target.getBoundingClientRect();
            if (onStage(i) && box.top >= 0 && box.bottom <= window.innerHeight) return;
            window.scrollTo({ top: landing(target, i, window.innerHeight * 0.3), behavior: "instant" });
          });
        };

        const onKeyDown = (event: KeyboardEvent) => {
          if (!findable) return;
          if (!isFindKey(event)) {
            stopFinding();
            return;
          }
          if (finding) return;
          finding = true;
          wheeled = false;
          findScene = shownScene;
          render();
        };
        const onBeforeMatch = (event: Event) => {
          const target = event.target;
          const i = target instanceof Element ? scenes.findIndex((scene) => scene.el === target) : -1;
          const scene = scenes[i];
          if (!scene) return;
          findScene = i;
          wheeled = false;
          window.scrollTo({ top: landing(scene.el, i, 0), behavior: "instant" });
          // The browser then scrolls the match into view, which in a tall section can reach
          // into the cross-fade; keep it within the section's turn.
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              conceal(scene, false);
              const scroll = window.scrollY;
              const kept = Math.min(Math.max(scroll, scene.restStart), scene.restEnd, maxScroll);
              if (Math.abs(kept - scroll) > 1) window.scrollTo({ top: kept, behavior: "instant" });
            })
          );
        };

        const onLoad = () => requestAnimationFrame(() => landOnHash("instant"));

        window.addEventListener("click", onClick, { capture: true });
        root.addEventListener("click", onRailClick);
        window.addEventListener("popstate", onPopState);
        window.addEventListener("hashchange", onHashChange);
        window.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
        window.addEventListener("keydown", onKeyDown, { capture: true });
        window.addEventListener("wheel", onWheel, { capture: true, passive: true });
        window.addEventListener("focus", stopFinding);
        document.addEventListener("visibilitychange", onVisibility);
        main.addEventListener("focusin", onFocusIn);
        main.addEventListener("beforematch", onBeforeMatch);

        stackStep = stackUnderHead();
        measure();
        holdAll();
        setStageTurns((element) => {
          const i = sceneOf(element);
          const scene = scenes[i];
          // The first section is on stage from the start.
          if (i <= 0 || !scene) return null;
          return { top: naturalTop(element, i), arrival: scene.restStart };
        });
        render();
        root.dataset.on = "";
        ScrollTrigger.create({ start: 0, end: "max", onUpdate: render });
        // Every effect measured again with the stage in place (see `onRefreshInit`).
        ScrollTrigger.refresh();
        // A page opened on a section (`/#contact`): the browser has scrolled to where the section
        // is in the page, which may not be its turn on stage.
        if (document.readyState === "complete") onLoad();
        else window.addEventListener("load", onLoad, { once: true });

        return () => {
          ScrollTrigger.removeEventListener("refreshInit", onRefreshInit);
          ScrollTrigger.removeEventListener("refresh", onRefresh);
          window.removeEventListener("click", onClick, { capture: true });
          root.removeEventListener("click", onRailClick);
          window.removeEventListener("popstate", onPopState);
          window.removeEventListener("hashchange", onHashChange);
          stopTraversing();
          window.removeEventListener("pointerdown", onPointerDown, { capture: true });
          window.removeEventListener("keydown", onKeyDown, { capture: true });
          window.removeEventListener("wheel", onWheel, { capture: true });
          window.removeEventListener("focus", stopFinding);
          document.removeEventListener("visibilitychange", onVisibility);
          window.removeEventListener("load", onLoad);
          main.removeEventListener("focusin", onFocusIn);
          main.removeEventListener("beforematch", onBeforeMatch);
          ink.disconnect();
          grown.disconnect();
          cancelAnimationFrame(resized);
          setStageTurns(null);
          release();
          sections.forEach((section) => {
            section.style.opacity = "";
            section.style.pointerEvents = "";
            section.removeAttribute(OFF_STAGE);
          });
          unstack();
          delete root.dataset.on;
          ticks.forEach((tick) => tick.removeAttribute("data-active"));
        };
      });

      return () => mm.revert();
    },
    { dependencies: [] }
  );

  return (
    <div ref={rootRef} data-scroll-stage="" aria-hidden="true" className="group/stage pointer-events-none">
      {/* The place in the page: a tick per section, its name beside it. A tick takes a click (a
          larger area around it) but no focus: the header's links do the same for the keyboard. */}
      <div className="fixed top-1/2 right-3 z-30 hidden -translate-y-1/2 group-data-on/stage:block">
        <div data-rail="" className="relative flex flex-col items-end gap-9 py-1">
          <span className="absolute top-0 right-0 bottom-0 w-px bg-border" />
          <span data-rail-fill="" className="absolute top-0 right-0 bottom-0 w-px origin-top bg-blade-hot" />
          {links.map(({ label, href }) => (
            <span key={href} data-rail-tick={href.split("#")[1] ?? ""} className="group/tick relative block">
              <span className="pointer-events-auto absolute -inset-x-3 -inset-y-4 cursor-(--cursor-pointer,pointer)" />
              <span
                className={cn(
                  "absolute top-0 right-3.5 font-mono text-[0.6rem] leading-none uppercase tracking-[0.2em] whitespace-nowrap",
                  "text-muted-foreground opacity-0 transition-opacity duration-300 [writing-mode:vertical-rl]",
                  "group-hover/tick:opacity-100 group-data-active/tick:text-paper group-data-active/tick:opacity-100",
                  // While a tick is under the pointer only its name shows, so two names never meet.
                  "[[data-rail]:has([data-rail-tick]:hover)_[data-rail-tick]:not(:hover)_&]:opacity-0"
                )}
              >
                {label}
              </span>
              <span
                className={cn(
                  // Scaled from its right end rather than resized, so the rail never moves.
                  "block h-px w-4 origin-right scale-x-50 bg-muted-foreground/60 transition-[scale,background-color] duration-300",
                  "group-hover/tick:scale-x-75 group-hover/tick:bg-paper group-active/tick:bg-blade-label",
                  "group-data-active/tick:scale-x-100 group-data-active/tick:bg-blade-hot"
                )}
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
