import Link from "next/link";

import { CaseDecode } from "@/components/motion/CaseDecode";
import { CasePreview } from "@/components/motion/CasePreview";
import { SectionHead } from "@/components/SectionHead";
import { siteConfig } from "@/lib/site";

import { Each } from "../Each";
import { caseFlipId, ProjectCard, type ProjectCardProps } from "../ProjectCard";

interface ProjectsSectionProps {
  projects: ProjectCardProps[];
  githubUrl?: string;
}

export function ProjectsSection({ projects, githubUrl = siteConfig.githubProfile }: Readonly<ProjectsSectionProps>) {
  const previews = projects.map((project, index) => ({
    src: project.src,
    flipId: caseFlipId(index),
    fit: project.imageFit,
  }));

  return (
    <section id="projects" className="relative border-t border-border/60" aria-labelledby="projects-heading">
      <div className="site-width flex flex-col gap-10 py-20">
        <SectionHead
          number="02"
          label="Cases"
          headingId="projects-heading"
          title={siteConfig.projectsHead.title}
          intro={siteConfig.projectsHead.intro}
        />

        <div className="sky-shade space-y-6">
          <CasePreview items={previews}>
            <CaseDecode>
              {/* The role keeps the list's semantics in Safari, which drops them without list markers. */}
              <ol role="list">
                <Each of={projects} render={(project, index) => <ProjectCard {...project} index={index} />} />
              </ol>
            </CaseDecode>
          </CasePreview>

          {githubUrl && (
            <div className="md:text-right">
              <Link
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block border-b border-blade-hot pb-0.5 text-xs font-semibold uppercase tracking-[0.15em] text-paper transition-colors hover:text-blade-hot focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                Explore my GitHub profile
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
