import type { ExperienceItem } from "@/lib/site";

import { Each } from "../Each";
import { ExperienceCard } from "../ExperienceCard";
import { Badge } from "../ui/badge";

interface ExperienceSectionProps {
  experiences: ExperienceItem[];
}

export function ExperienceSection({ experiences }: Readonly<ExperienceSectionProps>) {
  return (
    <section
      id="experience"
      className="relative border-t border-border/60 bg-background"
      aria-labelledby="experience-heading"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-border/70" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-20">
        <div className="space-y-4">
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Experience
          </Badge>
          <div className="space-y-3">
            <h2 id="experience-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Leading interfaces and systems with cross-functional teams
            </h2>
            <p className="text-pretty text-base text-muted-foreground sm:text-lg">
              Here’s a look at the product teams I’ve partnered with and the outcomes we delivered together.
            </p>
          </div>
        </div>

        <div className="relative pl-14 sm:pl-16">
          <div className="absolute inset-y-4 left-6 sm:left-7 w-px bg-border/60" aria-hidden="true" />
          <Each
            of={experiences}
            render={(experience, index) => (
              <ExperienceCard key={experience.company} experience={experience} index={index} />
            )}
          />
        </div>
      </div>
    </section>
  );
}
