import { cn } from "@/lib/utils";

interface NavSealProps {
  /** Pressed beside the current section's link; otherwise faded out. */
  on: boolean;
  className?: string;
}

/**
 * The small seal beside the link to the section the visitor is in: a 12px square tilted like the
 * 謎 seal (`Seal`), a thick red frame around a solid block of red ink, no character. As it comes on
 * it is pressed down (it lands a little large, settles and leaves a faint ink spread, see
 * globals.css); as it goes off it fades. With reduced motion it simply shows and hides.
 * Decorative, so hidden from assistive technology: the link carries `aria-current`. Place it
 * with `className`; it takes no room in the layout.
 */
export function NavSeal({ on, className }: Readonly<NavSealProps>) {
  return (
    <span
      aria-hidden="true"
      data-on={on ? "" : undefined}
      className={cn("group/seal pointer-events-none absolute size-3 -rotate-6", className)}
    >
      <span className="absolute inset-0 rounded-[2px] bg-blade-hot/50 opacity-0 blur-[1px] motion-safe:group-data-on/seal:animate-seal-spread" />
      {/* The fade is on this wrapper, and only on the way out: the press inside it is an
          animation, and a transition on the same element would not start as that animation ends. */}
      <span className="absolute inset-0 opacity-0 transition-opacity duration-200 group-data-on/seal:opacity-100 group-data-on/seal:transition-none motion-reduce:transition-none">
        <span className="block size-full rounded-[2px] border-2 border-blade bg-background p-[1.5px] motion-safe:group-data-on/seal:animate-seal-press">
          <span className="block size-full rounded-[1px] bg-blade-hot" />
        </span>
      </span>
    </span>
  );
}
