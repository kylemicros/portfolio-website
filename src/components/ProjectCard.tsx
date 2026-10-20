/**
 * This is a custom project card component, laid out as one case in the Cases index.
 * It shows the case number, the title, the category and the year, and opens the case file with
 * the image, the description, the technologies used and the links.
 */

/**
 * Component Structure:
 * Row: Case number, Image (phones only), Title, Category, Year, Open file
 * File: Image (with a LIVE stamp when there is a live demo), Meta, Title, Description,
 *       Technologies Used (Badges), Links (Live Preview, Repository)
 */

import Image, { StaticImageData } from "next/image";

import { FileDialog } from "@/components/FileDialog";
import { SlabLink } from "@/components/SlabLink";
import { Stamp } from "@/components/Stamp";
import { cn } from "@/lib/utils";

import { TechTags } from "./TechTags";

export interface ProjectCardProps {
  src?: string | StaticImageData;
  title: string;
  description: string;
  technologies: string[];
  githubLink?: string;
  liveDemoLink?: string;
  category?: string;
  year?: string;
  /**
   * How the image fills its frame. `cover` (default): fills it, anchored to the top left, where a
   * landing page's headline sits. `contain`: the whole image, centred on white, for logos.
   */
  imageFit?: ImageFit;
}

export type ImageFit = "cover" | "contain";

interface CaseRowProps extends ProjectCardProps {
  /** The case's place in the index, from 0. */
  index: number;
}

/** The case number as shown, such as "01" for the first case. */
export function casePosition(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/** Matches a case's pictures (row, hover preview, file) so the file can grow out of them. */
export function caseFlipId(index: number): string {
  return `case-${casePosition(index)}`;
}

// The row's columns: one line from `md`, the thumbnail beside a stack of lines on phones.
const ROW = cn(
  "group/row relative grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-1 py-4",
  "md:grid-cols-[5rem_minmax(0,1fr)_8rem_3.5rem_7.5rem] md:gap-y-0 md:px-2 md:py-5 lg:grid-cols-[6rem_minmax(0,1fr)_10rem_4.5rem_8.5rem]",
  // A red wash from the left while the row is hovered or has keyboard focus.
  "before:pointer-events-none before:absolute before:inset-0 before:bg-linear-to-r before:from-blade/20 before:to-transparent before:to-70% before:opacity-0 before:transition-opacity",
  // The row is the focused element without script (a summary), and holds it with script (a button).
  "hover:before:opacity-100 focus-visible:before:opacity-100 has-[:focus-visible]:before:opacity-100"
);
const LIT =
  "transition-colors group-hover/row:text-blade-hot group-focus-visible/row:text-blade-hot group-has-[:focus-visible]/row:text-blade-hot";

/**
 * @param src - Image source
 * @param title - Project title
 * @param description - Project description
 * @param technologies - List of technologies used
 * @param githubLink - URL to the GitHub repository
 * @param liveDemoLink - URL to the live demo
 * @param index - The case's place in the index
 * @returns One case: a row of the index that opens the case file
 */
export function ProjectCard({
  src,
  title,
  description,
  technologies,
  githubLink,
  liveDemoLink,
  category,
  year,
  imageFit = "cover",
  index,
}: Readonly<CaseRowProps>) {
  const contain = imageFit === "contain";
  const fit = contain ? "object-contain" : "object-cover object-left-top";
  const backdrop = contain ? "bg-white" : "bg-muted/60";
  const position = casePosition(index);
  const flipId = caseFlipId(index);
  const meta = [`Case ${position}`, category, year].filter(Boolean).join(" / ");

  const row = (
    <>
      {/* Phones only: a small picture, which the file grows out of. */}
      <span
        data-file-media=""
        data-flip-id={flipId}
        className={cn("relative row-span-3 block h-12 w-18 overflow-hidden border border-border md:hidden", backdrop)}
      >
        {src && <Image src={src} alt="" fill sizes="72px" className={cn(fit, contain && "p-0.5")} />}
      </span>

      <span className={cn("font-mono text-[0.7rem] text-muted-foreground md:text-xs", LIT)}>
        <span className="sr-only">Case {position}</span>
        <span aria-hidden="true">
          CASE <span data-count={index + 1}>{position}</span>
        </span>
      </span>

      <h3 className={cn("text-xl leading-tight font-black md:text-2xl lg:text-3xl", LIT)}>
        <span className="sr-only">{title}</span>
        <span aria-hidden="true" data-decode="">
          {title}
        </span>
      </h3>

      {/* Stacked under the title on phones; their own columns from `md`. */}
      <span className="flex flex-wrap gap-x-3 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground md:contents md:text-[0.7rem]">
        {category && <span>{category}</span>}
        {year && <span>{year}</span>}
      </span>
    </>
  );

  return (
    <li data-file="" data-case={index} className="border-t border-border last:border-b">
      <FileDialog
        layout="split"
        row={row}
        rowClassName={ROW}
        triggerLabel="Open file"
        triggerContext={title}
        triggerClassName={cn(
          "hidden border-transparent px-0 text-muted-foreground md:col-start-5 md:inline-flex md:justify-self-end",
          LIT
        )}
        title={title}
        description={<span className="uppercase tracking-[0.1em]">{meta}</span>}
        media={
          <div className="relative h-full">
            <div
              data-flip-id={flipId}
              className={cn(
                "relative aspect-16/10 w-full overflow-hidden md:aspect-auto md:h-full md:min-h-72",
                backdrop
              )}
            >
              {src && (
                <Image
                  src={src}
                  alt={title}
                  fill
                  sizes="(min-width: 768px) 30rem, 100vw"
                  className={cn(fit, contain && "p-6")}
                />
              )}
            </div>
            {liveDemoLink && <Stamp className="absolute bottom-5 left-5 -rotate-8">LIVE</Stamp>}
          </div>
        }
      >
        <p className="text-pretty text-sm leading-relaxed text-paper/90 sm:text-base">{description}</p>
        <TechTags technologies={technologies} />
        {(liveDemoLink || githubLink) && (
          <div className="flex flex-wrap gap-4 pt-1">
            {liveDemoLink && (
              <SlabLink href={liveDemoLink} target="_blank" rel="noopener noreferrer">
                Live Preview
              </SlabLink>
            )}
            {githubLink && (
              <SlabLink href={githubLink} target="_blank" rel="noopener noreferrer" variant="outline">
                Repository
              </SlabLink>
            )}
          </div>
        )}
      </FileDialog>
    </li>
  );
}

/**
 * I don't put comments that much, but I guess it's helpful for you to understand the code structure and purpose.
 * If this no longer works in the future, I will f*ck you up. Just kidding, but seriously, please fix it.
 * Seriously, I am speaking in behalf of future me. Kiss my a** if you break this.
 */