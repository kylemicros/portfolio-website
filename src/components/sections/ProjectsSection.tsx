import Link from "next/link";

import { siteConfig } from "@/lib/site";

import { Each } from "../Each";
import { ProjectCard, type ProjectCardProps } from "../ProjectCard";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface ProjectsSectionProps {
  projects: ProjectCardProps[];
  githubUrl?: string;
}

export function ProjectsSection({ projects, githubUrl = siteConfig.githubProfile }: Readonly<ProjectsSectionProps>) {
  return (
    <section id="projects" className="relative border-t border-border/60 bg-background" aria-labelledby="projects-heading">
      <div className="absolute inset-x-0 top-0 h-px bg-border/70" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.4em] text-muted-foreground">
              Projects
            </Badge>
            <div className="space-y-2">
              <h2 id="projects-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Work spanning healthcare, fintech, CRM, and platform launches
              </h2>
              <p className="text-pretty text-base text-muted-foreground sm:text-lg">
                Worked on multiple projects with multiple companies ranging from startups to established enterprises, delivering impactful solutions that drive user engagement and business growth.
              </p>
            </div>
          </div>
          {githubUrl && (
            <Button variant="ghost" className="self-start rounded-full px-5" asChild>
              <Link href={githubUrl} target="_blank" rel="noopener noreferrer">
                Explore my GitHub profile
              </Link>
            </Button>
          )}
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          <Each
            of={projects}
            render={(project) => (
              <ProjectCard key={project.title} {...project} />
            )}
          />
        </div>
      </div>
    </section>
  );
}
