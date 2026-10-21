import type { MoonMotion, MoonRelease, SkyPoint } from "@/lib/moon-arc";

/**
 * The messages between the page and the night sky's worker. Messages arrive as `unknown`, so
 * each side checks them with the guards below before acting on them.
 */

/** From the page to the worker. Sizes are in CSS pixels. */
export type SkyCommand =
  | {
      type: "start";
      canvas: OffscreenCanvas;
      width: number;
      height: number;
      progress: number;
      motion: MoonMotion;
      reducedMotion: boolean;
    }
  | { type: "progress"; value: number }
  | { type: "moon"; motion: MoonMotion }
  | { type: "reducedMotion"; value: boolean }
  | { type: "size"; width: number; height: number }
  | { type: "hidden"; value: boolean };

/** From the worker to the page. */
export type SkyEvent = { type: "ready" } | { type: "fallback" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const isPoint = (value: unknown): value is SkyPoint => isRecord(value) && isNumber(value.x) && isNumber(value.y);

const isRelease = (value: unknown): value is MoonRelease =>
  isRecord(value) && isNumber(value.x) && isNumber(value.y) && isNumber(value.at);

function isMoonMotion(value: unknown): value is MoonMotion {
  return (
    isRecord(value) &&
    isNumber(value.origin) &&
    (value.held === null || isPoint(value.held)) &&
    (value.released === null || isRelease(value.released))
  );
}

export function isSkyCommand(value: unknown): value is SkyCommand {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case "start":
      return (
        typeof OffscreenCanvas !== "undefined" &&
        value.canvas instanceof OffscreenCanvas &&
        isNumber(value.width) &&
        isNumber(value.height) &&
        isNumber(value.progress) &&
        isMoonMotion(value.motion) &&
        typeof value.reducedMotion === "boolean"
      );
    case "progress":
      return isNumber(value.value);
    case "moon":
      return isMoonMotion(value.motion);
    case "reducedMotion":
    case "hidden":
      return typeof value.value === "boolean";
    case "size":
      return isNumber(value.width) && isNumber(value.height);
    default:
      return false;
  }
}

export function isSkyEvent(value: unknown): value is SkyEvent {
  return isRecord(value) && (value.type === "ready" || value.type === "fallback");
}
