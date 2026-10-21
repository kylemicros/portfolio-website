import { SectionHead } from "@/components/SectionHead";
import { Toolkit } from "@/components/Toolkit";
import type { AboutContent, SkillGroup } from "@/lib/site";

import { Each } from "../Each";

interface AboutSectionProps {
  about: AboutContent;
  skillGroups: SkillGroup[];
}

export function AboutSection({ about, skillGroups }: Readonly<AboutSectionProps>) {
  return (
    <section id="about" className="relative border-t border-border/60" aria-labelledby="about-heading">
      <div className="site-width flex flex-col gap-10 py-20">
        <SectionHead number="01" label="Profile" headingId="about-heading" title={about.title} />

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-start">
          <div className="sky-shade space-y-8">
            <p className="max-w-measure text-pretty text-base leading-relaxed text-paper/90 sm:text-lg">
              {about.description}
            </p>

            <div className="space-y-6">
              <Each
                of={about.highlights}
                render={(highlight) => (
                  <div key={highlight.title} className="space-y-1.5">
                    <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-blade-label">
                      {highlight.title}
                    </h3>
                    <p className="max-w-measure text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {highlight.description}
                    </p>
                  </div>
                )}
              />
            </div>

            <dl className="text-sm">
              {about.values.map((value) => (
                <div key={value.label} className="flex items-baseline justify-between gap-6 border-b border-dashed border-border py-2.5">
                  <dt className="shrink-0 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                    {value.label}
                  </dt>
                  <dd className="text-pretty text-right text-paper">{value.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* The toolkit has its own frame, so it is shaded inside the frame only. */}
          <Toolkit groups={skillGroups} className="bg-(--sky-shade)" />
        </div>
      </div>
    </section>
  );
}
