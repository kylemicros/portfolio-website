import { Badge } from "./ui/badge";

interface TechTagsProps {
  technologies: string[];
}

/** A list of technologies as small outlined tags, as shown on record cards and case files. */
export function TechTags({ technologies }: Readonly<TechTagsProps>) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {technologies.map((tech) => (
        <li key={tech}>
          <Badge variant="outline" className="border-border/80 text-[0.7rem] font-normal text-paper/85">
            {tech}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
