import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * A red ink stamp: a short word in heavy serif capitals inside a thick red frame.
 * Place and rotate it with `className`. It is decorative, so hidden from assistive technology.
 */
export function Stamp({ className, children, ...props }: Readonly<ComponentProps<"span">>) {
  return (
    <span
      aria-hidden="true"
      {...props}
      className={cn(
        "pointer-events-none inline-block select-none border-[3px] border-blade bg-background/70 px-2.5 py-1 font-display text-base font-black uppercase leading-none tracking-[0.12em] text-blade-hot",
        className
      )}
    >
      {children}
    </span>
  );
}
