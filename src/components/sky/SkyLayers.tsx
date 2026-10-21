"use client";

import { useEffect, useRef, useState } from "react";

import { MOTION_REDUCED } from "@/lib/gsap";
import { moonAt, skyNow, type MoonMotion, type MoonPlacement, type SkyPoint } from "@/lib/moon-arc";
import { whenSplashEnds } from "@/lib/splash";
import { cn } from "@/lib/utils";

import { isSkyEvent, type SkyCommand } from "./sky-messages";

type SkyState = "waiting" | "ready" | "fallback";

/** What the page tells the sky, wherever it runs. */
interface SkyDriver {
  setProgress: (progress: number) => void;
  setMoon: (motion: MoonMotion) => void;
  setReducedMotion: (reduced: boolean) => void;
  setSize: (width: number, height: number) => void;
  setHidden: (hidden: boolean) => void;
  destroy: () => void;
}

interface DriverOptions {
  canvas: HTMLCanvasElement;
  progress: number;
  motion: MoonMotion;
  reducedMotion: boolean;
  onReady: () => void;
  onFallback: () => void;
}

/** How the drag reads and moves the moon. */
interface MoonGrip {
  /** Where the moon is drawn now, or null while the sky is not showing it. */
  placement: () => MoonPlacement | null;
  /** The visitor holds the moon's centre here. */
  hold: (point: SkyPoint) => void;
  /** The visitor lets go of the moon here. */
  release: (point: SkyPoint) => void;
}

// Milliseconds the browser may wait for an idle moment before the sky starts anyway.
const IDLE_TIMEOUT = 2500;
// Only a mouse or trackpad drags the moon: on a touch screen a finger on it would block scrolling.
const FINE_POINTER = "(pointer: fine)";
// What a press on the moon must not land on for the drag to start.
const CONTENT = "a, button, input, select, textarea, label, summary, img, svg, video, canvas, iframe, [role], [tabindex], [contenteditable]";

/** The page's scroll progress, from 0 at the top to 1 at the furthest it can scroll. */
function scrollProgress(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

/** A computed colour with no opacity, such as `rgba(0, 0, 0, 0)` or `oklab(0 0 0 / 0)`. */
function isClear(colour: string): boolean {
  return colour === "transparent" || /[,/]\s*0(\.0+)?\)$/.test(colour);
}

/** Whether a line of the element's own text covers the point. */
function hasTextAt(element: Element, x: number, y: number): boolean {
  const range = document.createRange();
  for (const node of element.childNodes) {
    if (!(node instanceof Text) || !node.data.trim()) continue;
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true;
    }
  }
  return false;
}

/**
 * Whether the pointer, over this element, sees the sky: no text, control, image or painted box
 * of the page is in the way. The body's own background is not, since it sits under the sky.
 */
function isOpenSky(target: EventTarget | null, x: number, y: number): boolean {
  if (!(target instanceof Element) || hasTextAt(target, x, y)) return false;
  for (let element: Element | null = target; element; element = element.parentElement) {
    if (element === document.body || element === document.documentElement) return true;
    if (element.matches(CONTENT)) return false;
    const style = getComputedStyle(element);
    if (style.backgroundImage !== "none" || !isClear(style.backgroundColor)) return false;
  }
  return true;
}

const isOver = (moon: MoonPlacement, x: number, y: number) => Math.hypot(x - moon.x, y - moon.y) <= moon.r;

/**
 * Lets a mouse drag the moon. The sky sits behind the page and takes no pointer events, so this
 * listens on the window and only acts on a primary press that lands on the moon where nothing
 * of the page covers it. A move does no more than note the pointer: the check runs once a frame,
 * and reads the page only while the pointer is over the moon. Returns a function that stops it.
 */
function dragMoon(grip: MoonGrip): () => void {
  const root = document.documentElement;
  const initial = { userSelect: root.style.userSelect };
  let pointer: { x: number; y: number; target: EventTarget | null } | null = null;
  let frame = 0;
  let drag: { id: number; dx: number; dy: number; at: SkyPoint } | null = null;
  let grabbable = false;

  const setGrabbable = (next: boolean) => {
    if (next === grabbable) return;
    grabbable = next;
    // `data-moon` puts the moon's hand over the whole page (globals.css), text included.
    if (next) root.dataset.moon = "grab";
    else delete root.dataset.moon;
  };

  const update = () => {
    frame = 0;
    if (!pointer) return;
    if (drag) {
      drag.at = { x: pointer.x - drag.dx, y: pointer.y - drag.dy };
      grip.hold(drag.at);
      return;
    }
    const moon = grip.placement();
    setGrabbable(moon !== null && isOver(moon, pointer.x, pointer.y) && isOpenSky(pointer.target, pointer.x, pointer.y));
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    pointer = { x: event.clientX, y: event.clientY, target: event.target };
    if (!frame) frame = requestAnimationFrame(update);
  };

  const onDown = (event: PointerEvent) => {
    if (drag || event.pointerType !== "mouse" || event.button !== 0 || !event.isPrimary) return;
    const moon = grip.placement();
    const { clientX: x, clientY: y } = event;
    if (!moon || !isOver(moon, x, y) || !isOpenSky(event.target, x, y)) return;

    // No text selection, focus change or click on the page underneath.
    event.preventDefault();
    drag = { id: event.pointerId, dx: x - moon.x, dy: y - moon.y, at: { x: moon.x, y: moon.y } };
    // The root keeps the pointer, and with it the cursor, until the button is let go.
    try {
      root.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone; its moves still reach the window until it lifts.
    }
    root.dataset.moon = "grabbing";
    root.style.userSelect = "none";
    grip.hold(drag.at);
  };

  const end = () => {
    if (!drag) return;
    const { id, at } = drag;
    drag = null;
    if (root.hasPointerCapture(id)) root.releasePointerCapture(id);
    grip.release(at);
    grabbable = false;
    delete root.dataset.moon;
    root.style.userSelect = initial.userSelect;
  };

  const onUp = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    drag.at = { x: event.clientX - drag.dx, y: event.clientY - drag.dy };
    end();
  };

  // Scrolling can bring the page over the moon under a still pointer; the next move checks again.
  const onScroll = () => {
    if (!drag) setGrabbable(false);
  };

  const onSelectStart = (event: Event) => {
    if (drag) event.preventDefault();
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", end);
  window.addEventListener("blur", end);
  root.addEventListener("lostpointercapture", end);
  document.addEventListener("selectstart", onSelectStart);
  window.addEventListener("scroll", onScroll, { passive: true });

  return () => {
    end();
    if (frame) cancelAnimationFrame(frame);
    setGrabbable(false);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", end);
    window.removeEventListener("blur", end);
    root.removeEventListener("lostpointercapture", end);
    document.removeEventListener("selectstart", onSelectStart);
    window.removeEventListener("scroll", onScroll);
  };
}

/** Hands the canvas to a worker, so WebGL never runs on the page's main thread. */
function workerDriver({ canvas, progress, motion, reducedMotion, onReady, onFallback }: DriverOptions): SkyDriver {
  const worker = new Worker(new URL("./sky.worker.ts", import.meta.url), { type: "module" });
  const send = (command: SkyCommand, transfer: Transferable[] = []) => worker.postMessage(command, transfer);
  worker.addEventListener("message", (message: MessageEvent<unknown>) => {
    if (!isSkyEvent(message.data)) return;
    if (message.data.type === "ready") onReady();
    else onFallback();
  });
  // The canvas belongs to the worker now, so a failed worker leaves the CSS sky.
  worker.addEventListener("error", onFallback);

  const offscreen = canvas.transferControlToOffscreen();
  send(
    {
      type: "start",
      canvas: offscreen,
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      progress,
      motion,
      reducedMotion,
    },
    [offscreen]
  );
  return {
    setProgress: (value) => send({ type: "progress", value }),
    setMoon: (next) => send({ type: "moon", motion: next }),
    setReducedMotion: (value) => send({ type: "reducedMotion", value }),
    setSize: (width, height) => send({ type: "size", width, height }),
    setHidden: (value) => send({ type: "hidden", value }),
    destroy: () => worker.terminate(),
  };
}

/** Runs the sky in the page, for browsers that cannot hand a canvas to a worker. */
async function pageDriver({ canvas, progress, motion, reducedMotion, onReady, onFallback }: DriverOptions): Promise<SkyDriver | null> {
  const { startSky } = await import("./sky-renderer");
  return startSky(
    canvas,
    { width: canvas.clientWidth, height: canvas.clientHeight, progress, motion, reducedMotion },
    { onReady, onFallback }
  );
}

/**
 * The moving night sky: a WebGL canvas with the sky, stars, moon and clouds. Nothing starts until
 * the page has loaded, any opening splash has ended and the browser is idle; until then, and
 * whenever WebGL is missing or lost, the CSS sky behind it shows instead. The page keeps the moon's
 * clock and the visitor's hold on it, and hands every change to the sky, so both place the moon
 * with the same maths.
 */
export function SkyLayers() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<SkyState>("waiting");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const motion = window.matchMedia(MOTION_REDUCED);
    let sky: SkyDriver | null = null;
    let stopTracking = () => {};
    let cancelled = false;
    let idle = 0;
    let timer = 0;
    // The moon is on screen, and has been since the sky first came up.
    let shown = false;
    let begun = false;
    // The sky's size in CSS pixels, as last reported to it.
    let width = 0;
    let height = 0;
    let moon: MoonMotion = { origin: skyNow(), held: null, released: null };

    const moveMoon = (next: MoonMotion) => {
      moon = next;
      sky?.setMoon(next);
    };

    const grip: MoonGrip = {
      placement: () => (shown ? moonAt(moon, skyNow(), width, height, motion.matches) : null),
      hold: (point) => moveMoon({ ...moon, held: point }),
      release: (point) => moveMoon({ ...moon, held: null, released: { ...point, at: (skyNow() - moon.origin) / 1000 } }),
    };

    const start = async () => {
      moon = { origin: skyNow(), held: null, released: null };
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const options: DriverOptions = {
        canvas,
        progress: scrollProgress(),
        motion: moon,
        reducedMotion: motion.matches,
        onReady: () => {
          shown = true;
          // The loop starts with the first frame, so the moon is at its start as the sky fades in.
          if (!begun) moveMoon({ ...moon, origin: skyNow() });
          begun = true;
          setState("ready");
        },
        onFallback: () => {
          shown = false;
          setState("fallback");
        },
      };
      let driver: SkyDriver | null;
      if (typeof canvas.transferControlToOffscreen === "function" && typeof Worker === "function") {
        try {
          driver = workerDriver(options);
        } catch {
          // No worker allowed here (or the canvas is gone): the CSS sky stays.
          setState("fallback");
          return;
        }
      } else {
        driver = await pageDriver(options);
      }
      const { ScrollTrigger, prepareScrollTriggers } = await import("@/lib/gsap");
      if (cancelled || !driver) {
        driver?.destroy();
        return;
      }
      sky = driver;
      // Anything that moved the moon before the sky was ready to hear it.
      driver.setMoon(moon);

      // Progress through the whole page, from the top to the furthest it can scroll, for the
      // clouds' parallax.
      prepareScrollTriggers();
      const trigger = ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => driver.setProgress(self.progress),
        onRefresh: (self) => driver.setProgress(self.progress),
      });
      driver.setProgress(trigger.progress);

      const resize = new ResizeObserver(() => {
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        driver.setSize(width, height);
      });
      resize.observe(canvas);

      // The loop's clock stops while the page is hidden, so the moon carries on from where it was.
      let hiddenAt = 0;
      const onVisibility = () => {
        if (document.hidden) hiddenAt = skyNow();
        else if (hiddenAt) {
          moveMoon({ ...moon, origin: moon.origin + skyNow() - hiddenAt });
          hiddenAt = 0;
        }
        driver.setHidden(document.hidden);
      };
      document.addEventListener("visibilitychange", onVisibility);
      onVisibility();

      const fine = window.matchMedia(FINE_POINTER);
      let stopDrag: (() => void) | null = null;
      const onPointerChange = () => {
        if (fine.matches) stopDrag ??= dragMoon(grip);
        else {
          stopDrag?.();
          stopDrag = null;
        }
      };
      fine.addEventListener("change", onPointerChange);
      onPointerChange();

      stopTracking = () => {
        trigger.kill();
        resize.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        fine.removeEventListener("change", onPointerChange);
        stopDrag?.();
      };
    };

    let stopWaiting = () => {};
    // After the opening splash, when there is one, so the two never compete for the first seconds.
    const begin = () => {
      stopWaiting = whenSplashEnds(() => {
        const run = () => void start();
        // Safari has no requestIdleCallback.
        if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT });
        else timer = window.setTimeout(run, 0);
      });
    };

    const onMotionChange = () => {
      // Motion back on: the loop starts again from where the still moon rests.
      if (!motion.matches) moveMoon({ ...moon, origin: skyNow(), released: null });
      sky?.setReducedMotion(motion.matches);
    };

    if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin, { once: true });
    motion.addEventListener("change", onMotionChange);

    return () => {
      cancelled = true;
      window.removeEventListener("load", begin);
      stopWaiting();
      if (idle) window.cancelIdleCallback(idle);
      window.clearTimeout(timer);
      motion.removeEventListener("change", onMotionChange);
      stopTracking();
      sky?.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "absolute inset-0 size-full opacity-0 transition-opacity duration-1000 motion-reduce:transition-none",
        state === "ready" && "opacity-100"
      )}
    />
  );
}
