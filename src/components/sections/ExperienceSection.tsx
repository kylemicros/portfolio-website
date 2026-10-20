import { ExperienceLine } from "@/components/motion/ExperienceLine";
import { SectionMotion } from "@/components/motion/SectionMotion";
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
      className="relative border-t border-border/60"
      aria-labelledby="experience-heading"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-border/70" />
      <SectionMotion className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-20">
        <div className="space-y-4">
          <Badge data-reveal="item" variant="outline" className="rounded-full px-3 py-1 font-brush text-sm font-normal uppercase tracking-[0.4em] text-muted-foreground">
            Experience
          </Badge>
          <div className="space-y-3">
            <h2 id="experience-heading" data-reveal="title" className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Leading interfaces and systems with cross-functional teams
            </h2>
            <p data-reveal="item" className="text-pretty text-base text-muted-foreground sm:text-lg">
              Here’s a look at the product teams I’ve partnered with and the outcomes we delivered together.
            </p>
          </div>
        </div>

        <ExperienceLine className="pl-14 sm:pl-16" lineClassName="inset-y-4 left-6 sm:left-7">
          <Each
            of={experiences}
            render={(experience, index) => (
              <ExperienceCard key={experience.company} experience={experience} index={index} />
            )}
          />
        </ExperienceLine>
      </SectionMotion>
    </section>
  );
}
