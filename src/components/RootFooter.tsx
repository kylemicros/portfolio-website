import Link from "next/link";

import { LandingStamp } from "@/components/motion/LandingStamp";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const LINK = "transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring";

/**
 * The slim closing line of every page: the section links, the END OF FILE stamp in the middle,
 * then the copyright, Back to top, View source and the art credits. Stacked and centred on phones.
 */
export function RootFooter({ className }: Readonly<{ className?: string }>) {
  const { name, navLinks, artCredits } = siteConfig;
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn("relative", className)}>
      <div className="site-width grid items-center justify-items-center gap-6 py-8 text-sm text-muted-foreground lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:justify-items-stretch">
        <nav className="sky-shade flex flex-wrap justify-center gap-x-5 gap-y-2 lg:justify-start">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn("text-xs font-semibold uppercase tracking-[0.15em]", LINK)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <LandingStamp when="view" className="-rotate-4 px-3.5 text-sm tracking-[0.14em]">
          END OF FILE
        </LandingStamp>

        <div className="sky-shade flex flex-col items-center gap-2 text-center lg:items-end lg:text-right">
          <p>
            © {currentYear} {name}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {/* "top" scrolls to the top of whichever page this is. */}
            <Link href="#top" className={LINK}>
              Back to top
            </Link>
            <span aria-hidden="true" className="text-border/60">·</span>
            <Link
              href={siteConfig.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK}
            >
              View source
            </Link>
          </div>
          {/* The nowrap spans keep the author and the "licence, modified" tail whole, so a credit only wraps between them. */}
          {artCredits.map((credit) => (
            <p key={credit.work} className="text-xs">
              {credit.work} by{" "}
              <span className="whitespace-nowrap">
                <Link href={credit.authorUrl} target="_blank" rel="noopener noreferrer" className={cn("underline underline-offset-2", LINK)}>
                  {credit.author}
                </Link>
                ,
              </span>{" "}
              <span className="whitespace-nowrap">
                <Link href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className={cn("underline underline-offset-2", LINK)}>
                  {credit.license}
                </Link>
                {credit.modified && ", modified"}
              </span>
            </p>
          ))}
        </div>
      </div>
    </footer>
  );
}
