"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

interface TrailPoint {
  x: number;
  y: number;
  /** When the pointer was here, on the clock of `performance.now()`. */
  t: number;
}

interface Drop {
  x: number;
  y: number;
  /** Speed in px per ms. */
  vx: number;
  vy: number;
  r: number;
  born: number;
  life: number;
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// A mouse or trackpad that can hover, and a visitor who has not asked for less motion.
const WANTED = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
// Milliseconds a point of the slash lasts, so a slash fades out this long after the pointer stops.
const LIFE = 250;
// A pause longer than this (ms) starts a new slash instead of joining the last one.
const GAP = 80;
// The slash's width at its widest, in px.
const WIDTH = 3;
// Pointer speed (px per ms) from which a flick sheds drops, and how many may be out at once.
const FLICK = 2.5;
const MAX_DROPS = 14;
// A drop's life in ms, and its fall in px per ms squared.
const DROP_LIFE = 420;
const GRAVITY = 0.0012;
// The canvas's resolution stops at twice its CSS size.
const MAX_SCALE = 2;

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(WANTED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const isWanted = () => window.matchMedia(WANTED).matches;
const never = () => false;

/** One side of the slash: from the tail to the head, rounded through the points. */
function traceSide(context: CanvasRenderingContext2D, side: readonly { x: number; y: number }[], start: boolean) {
  const first = side[0];
  if (start) context.moveTo(first.x, first.y);
  else context.lineTo(first.x, first.y);
  for (let i = 1; i < side.length - 1; i++) {
    const here = side[i];
    const next = side[i + 1];
    context.quadraticCurveTo(here.x, here.y, (here.x + next.x) / 2, (here.y + next.y) / 2);
  }
  const last = side[side.length - 1];
  context.lineTo(last.x, last.y);
}

/** A slash along the points, `width` at its widest and tapering to a point at both ends. */
function fillSlash(context: CanvasRenderingContext2D, points: readonly TrailPoint[], now: number, width: number) {
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  const last = points.length - 1;
  let nx = 0;
  let ny = 0;
  for (let i = 0; i <= last; i++) {
    const before = points[Math.max(0, i - 1)];
    const after = points[Math.min(last, i + 1)];
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const length = Math.hypot(dx, dy);
    // The normal to the path here; where the path does not move, the last one.
    if (length > 0) {
      nx = -dy / length;
      ny = dx / length;
    }
    const life = 1 - Math.min(1, Math.max(0, now - points[i].t) / LIFE);
    const half = (width / 2) * Math.sin((Math.PI * i) / last) ** 0.75 * (0.35 + 0.65 * life);
    const { x, y } = points[i];
    left.push({ x: x + nx * half, y: y + ny * half });
    right.push({ x: x - nx * half, y: y - ny * half });
  }
  context.beginPath();
  traceSide(context, left, true);
  traceSide(context, right.reverse(), false);
  context.closePath();
  context.fill();
}

/**
 * Draws the trail on the canvas until the returned function is called. A pointer move only adds
 * its points; one frame loop draws, and stops as soon as the slash and the drops have faded.
 */
function startTrail(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): () => void {
  const style = getComputedStyle(document.documentElement);
  // The palette's crimson: `blade` for the slash and drops, `blade-hot` for the slash's core. A
  // canvas that cannot read the token's colour keeps the same red in hex.
  const colour = (token: string, fallback: string) => {
    context.fillStyle = fallback;
    context.fillStyle = style.getPropertyValue(token).trim() || fallback;
    return context.fillStyle;
  };
  const edge = colour("--blade", "#c8102e");
  const core = colour("--blade-hot", "#ff2a3d");
  let points: TrailPoint[] = [];
  let drops: Drop[] = [];
  let frame = 0;
  let sized = false;
  let scale = 1;
  // What the last frame drew on, to clear before the next.
  let drawn: Box | null = null;
  // The newest point that has had its chance to shed drops.
  let shed = 0;

  const resize = () => {
    sized = true;
    scale = Math.min(window.devicePixelRatio || 1, MAX_SCALE);
    const width = Math.round(canvas.clientWidth * scale);
    const height = Math.round(canvas.clientHeight * scale);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.setTransform(scale, 0, 0, scale, 0, 0);
    drawn = null;
  };

  const shedDrops = (now: number) => {
    const head = points[points.length - 1];
    const from = points[points.length - 2];
    if (!head || !from || head.t === shed) return;
    shed = head.t;
    const time = Math.max(1, head.t - from.t);
    const dx = head.x - from.x;
    const dy = head.y - from.y;
    const speed = Math.hypot(dx, dy) / time;
    if (speed < FLICK) return;
    const angle = Math.atan2(dy, dx);
    const count = Math.min(MAX_DROPS - drops.length, 1 + Math.floor(Math.random() * 2));
    for (let i = 0; i < count; i++) {
      const heading = angle + (Math.random() - 0.5) * 1.2;
      const pace = 0.12 + Math.random() * 0.25;
      drops.push({
        x: head.x,
        y: head.y,
        vx: Math.cos(heading) * pace,
        vy: Math.sin(heading) * pace,
        r: 0.8 + Math.random() * 1.1,
        born: now,
        life: DROP_LIFE * (0.7 + Math.random() * 0.3),
      });
    }
  };

  const draw = () => {
    frame = 0;
    const now = performance.now();
    if (!sized) resize();
    if (drawn) context.clearRect(drawn.left, drawn.top, drawn.right - drawn.left, drawn.bottom - drawn.top);
    drawn = null;

    const alive = points.findIndex((point) => now - point.t < LIFE);
    points = alive < 0 ? [] : points.slice(alive);
    shedDrops(now);
    drops = drops.filter((drop) => now - drop.born < drop.life);

    const box: Box = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    const reach = (x: number, y: number, pad: number) => {
      box.left = Math.min(box.left, x - pad);
      box.top = Math.min(box.top, y - pad);
      box.right = Math.max(box.right, x + pad);
      box.bottom = Math.max(box.bottom, y + pad);
    };

    if (points.length > 1) {
      const head = points[points.length - 1];
      // The whole slash fades with the time since the pointer last moved.
      const fade = 1 - Math.min(1, Math.max(0, now - head.t) / LIFE);
      context.globalAlpha = 0.85 * fade;
      context.fillStyle = edge;
      fillSlash(context, points, now, WIDTH);
      context.globalAlpha = 0.9 * fade;
      context.fillStyle = core;
      fillSlash(context, points, now, WIDTH * 0.4);
      for (const point of points) reach(point.x, point.y, WIDTH);
    }

    context.fillStyle = edge;
    for (const drop of drops) {
      const age = now - drop.born;
      // The drop is moved on from where it was born, so frame timing does not change its path.
      const x = drop.x + drop.vx * age;
      const y = drop.y + drop.vy * age + (GRAVITY / 2) * age * age;
      context.globalAlpha = 0.9 * (1 - age / drop.life);
      context.beginPath();
      context.arc(x, y, drop.r, 0, Math.PI * 2);
      context.fill();
      reach(x, y, drop.r + 1);
    }
    context.globalAlpha = 1;

    if (box.right >= box.left) drawn = { left: box.left - 2, top: box.top - 2, right: box.right + 2, bottom: box.bottom + 2 };
    if (points.length > 1 || drops.length > 0) frame = requestAnimationFrame(draw);
  };

  const add = (x: number, y: number, t: number) => {
    const last = points[points.length - 1];
    if (last && t - last.t > GAP) points = [];
    else if (last && Math.abs(x - last.x) < 1 && Math.abs(y - last.y) < 1) return;
    points.push({ x, y, t });
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    // A fast flick can move far between frames: the moves the browser merged keep the curve.
    const moves = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [];
    if (moves.length > 0) for (const move of moves) add(move.clientX, move.clientY, move.timeStamp);
    else add(event.clientX, event.clientY, event.timeStamp);
    if (!frame) frame = requestAnimationFrame(draw);
  };

  const onResize = () => {
    sized = false;
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("resize", onResize);

  return () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("resize", onResize);
    if (frame) cancelAnimationFrame(frame);
    // Frees the canvas's memory while it is not in use.
    canvas.width = 0;
    canvas.height = 0;
  };
}

/**
 * A thin crimson slash that follows the mouse and fades about a quarter of a second after it,
 * shedding a few drops on a fast flick. It is drawn on one canvas fixed over the page, under
 * dialogs and the menu sheet (they open after it in the page), that takes no pointer events and
 * is hidden from assistive technology. Only for a mouse or trackpad, and never with reduced motion.
 */
export function BladeTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = useSyncExternalStore(subscribe, isWanted, never);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = active ? canvas?.getContext("2d") : null;
    if (!canvas || !context) return;
    return startTrail(canvas, context);
  }, [active]);

  return <canvas ref={canvasRef} aria-hidden="true" hidden={!active} className="pointer-events-none fixed inset-0 z-50 size-full" />;
}
