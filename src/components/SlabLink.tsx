import type { ComponentProps } from "react";

import Link from "next/link";

import { cn } from "@/lib/utils";

interface SlabLinkProps extends ComponentProps<typeof Link> {
  /** `solid`: the red slab for the main action. `outline`: a paper outline. */
  variant?: "solid" | "outline";
}

/**
 * A call to action drawn as an angled slab: the box is skewed and its label skewed back, so the
 * label stays upright. The link itself is not transformed.
 */
export function SlabLink({ variant = "solid", className, children, ...props }: Readonly<SlabLinkProps>) {
  return (
    <Link {...props} className={cn("group/slab inline-block outline-none", className)}>
      <span
        className={cn(
          "block -skew-x-12 border px-5 py-3 transition-colors group-focus-visible/slab:ring-[3px] group-focus-visible/slab:ring-ring",
          variant === "solid"
            ? "border-blade bg-blade text-primary-foreground group-hover/slab:border-blade-hot group-hover/slab:bg-blade-hot"
            : "border-paper text-paper group-hover/slab:bg-paper/10"
        )}
      >
        <span className="block skew-x-12 text-xs font-semibold uppercase tracking-[0.15em]">{children}</span>
      </span>
    </Link>
  );
}
