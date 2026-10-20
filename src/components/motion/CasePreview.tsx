"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";

import Image, { type StaticImageData } from "next/image";

import type { ImageFit } from "@/components/ProjectCard";
import { gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

export interface CasePreviewItem {
  src?: string | StaticImageData;
  /** The case's `data-flip-id`, so its file can grow out of the preview. */
  flipId: string;
  /** As the case's own image: `contain` shows a logo whole, centred on white. */
  fit?: ImageFit;
}

interface CasePreviewProps {
  /** One per case, in the order of the rows (each row's `data-case` holds its place). */
  items: CasePreviewItem[];
  children: ReactNode;
  className?: string;
}

// A mouse or trackpad that can hover, and a visitor who has not asked for less motion.
const PREVIEW = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const WIDTH = 300;
const HEIGHT = 190;
// Space between the cursor and the picture, and between the picture and the index's edges.
const GAP = 28;
const EDGE = 16;

/**
 * The Cases index's hover preview: while a mouse is over a row, that case's screenshot hangs
 * beside the cursor, tilted and pinned, and follows it with a light lag. One picture frame serves
 * every row. It never takes pointer events, is hidden from assistive technology, and goes as soon
 * as the pointer leaves the rows, the page scrolls or a file is opened.
 * The screenshots are only added once a mouse first reaches the index, so touch screens, keyboard
 * visitors and reduced motion never load them; none of them are part of the page's first load.
 * While it shows a case, the frame is that case's stand-in (`data-file-stand-in` with the case's
 * `data-flip-id`), so the file opened from the row grows out of it.
 */
export function CasePreview({ items, children, className }: Readonly<CasePreviewProps>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);

  useGSAP(
    () => {
      const root = rootRef.current;
      const frame = frameRef.current;
      if (!root || !frame) return;

      const mm = gsap.matchMedia();
      mm.add(PREVIEW, () => {
        gsap.set(frame, { autoAlpha: 0, scale: 0.9, rotation: 3 });
        const moveX = gsap.quickTo(frame, "x", { duration: 0.45, ease: "power3.out" });
        const moveY = gsap.quickTo(frame, "y", { duration: 0.45, ease: "power3.out" });
        let current = -1;
        let shown = false;

        // Only the current case's picture is visible inside the frame.
        const showPicture = () => {
          frame.querySelectorAll<HTMLElement>("[data-preview-picture]").forEach((picture) => {
            picture.style.opacity = picture.dataset.previewPicture === String(current) ? "1" : "0";
          });
        };

        // Beside the cursor, on its right unless that would run past the index's right edge.
        const place = (event: PointerEvent, jump: boolean) => {
          const box = root.getBoundingClientRect();
          const pointerX = event.clientX - box.left;
          let x = pointerX + GAP;
          if (x + WIDTH + EDGE > box.width) x = pointerX - GAP - WIDTH;
          x = Math.max(EDGE, Math.min(x, box.width - WIDTH - EDGE));
          const y = event.clientY - box.top - HEIGHT / 2;
          if (jump) {
            moveX(x, x);
            moveY(y, y);
          } else {
            moveX(x);
            moveY(y);
          }
        };

        const hide = () => {
          if (!shown) return;
          shown = false;
          current = -1;
          gsap.to(frame, {
            autoAlpha: 0,
            scale: 0.9,
            duration: 0.15,
            ease: "power2.in",
            overwrite: "auto",
            onComplete: () => {
              if (!shown) delete frame.dataset.flipId;
            },
          });
        };

        const onPointerMove = (event: PointerEvent) => {
          if (event.pointerType !== "mouse") return;
          const row = event.target instanceof Element ? event.target.closest("[data-case]") : null;
          const index = row instanceof HTMLElement ? Number(row.dataset.case) : Number.NaN;
          const item = Number.isInteger(index) ? items[index] : undefined;
          if (!item?.src) {
            hide();
            return;
          }

          setArmed(true);
          const entering = !shown;
          current = index;
          frame.dataset.flipId = item.flipId;
          showPicture();
          place(event, entering);
          if (entering) {
            shown = true;
            gsap.to(frame, { autoAlpha: 1, scale: 1, duration: 0.25, ease: "power3.out", overwrite: "auto" });
          }
        };
        // A click opens the file, which reads the frame's place first; the frame goes a frame later.
        const onClick = () => requestAnimationFrame(hide);

        root.addEventListener("pointermove", onPointerMove);
        root.addEventListener("pointerleave", hide);
        root.addEventListener("click", onClick);
        window.addEventListener("scroll", hide, { passive: true });

        return () => {
          root.removeEventListener("pointermove", onPointerMove);
          root.removeEventListener("pointerleave", hide);
          root.removeEventListener("click", onClick);
          window.removeEventListener("scroll", hide);
          delete frame.dataset.flipId;
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [items] }
  );

  return (
    // The frame never reaches past the index sideways, and the clip keeps it from widening the page.
    <div ref={rootRef} className={cn("relative overflow-x-clip", className)}>
      {children}
      <div
        ref={frameRef}
        aria-hidden="true"
        data-file-stand-in=""
        className="pointer-events-none invisible absolute top-0 left-0 z-20 h-[190px] w-[300px] border-[3px] border-paper bg-ink-raised opacity-0 shadow-[0_18px_40px_rgb(0_0_0/0.6)]"
      >
        {armed &&
          items.map((item, index) =>
            item.src ? (
              <div
                key={item.flipId}
                data-preview-picture={index}
                className={cn(
                  "absolute inset-0 overflow-hidden opacity-0 transition-opacity duration-150",
                  item.fit === "contain" && "bg-white"
                )}
              >
                <Image
                  src={item.src}
                  alt=""
                  fill
                  sizes="300px"
                  className={item.fit === "contain" ? "object-contain p-3" : "object-cover object-left-top"}
                />
              </div>
            ) : null
          )}
        {/* The pin holding the picture to the file. */}
        <span className="absolute -top-2 left-1/2 size-3 -translate-x-1/2 rounded-full bg-blade shadow-[0_1px_2px_rgb(0_0_0/0.6)]" />
      </div>
    </div>
  );
}
