/**
 * This is a custom project card component.
 * It displays the image, title, description, and the technologies used in the project.
 * It also includes links to the project's GitHub repository and live demo.
 */

/**
 * Component Structure:
 * Image
 * Title
 * Description
 * Technologies Used (Badges)
 * Links (GitHub, Live Demo)
 */

import type { ComponentProps } from "react";

import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import { DynamicIcon } from "lucide-react/dynamic";

import { cn } from "@/lib/utils";

import { Each } from "./Each";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";

type CardRootProps = ComponentProps<typeof Card>;

export interface ProjectCardProps extends Omit<CardRootProps, "children"> {
  src?: string | StaticImageData;
  title: string;
  description: string;
  technologies: string[];
  githubLink?: string;
  liveDemoLink?: string;
  category?: string;
  year?: string;
}

/**
 * @param src - Image source URL
 * @param title - Project title
 * @param description - Project description
 * @param technologies - List of technologies used
 * @param githubLink - URL to the GitHub repository
 * @param liveDemoLink - URL to the live demo
 * @returns A styled project card component
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
  className,
  ...props
}: Readonly<ProjectCardProps>) {
  return (
    <Card
      {...props}
      className={cn(
        "group relative h-full overflow-hidden border border-border/60 bg-card/70 backdrop-blur transition-transform duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-xl",
        className
      )}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/70 via-secondary/60 to-primary/70 opacity-75" />

      {src ? (
        <div className="relative mx-6 mt-6 overflow-hidden rounded-lg bg-muted/60 shadow-inner">
          <div className="relative aspect-16/10 w-full">
            <Image
              src={src ?? "/window.svg"}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
        </div>
      ) : (
        <div className="mx-6 mt-6 flex aspect-16/10 items-center justify-center rounded-lg bg-muted/60">
          <span className="text-sm font-medium text-muted-foreground">Preview coming soon</span>
        </div>
      )}

      <CardHeader className="gap-4">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {category && <span>{category}</span>}
          {year && <span>{year}</span>}
        </div>
        <div className="space-y-2">
          <CardTitle className="text-balance text-2xl font-semibold text-foreground">
            {title}
          </CardTitle>
          <CardDescription className="text-base leading-relaxed text-muted-foreground">
            {description}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Each
            of={technologies}
            render={(tech) => (
              <Badge key={tech} variant="outline" className="border-border/60 bg-background/40 text-xs">
                {tech}
              </Badge>
            )}
          />
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2 border-t border-border/60 bg-background/40 py-6 sm:flex-row">
        {githubLink && (
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link href={githubLink} target="_blank" rel="noopener noreferrer">
              <DynamicIcon name="github" className="size-4" />
              Repository
            </Link>
          </Button>
        )}
        {liveDemoLink && (
          <Button size="sm" asChild className="flex-1">
            <Link href={liveDemoLink} target="_blank" rel="noopener noreferrer">
              <DynamicIcon name="external-link" className="size-4" />
              Live Preview
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

/**
 * I don't put comments that much, but I guess it's helpful for you to understand the code structure and purpose.
 * If this no longer works in the future, I will f*ck you up. Just kidding, but seriously, please fix it.
 * Seriously, I am speaking in behalf of future me. Kiss my a** if you break this.
 */