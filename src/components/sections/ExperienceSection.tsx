import { RecordStack } from "@/components/motion/RecordStack";
import { SectionHead } from "@/components/SectionHead";
import type { ExperienceItem } from "@/lib/site";

import { Each } from "../Each";
import { ExperienceCard } from "../ExperienceCard";

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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-20">
        <SectionHead
          number="03"
          label="Service record"
          headingId="experience-heading"
          title="Leading interfaces and systems with cross-functional teams"
          intro="Here’s a look at the product teams I’ve partnered with and the outcomes we delivered together."
        />

        <RecordStack>
          <Each
            of={experiences}
            render={(experience, index) => (
              <>
                {/* Leaves room for the card's tab, and marks where the card sits in the page. */}
                <div aria-hidden="true" data-stack-mark="" className="mt-12" />
                <ExperienceCard experience={experience} index={index} />
              </>
            )}
          />
        </RecordStack>
      </div>
    </section>
  );
}
