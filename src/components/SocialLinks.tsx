import { DynamicIcon, dynamicIconImports } from "lucide-react/dynamic";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Each } from "./Each";

export type SocialLink = {
  icon: keyof typeof dynamicIconImports;
  url: string;
}

interface SocialLinksProps {
  links: SocialLink[];
  direction?: "horizontal" | "vertical";
  className?: string;
  iconSize?: number;
}

export function SocialLinks({
  links,
  direction = "horizontal",
  className,
  iconSize = 22,
  ...props
}: Readonly<SocialLinksProps>) {
  return (
    <div
      {...props}
      className={cn(
        "flex items-center justify-center gap-2",
        direction === "horizontal" ? "flex-row" : "flex-col",
        className
      )}
    >
      <Each
        of={links}
        render={(link, index) => (
          <Link
            href={link.url}
            key={index}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]"
            aria-label={`Open ${link.icon}`}
          >
            <DynamicIcon name={link.icon} size={iconSize} />
          </Link>
        )}
      />
    </div>
  )
};