import { ToolkitDecode } from "@/components/motion/ToolkitDecode";
import type { SkillGroup } from "@/lib/site";
import { spriteHref, TECH_ICONS } from "@/lib/tech-icons";
import { cn } from "@/lib/utils";

interface ToolkitProps {
  groups: SkillGroup[];
  className?: string;
}

/**
 * The skills in their groups, each with a one-colour mark from the sprite. Each label is in the
 * markup twice: a hidden copy for assistive technology, which always holds the real text, and the
 * visible copy, which the decode effect scrambles for a moment as the toolkit comes into view.
 */
export function Toolkit({ groups, className }: Readonly<ToolkitProps>) {
  return (
    <ToolkitDecode
      className={cn("grid border border-border sm:grid-cols-2 lg:grid-cols-3", className)}
    >
      {groups.map((group) => (
        // The cells draw the grid's inner lines: each cell has a bottom and right line, and the
        // outer frame hides the ones on the edges.
        <div key={group.label} className="-mb-px -mr-px border-b border-r border-border p-4">
          <h3 className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {group.label}
          </h3>
          <ul className="mt-3 grid gap-2">
            {group.skills.map((skill) => (
              <li key={skill} className="flex items-center gap-2.5 text-sm text-paper transition-colors hover:text-blade-hot">
                <svg aria-hidden="true" focusable="false" className="size-4 shrink-0 fill-current">
                  <use href={spriteHref(TECH_ICONS[skill])} />
                </svg>
                <span className="sr-only">{skill}</span>
                <span aria-hidden="true" data-decode="" className="whitespace-nowrap">
                  {skill}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </ToolkitDecode>
  );
}
