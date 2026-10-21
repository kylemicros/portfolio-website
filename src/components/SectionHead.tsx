import { cn } from "@/lib/utils";

interface SectionHeadProps {
  /** The section's place in the file, such as "01". */
  number: string;
  /** The short serif label. It is the section's `h2`. */
  label: string;
  /** The id of the `h2`, which the section's `aria-labelledby` points to. */
  headingId: string;
  /** The section title, set small on the right. */
  title: string;
  /** The intro paragraph under the head, where the section has one. */
  intro?: string;
  className?: string;
}

/**
 * A section's head, read as one line of a file: the red number, the label, a rule, then the
 * section title in small mono. Below `md` the title wraps under the label and the rule goes.
 */
export function SectionHead({ number, label, headingId, title, intro, className }: Readonly<SectionHeadProps>) {
  return (
    <div className={cn("sky-shade space-y-5", className)}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <span className="font-mono text-sm text-blade-label">{number}</span>
        <h2 id={headingId} className="text-3xl font-black tracking-tight sm:text-4xl">
          {label}
        </h2>
        <span aria-hidden="true" className="hidden h-px min-w-8 flex-1 self-center bg-border md:block" />
        <p className="basis-full text-pretty font-mono text-xs leading-relaxed text-muted-foreground md:basis-auto md:max-w-sm md:text-right md:text-balance lg:max-w-xl">
          {title}
        </p>
      </div>
      {intro && (
        <p className="max-w-measure text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          {intro}
        </p>
      )}
    </div>
  );
}
