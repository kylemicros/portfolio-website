import type { CSSProperties } from "react";

import Image from "next/image";

import { FileDialog } from "@/components/FileDialog";
import { Seal } from "@/components/Seal";
import type { ExperienceItem } from "@/lib/site";
import { cn } from "@/lib/utils";

import { TechTags } from "./TechTags";

interface ExperienceCardProps {
  experience: ExperienceItem;
  index: number;
  className?: string;
}

// The card's place in the stack, which sets how far below the header it sticks.
type StackStyle = CSSProperties & { "--stack-i": number };

interface RecordMarkProps {
  experience: ExperienceItem;
  size: "card" | "file";
  /** Always in full colour. Otherwise the logo is grey until the card is hovered or focused. */
  colour: boolean;
}

/** The company's logo on a white tile, or the seal when there is no logo. */
function RecordMark({ experience, size, colour }: Readonly<RecordMarkProps>) {
  const box = size === "card" ? "size-16" : "size-24";
  if (!experience.logo) return <Seal className={box} />;

  return (
    <span className={cn("flex shrink-0 overflow-hidden rounded-lg border border-border bg-white", box)}>
      <Image
        src={experience.logo}
        alt={`${experience.company} logo`}
        sizes={size === "card" ? "64px" : "96px"}
        className={cn(
          "size-full object-contain transition-[filter,opacity] duration-300",
          !colour &&
            "opacity-85 grayscale group-focus-within/card:opacity-100 group-focus-within/card:grayscale-0 group-hover/card:opacity-100 group-hover/card:grayscale-0"
        )}
      />
    </span>
  );
}

/**
 * One file in the Service record: a numbered tab, the logo or seal, the role, the company, the
 * dates and the full tech list. "Open record" opens the file with the summary and achievements;
 * a role with neither has no file, since it would only repeat the card.
 * Inside the stacking list (`RecordStack`) it sticks under the header from `lg`.
 */
export function ExperienceCard({ experience, index, className }: Readonly<ExperienceCardProps>) {
  const position = String(index + 1).padStart(2, "0");
  const current = experience.end === "Present";
  const dates = `${experience.start} to ${experience.end}`;
  const flipId = `record-${position}`;
  const stackStyle: StackStyle = { "--stack-i": index };
  const hasFile = experience.summary.length > 0 || experience.achievements.length > 0;

  return (
    <article
      data-file=""
      data-record-card=""
      style={stackStyle}
      className={cn(
        "group/card relative border bg-ink-raised p-5 sm:p-6",
        current ? "border-blade-hot/50" : "border-border",
        "lg:group-data-stack/stack:sticky lg:group-data-stack/stack:top-[calc(6rem+var(--stack-i)*1.75rem)]",
        className
      )}
    >
      <span className="absolute -top-px -left-px -translate-y-full border border-b-0 border-inherit bg-ink-raised px-3 py-0.5 font-mono text-[0.7rem] text-blade-hot">
        {position}
      </span>

      <div className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-5 gap-y-4 lg:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1.3fr)]">
        <div data-file-media="" data-flip-id={flipId} className="w-fit">
          <div data-record-stamp="">
            <RecordMark experience={experience} size="card" colour={current} />
          </div>
        </div>

        <div className="min-w-0 space-y-1">
          <h3 className="text-lg leading-snug font-black sm:text-xl">{experience.role}</h3>
          <p className="text-sm text-muted-foreground">{experience.company}</p>
          <p className="font-mono text-xs text-muted-foreground">{dates}</p>
        </div>

        {experience.technologies.length > 0 && (
          <div className="col-span-full lg:col-span-1">
            <TechTags technologies={experience.technologies} />
          </div>
        )}

        {hasFile && (
          <FileDialog
            className="col-span-full lg:col-span-2 lg:col-start-2"
            triggerLabel="Open record"
            triggerContext={`${experience.role}, ${experience.company}`}
            title={
              <>
                {experience.role}
                <span className="sr-only">, </span>
                <span className="mt-1.5 block font-sans text-sm font-normal text-muted-foreground">
                  {experience.company}
                </span>
              </>
            }
            description={dates}
            media={
              <div data-flip-id={flipId}>
                <RecordMark experience={experience} size="file" colour />
              </div>
            }
          >
            {experience.summary && (
              <p className="text-pretty text-sm leading-relaxed text-paper/90 sm:text-base">{experience.summary}</p>
            )}
            {experience.achievements.length > 0 && (
              <div className="space-y-3">
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Highlights</p>
                <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                  {experience.achievements.map((achievement) => (
                    <li key={achievement} className="relative pl-5">
                      <span className="absolute left-0 top-2 size-1.5 bg-blade-hot" aria-hidden="true" />
                      {achievement}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <TechTags technologies={experience.technologies} />
          </FileDialog>
        )}
      </div>
    </article>
  );
}
