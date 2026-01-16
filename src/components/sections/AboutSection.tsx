import { Each } from "../Each";
import { Badge } from "../ui/badge";

import type { AboutContent } from "@/lib/site";

interface AboutSectionProps {
  about: AboutContent;
  skills: string[];
}

export function AboutSection({ about, skills }: Readonly<AboutSectionProps>) {
  return (
    <section id="about" className="relative border-t border-border/60 bg-background" aria-labelledby="about-heading">
      <div className="absolute inset-x-0 top-0 h-px bg-border/70" />
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="space-y-8">
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.4em] text-muted-foreground">
            About
          </Badge>
          <div className="space-y-4">
            <h2 id="about-heading" className="text-pretty text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {about.title}
            </h2>
            <p className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {about.description}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Each
              of={about.highlights}
              render={(highlight) => (
                <article
                  key={highlight.title}
                  className="h-full rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm backdrop-blur"
                >
                  <h3 className="text-base font-semibold text-foreground">{highlight.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {highlight.description}
                  </p>
                </article>
              )}
            />
          </div>
        </div>

        <div className="flex flex-col gap-8 rounded-4xl border border-border/60 bg-card/60 p-8 shadow-sm backdrop-blur">
          <div className="grid gap-4 sm:grid-cols-3">
            {about.values.map((value) => (
              <div key={value.label} className="rounded-2xl border border-border/50 bg-background/50 px-4 py-5 text-center">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground text-balance whitespace-normal wrap-break-word">
                  {value.label}
                </p>
                <p className="mt-2 text-sm font-medium leading-snug text-foreground text-pretty">
                  {value.value}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Core capabilities
            </p>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="rounded-full border border-border/40 bg-secondary/20 px-4 py-2 text-xs font-medium text-secondary-foreground">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
