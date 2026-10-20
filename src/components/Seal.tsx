import { spriteHref } from "@/lib/tech-icons";
import { cn } from "@/lib/utils";

interface SealProps {
  className?: string;
}

/**
 * The red seal that stands in for a company logo: 謎, "mystery", drawn from the sprite (where
 * its source and licence are noted). Decorative, so hidden from assistive technology; the
 * company's name is always written beside it.
 * Size it through `className` (it fills its box).
 */
export function Seal({ className }: Readonly<SealProps>) {
  return (
    <span aria-hidden="true" className={cn("flex items-center justify-center", className)}>
      <span className="flex size-[90%] -rotate-6 items-center justify-center rounded-md border-[3px] border-blade text-blade-hot">
        <svg focusable="false" className="size-[62%] fill-current">
          <use href={spriteHref("seal-nazo")} />
        </svg>
      </span>
    </span>
  );
}
