"use client";

import { useEffect, useRef, useState } from "react";

import { MOTION_REDUCED } from "@/lib/gsap";
import { cn } from "@/lib/utils";

import { isSkyEvent, type SkyCommand } from "./sky-messages";

type SkyState = "waiting" | "ready" | "fallback";

/** What the page tells the sky, wherever it runs. */
interface SkyDriver {
  setProgress: (progress: number) => void;
  setReducedMotion: (reduced: boolean) => void;
  setSize: (width: number, height: number) => void;
  setHidden: (hidden: boolean) => void;
  destroy: () => void;
}

interface DriverOptions {
  canvas: HTMLCanvasElement;
  progress: number;
  reducedMotion: boolean;
  onReady: () => void;
  onFallback: () => void;
}

// Milliseconds the browser may wait for an idle moment before the sky starts anyway.
const IDLE_TIMEOUT = 2500;

/** The page's scroll progress, from 0 at the top to 1 at the furthest it can scroll. */
function scrollProgress(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

/** Hands the canvas to a worker, so WebGL never runs on the page's main thread. */
function workerDriver({ canvas, progress, reducedMotion, onReady, onFallback }: DriverOptions): SkyDriver {
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
    { type: "start", canvas: offscreen, width: canvas.clientWidth, height: canvas.clientHeight, progress, reducedMotion },
    [offscreen]
  );
  return {
    setProgress: (value) => send({ type: "progress", value }),
    setReducedMotion: (value) => send({ type: "reducedMotion", value }),
    setSize: (width, height) => send({ type: "size", width, height }),
    setHidden: (value) => send({ type: "hidden", value }),
    destroy: () => worker.terminate(),
  };
}

/** Runs the sky in the page, for browsers that cannot hand a canvas to a worker. */
async function pageDriver({ canvas, progress, reducedMotion, onReady, onFallback }: DriverOptions): Promise<SkyDriver | null> {
  const { startSky } = await import("./sky-renderer");
  return startSky(
    canvas,
    { width: canvas.clientWidth, height: canvas.clientHeight, progress, reducedMotion },
    { onReady, onFallback }
  );
}

/**
 * The moving night sky: a WebGL canvas with the sky, stars, moon and clouds. Nothing starts until
 * the page has loaded and the browser is idle; until then, and whenever WebGL is missing or lost,
 * the CSS sky behind it shows instead.
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

    const start = async () => {
      const options: DriverOptions = {
        canvas,
        progress: scrollProgress(),
        reducedMotion: motion.matches,
        onReady: () => setState("ready"),
        onFallback: () => setState("fallback"),
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

      // Progress through the whole page, from the top to the furthest it can scroll.
      prepareScrollTriggers();
      const trigger = ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => driver.setProgress(self.progress),
        onRefresh: (self) => driver.setProgress(self.progress),
      });
      driver.setProgress(trigger.progress);

      const resize = new ResizeObserver(() => driver.setSize(canvas.clientWidth, canvas.clientHeight));
      resize.observe(canvas);
      const onVisibility = () => driver.setHidden(document.hidden);
      document.addEventListener("visibilitychange", onVisibility);
      onVisibility();

      stopTracking = () => {
        trigger.kill();
        resize.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
      };
    };

    const begin = () => {
      const run = () => void start();
      // Safari has no requestIdleCallback.
      if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT });
      else timer = window.setTimeout(run, 0);
    };

    const onMotionChange = () => sky?.setReducedMotion(motion.matches);

    if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin, { once: true });
    motion.addEventListener("change", onMotionChange);

    return () => {
      cancelled = true;
      window.removeEventListener("load", begin);
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
