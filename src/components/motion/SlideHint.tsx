import { ArrowDownIcon, ArrowUpIcon, MouseIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const KEY = "flex size-6 items-center justify-center rounded-[3px] border border-paper/35 bg-background/70";

/**
 * The slides' controls at the bottom centre of the stage: a mouse with its wheel and the up and
 * down arrow keys, floating slowly up and down, or still with reduced motion. Shown with the rail,
 * only while the stage runs (`ScrollStage`, whose root hides it from assistive technology and
 * from the pointer). It fades out while a link or button of the page is under it (`data-covering`,
 * set by the stage through `watchCovering`).
 */
export function SlideHint() {
  return (
    <div
      data-slide-hint=""
      className={cn(
        "fixed bottom-5 left-1/2 z-30 hidden -translate-x-1/2 group-data-on/stage:block",
        "transition-opacity duration-300 data-covering:opacity-0 motion-reduce:transition-none"
      )}
    >
      <div className="flex items-center gap-3 text-paper/75 motion-safe:animate-hint-float">
        <MouseIcon className="size-6" strokeWidth={1.5} />
        <span className="h-5 w-px bg-paper/25" />
        <span className="flex gap-1">
          <span className={KEY}>
            <ArrowUpIcon className="size-3.5" strokeWidth={2} />
          </span>
          <span className={KEY}>
            <ArrowDownIcon className="size-3.5" strokeWidth={2} />
          </span>
        </span>
      </div>
    </div>
  );
}
