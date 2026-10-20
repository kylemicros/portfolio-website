import Link from "next/link";

import { SectionHead } from "@/components/SectionHead";
import { siteConfig } from "@/lib/site";

import { Each } from "../Each";
import { ProjectCard, type ProjectCardProps } from "../ProjectCard";
import { Button } from "../ui/button";

interface ProjectsSectionProps {
  projects: ProjectCardProps[];
  githubUrl?: string;
}

export function ProjectsSection({ projects, githubUrl = siteConfig.githubProfile }: Readonly<ProjectsSectionProps>) {
  return (
    <section id="projects" className="relative border-t border-border/60" aria-labelledby="projects-heading">
      <div className="absolute inset-x-0 top-0 h-px bg-border/70" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-20">
        <div className="space-y-6">
          <SectionHead
            number="02"
            label="Cases"
            headingId="projects-heading"
            title="Work spanning healthcare, fintech, CRM, and platform launches"
            intro="Worked on multiple projects with multiple companies ranging from startups to established enterprises, delivering impactful solutions that drive user engagement and business growth."
          />
          {githubUrl && (
            <div className="self-start">
              <Button variant="ghost" className="rounded-full px-5" asChild>
                <Link href={githubUrl} target="_blank" rel="noopener noreferrer">
                  Explore my GitHub profile
                </Link>
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          <Each
            of={projects}
            render={(project) => (
              <div key={project.title} className="h-full">
                <ProjectCard {...project} />
              </div>
            )}
          />
        </div>
      </div>
    </section>
  );
}
