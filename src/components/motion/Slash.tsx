"use client";

import type { Ref } from "react";
import { useCallback, useEffect, useId, useImperativeHandle, useRef } from "react";

import { gsap } from "@/lib/gsap";
import type { Point, SlashGeometry } from "@/lib/slash-geometry";
import { computeSlash, crescentPath, curvePath, pointAt, splitPolygons } from "@/lib/slash-geometry";
import { cn } from "@/lib/utils";

export interface SlashTimelineOptions {
  /** Content to split along the cut. It is cloned for the cut only, then restored. */
  splitTarget?: HTMLElement;
  /** Small screens: no shake and fewer droplets. */
  small: boolean;
  /** The soft white flash at impact. Defaults to on; only the hero keeps it. */
  flash?: boolean;
  /** The small shake of the parent at impact. Defaults to on, except on small screens. */
  shake?: boolean;
  /** How many ink droplets are thrown. Defaults to 26, or 12 on small screens. */
  droplets?: number;
  /** Leave the faint scar once the cut has played. Defaults to on. */
  keepScar?: boolean;
  /**
   * Called at the moment of impact (`SLASH_IMPACT` seconds into the timeline) with the clone of
   * `splitTarget`, so callers can animate the clone's copy of an element with the original.
   */
  onClone?: (clone: HTMLElement) => void;
}

export interface SlashHandle {
  /** Builds the full slash (glint, swing, impact, cut, droplets, scar) as one timeline. */
  timeline(opts: SlashTimelineOptions): gsap.core.Timeline;
  /** Shows only the finished scar, with no motion (for reduced motion). */
  showScar(): void;
}

interface SlashProps {
  /** Start of the cut, as fractions of the parent box. */
  from: Point;
  /** End of the cut, as fractions of the parent box. */
  to: Point;
  /** How far the cut bows, as a fraction of the parent height. */
  bow: number;
  /** Extend the overlay from the parent's left edge to the left edge of the page. */
  bleedLeft?: boolean;
  /** Multiplies the blade's thickness, for smaller cuts. Defaults to 1. */
  thickness?: number;
  className?: string;
  slashRef?: Ref<SlashHandle>;
}

interface Layout {
  g: SlashGeometry;
  /** px the overlay reaches left of the parent box. */
  bleed: number;
  /** Length of the curve, for the swing's dash reveal. */
  length: number;
}

// Half-widths in px at a 1400 px wide viewport, scaled by SlashGeometry.scale.
const CORE = 22;
const EDGE = 34;
const GLOW = 70;
const TRAIL_1 = { width: 18, shift: -16 };
const TRAIL_2 = { width: 14, shift: -34 };
const SCAR = 3.2;
const MASK_STROKE = 260;
const SCAR_OPACITY = 0.28;

// Timing in seconds from the start of the slash timeline.
const SWING_AT = 0.28;
const HIT = SWING_AT + 0.1;
/** Seconds from the start of a slash timeline to the impact, when the content splits. */
export const SLASH_IMPACT = HIT;
// The halves part for 0.09 s, then settle straight away.
const SETTLE_AT = HIT + 0.09;
const SETTLE = 0.9;
const CUT_END = SETTLE_AT + SETTLE;
const GAP = 10;

/**
 * A blade slash drawn as an SVG overlay over its positioned parent. Decorative only.
 * Nothing is drawn until script runs, so without JavaScript there is no scar.
 * The parent drives it through `slashRef`; geometry follows the parent's size.
 */
export function Slash({ from, to, bow, bleedLeft = false, thickness = 1, className, slashRef }: Readonly<SlashProps>) {
  // Plain numbers, so callers may pass inline object literals without re-running the layout.
  const { x: fromX, y: fromY } = from;
  const { x: toX, y: toY } = to;
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = {
    mask: `slash-mask-${id}`,
    glow: `slash-glow-${id}`,
    soft: `slash-soft-${id}`,
    core: `slash-core-${id}`,
  };

  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const maskPathRef = useRef<SVGPathElement>(null);
  const gradientRef = useRef<SVGLinearGradientElement>(null);
  const trail2Ref = useRef<SVGPathElement>(null);
  const trail1Ref = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const edgeRef = useRef<SVGPathElement>(null);
  const coreRef = useRef<SVGPathElement>(null);
  const scarRef = useRef<SVGPathElement>(null);
  const glintRef = useRef<SVGGElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const cleanupsRef = useRef(new Set<() => void>());

  const layout = useCallback((): Layout | null => {
    const wrapper = wrapperRef.current;
    const parent = wrapper?.parentElement;
    const svg = svgRef.current;
    const maskPath = maskPathRef.current;
    const gradient = gradientRef.current;
    const flash = flashRef.current;
    const paths = [trail2Ref, trail1Ref, glowRef, edgeRef, coreRef, scarRef].map((r) => r.current);
    if (!wrapper || !parent || !svg || !maskPath || !gradient || !flash) return null;

    const width = parent.clientWidth;
    const height = parent.clientHeight;
    const bleed = bleedLeft ? Math.max(0, Math.round(parent.getBoundingClientRect().left)) : 0;
    // The overlay is hidden until its first layout, so it appears in place instead of moving
    // (a moved box would count as a layout shift).
    wrapper.style.left = `${-bleed}px`;
    wrapper.style.display = "block";
    svg.setAttribute("viewBox", `${-bleed} 0 ${width + bleed} ${height}`);

    const curve = computeSlash(
      { width, height },
      { from: { x: fromX, y: fromY }, to: { x: toX, y: toY }, bow, scaleWidth: window.innerWidth }
    );
    const g = { ...curve, scale: curve.scale * thickness };
    const k = g.scale;
    const [trail2, trail1, glow, edge, core, scar] = paths;
    trail2?.setAttribute("d", crescentPath(g, TRAIL_2.width * k, TRAIL_2.shift * k));
    trail1?.setAttribute("d", crescentPath(g, TRAIL_1.width * k, TRAIL_1.shift * k));
    glow?.setAttribute("d", crescentPath(g, GLOW * k));
    edge?.setAttribute("d", crescentPath(g, EDGE * k));
    core?.setAttribute("d", crescentPath(g, CORE * k));
    scar?.setAttribute("d", crescentPath(g, SCAR * k));

    gradient.setAttribute("x1", String(g.p0.x));
    gradient.setAttribute("y1", String(g.p0.y));
    gradient.setAttribute("x2", String(g.p1.x));
    gradient.setAttribute("y2", String(g.p1.y));

    maskPath.setAttribute("d", curvePath(g));
    maskPath.setAttribute("stroke-width", String(MASK_STROKE * k));
    const length = maskPath.getTotalLength();
    maskPath.style.strokeDasharray = String(length);

    // The flash is a soft radial light around the point of impact, fading out before the edges.
    const hit = pointAt(g, 0.5);
    flash.style.background = `radial-gradient(circle at ${hit.x + bleed}px ${hit.y}px, rgb(255 255 255) 0, rgb(255 255 255 / 0) ${Math.round(Math.min(width, height) * 0.6)}px)`;

    return { g, bleed, length };
  }, [fromX, fromY, toX, toY, bow, bleedLeft, thickness]);

  // Recompute on resize (debounced), so a scar left on the page follows the new size.
  useEffect(() => {
    const parent = wrapperRef.current?.parentElement;
    if (!parent) return;
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(layout, 150);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(parent);
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.clearTimeout(timer);
    };
  }, [layout]);

  // Whatever happens to the caller's animations, nothing this component added outlives it.
  useEffect(() => {
    const cleanups = cleanupsRef.current;
    return () => {
      cleanups.forEach((cleanup) => cleanup());
      cleanups.clear();
    };
  }, []);

  useImperativeHandle(
    slashRef,
    () => ({
      showScar() {
        if (!layout()) return;
        gsap.set(scarRef.current, { opacity: SCAR_OPACITY });
      },

      timeline({ splitTarget, small, onClone, flash: withFlash = true, shake = !small, droplets, keepScar = true }) {
        const geo = layout();
        const wrapper = wrapperRef.current;
        const parent = wrapper?.parentElement;
        const maskPath = maskPathRef.current;
        const glint = glintRef.current;
        const flash = flashRef.current;
        const core = coreRef.current;
        const edge = edgeRef.current;
        const glow = glowRef.current;
        const trail1 = trail1Ref.current;
        const trail2 = trail2Ref.current;
        const scar = scarRef.current;
        const tl = gsap.timeline();
        if (!geo || !wrapper || !parent || !maskPath || !glint || !flash) return tl;

        const { g, bleed, length } = geo;
        const k = g.scale;
        const n = g.normal;

        // A nested context: the caller's context records it, so reverting the caller also
        // reverts these tweens and runs the clean-up below (clone, droplets and clip paths).
        gsap.context(() => {
          const cleanups = cleanupsRef.current;
          const nodes: HTMLElement[] = [];
          const cleanup = () => {
            nodes.forEach((node) => {
              gsap.killTweensOf(node.querySelectorAll("*"));
              node.remove();
            });
            if (splitTarget) splitTarget.style.clipPath = "";
            cleanups.delete(cleanup);
          };
          cleanups.add(cleanup);

          gsap.set([core, edge, glow, trail1, trail2, scar, glint, flash], { opacity: 0 });
          gsap.set(maskPath, { strokeDashoffset: length });
          const start = pointAt(g, 0.07);
          gsap.set(glint, { x: start.x, y: start.y, scale: 0, rotation: 0, transformOrigin: "50% 50%" });

          // 1. The glint before the swing.
          tl.to(glint, { opacity: 1, scale: 1.2, rotation: 45, duration: 0.22, ease: "power2.out" }, 0)
            .to(glint, { opacity: 0, scale: 0.4, duration: 0.12, ease: "power2.in" }, 0.2);

          // 2. The swing: a fast start and a dead stop.
          tl.set([core, edge], { opacity: 1 }, SWING_AT)
            .set(glow, { opacity: 0.85 }, SWING_AT)
            .set(trail1, { opacity: 0.4 }, SWING_AT + 0.02)
            .set(trail2, { opacity: 0.22 }, SWING_AT + 0.04)
            .to(maskPath, { strokeDashoffset: 0, duration: 0.15, ease: "expo.out" }, SWING_AT);

          // 3. Impact: one soft flash, and a small shake on larger screens.
          if (withFlash) {
            tl.to(flash, { opacity: 0.32, duration: 0.04, ease: "none" }, HIT)
              .to(flash, { opacity: 0, duration: 0.22, ease: "power2.out" }, HIT + 0.04);
          }
          if (shake) {
            tl.to(
              parent,
              {
                keyframes: [
                  { x: 3, y: -2, duration: 0.03 },
                  { x: -3, y: 2, duration: 0.03 },
                  { x: 2, y: 1, duration: 0.03 },
                  { x: 0, y: 0, duration: 0.05 },
                ],
              },
              HIT
            ).set(parent, { clearProps: "transform" }, HIT + 0.15);
          }

          // 4. The cut. For the cut only, a copy of the content (hidden from assistive technology,
          // not focusable, not selectable) shows the part below the curve while the original keeps
          // the part above. They part, settle, and the copy is removed. The copy is taken at the
          // moment of impact, so content that arrived late (icons) is in it; its shell exists from
          // the start so the timeline can move it.
          if (splitTarget) {
            const parentBox = parent.getBoundingClientRect();
            const targetBox = splitTarget.getBoundingClientRect();
            const origin = { x: targetBox.left - parentBox.left, y: targetBox.top - parentBox.top };
            const { above, below } = splitPolygons(g, 40, origin);

            const shell = document.createElement("div");
            shell.setAttribute("aria-hidden", "true");
            shell.inert = true;
            shell.dataset.slashClone = "";
            shell.className = "pointer-events-none absolute select-none";
            Object.assign(shell.style, {
              left: `${origin.x}px`,
              top: `${origin.y}px`,
              width: `${targetBox.width}px`,
              height: `${targetBox.height}px`,
              clipPath: below,
            });
            nodes.push(shell);

            const gap = GAP * k;
            tl.call(
              () => {
                const copy = splitTarget.cloneNode(true);
                if (copy instanceof HTMLElement) {
                  copy.removeAttribute("id");
                  copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
                  // `inert` already keeps the copy out of the tab order; this covers browsers without it.
                  copy
                    .querySelectorAll("a[href], button, input, select, textarea, [tabindex]")
                    .forEach((el) => el.setAttribute("tabindex", "-1"));
                  copy.style.margin = "0";
                  shell.replaceChildren(copy);
                }
                parent.insertBefore(shell, wrapper);
                splitTarget.style.clipPath = above;
                onClone?.(shell);
              },
              undefined,
              HIT
            )
              .fromTo(
                splitTarget,
                { x: 0, y: 0 },
                { x: n.x * gap, y: n.y * gap, duration: 0.09, ease: "power3.out", immediateRender: false },
                HIT
              )
              .fromTo(
                shell,
                { x: 0, y: 0 },
                { x: -n.x * gap, y: -n.y * gap, duration: 0.09, ease: "power3.out", immediateRender: false },
                HIT
              )
              .to([splitTarget, shell], { x: 0, y: 0, duration: SETTLE, ease: "elastic.out(1, 0.45)" }, SETTLE_AT)
              .call(
                () => {
                  gsap.killTweensOf(shell.querySelectorAll("*"));
                  shell.remove();
                  splitTarget.style.clipPath = "";
                  gsap.set(splitTarget, { clearProps: "transform" });
                },
                undefined,
                CUT_END
              );
          }

          // 5. The afterimages and the blade fade; the scar stays.
          tl.to([trail1, trail2], { opacity: 0, duration: 0.18, ease: "power1.out" }, SWING_AT + 0.14)
            .to(glow, { opacity: 0, duration: 0.55, ease: "power2.out" }, HIT + 0.05)
            .to([core, edge], { opacity: 0, duration: 0.7, ease: "power2.in" }, HIT + 0.15)
            .to(scar, { opacity: 0.75, duration: 0.2 }, HIT + 0.3)
            .to(scar, { opacity: keepScar ? SCAR_OPACITY : 0, duration: 0.5, ease: "power1.out" }, HIT + 0.5);

          // 6. Ink droplets thrown along the swing, removed once they have faded.
          const count = droplets ?? (small ? 12 : 26);
          const angle = (Math.atan2(g.dir.y, g.dir.x) * 180) / Math.PI;
          const drops: HTMLElement[] = [];
          for (let i = 0; i < count; i++) {
            const drop = document.createElement("span");
            drop.className = "absolute left-0 top-0 h-1 w-2.5 rounded-full bg-blade";
            drops.push(drop);
            nodes.push(drop);
          }
          tl.call(() => drops.forEach((drop) => wrapper.appendChild(drop)), undefined, HIT);
          drops.forEach((drop) => {
            const q = pointAt(g, 0.45 + Math.random() * 0.55);
            const size = 0.6 + Math.random() * 1.4;
            const distance = (80 + Math.random() * 260) * k;
            const side = (Math.random() * 2 - 1) * 70 * k;
            tl.fromTo(
              drop,
              { x: q.x + bleed, y: q.y, rotation: angle + (Math.random() * 30 - 15), scale: size, opacity: 0.95 },
              {
                x: q.x + bleed + g.dir.x * distance + n.x * side,
                y: q.y + g.dir.y * distance + n.y * side + 40 * k,
                scaleX: size * 0.4,
                opacity: 0,
                duration: 0.5 + Math.random() * 0.5,
                ease: "power2.out",
                immediateRender: false,
              },
              HIT
            );
          });
          tl.call(() => drops.forEach((drop) => drop.remove()), undefined, HIT + 1);

          return cleanup;
        });

        return tl;
      },
    }),
    [layout]
  );

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      data-slash-overlay=""
      className={cn("pointer-events-none absolute inset-y-0 left-0 right-0 hidden overflow-hidden", className)}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 size-full"
        preserveAspectRatio="none"
        focusable="false"
      >
        <defs>
          <mask id={ids.mask} maskUnits="userSpaceOnUse" x="-5000" y="-5000" width="20000" height="20000">
            <path ref={maskPathRef} fill="none" stroke="white" strokeLinecap="round" />
          </mask>
          <filter id={ids.glow} x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <filter id={ids.soft} x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          <linearGradient ref={gradientRef} id={ids.core} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopOpacity="0" className="[stop-color:var(--blade-hot)]" />
            <stop offset="0.25" className="[stop-color:color-mix(in_oklab,var(--blade-hot)_20%,white)]" />
            <stop offset="0.6" stopColor="white" />
            <stop offset="1" stopColor="white" />
          </linearGradient>
        </defs>
        <g mask={`url(#${ids.mask})`}>
          <path ref={trail2Ref} className="fill-blade" opacity={0} />
          <path ref={trail1Ref} className="fill-blade-hot" opacity={0} />
          <path ref={glowRef} className="fill-blade-hot" filter={`url(#${ids.glow})`} opacity={0} />
          <path
            ref={edgeRef}
            className="fill-[color-mix(in_oklab,var(--blade-hot)_85%,white)]"
            filter={`url(#${ids.soft})`}
            opacity={0}
          />
          <path ref={coreRef} fill={`url(#${ids.core})`} opacity={0} />
        </g>
        <path ref={scarRef} className="fill-blade" opacity={0} />
        <g ref={glintRef} opacity={0}>
          <polygon points="0,-22 3,-3 22,0 3,3 0,22 -3,3 -22,0 -3,-3" fill="white" />
          <circle r="5" fill="white" filter={`url(#${ids.soft})`} />
        </g>
      </svg>
      <div ref={flashRef} className="absolute inset-0 opacity-0 mix-blend-screen" />
    </div>
  );
}
