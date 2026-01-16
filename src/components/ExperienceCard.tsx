import type { ExperienceItem } from "@/lib/site";
import { cn } from "@/lib/utils";

import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface ExperienceCardProps {
  experience: ExperienceItem;
  index: number;
  className?: string;
}

export function ExperienceCard({ experience, index, className }: Readonly<ExperienceCardProps>) {
  const position = String(index + 1).padStart(2, "0");

  return (
    <article className="relative pb-12 last:pb-0">
      <div className="absolute -left-9 top-12 flex items-center sm:top-14">
        <div className="h-px w-5 bg-border/60 sm:w-6" aria-hidden="true" />
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground sm:h-10 sm:w-10">
          {position}
        </span>
      </div>
      <Card
        className={cn(
          "ml-12 border border-border/60 bg-card/70 shadow-sm backdrop-blur sm:ml-18",
          className
        )}
      >
        <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold text-foreground">
              {experience.role}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {experience.company} · {experience.start} — {experience.end}
            </CardDescription>
          </div>
          {/* {experience.url && (
            <Badge variant="secondary" className="self-start rounded-full px-3 py-1 text-xs">
              <Link href={experience.url} target="_blank" rel="noopener noreferrer">
                Visit site
              </Link>
            </Badge>
          )} */}
        </CardHeader>
        <CardContent className="space-y-5 -mt-2">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {experience.summary}
          </p>
          <div className="space-y-3">
            {experience.achievements.length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Highlights
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {experience.achievements.map((achievement) => (
                    <li key={achievement} className="relative pl-5">
                      <span className="absolute left-0 top-2 size-1.5 rounded-full bg-primary/60" aria-hidden="true" />
                      {achievement}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {experience.technologies.map((tech) => (
              <Badge key={tech} variant="outline" className="border-border/60 bg-background/50 text-xs">
                {tech}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </article>
  );
}
