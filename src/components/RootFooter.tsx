import Link from "next/link";
import Image from "next/image";

import Logo from "@/assets/img/marlowe-logo.png";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

import { SocialLinks } from "./SocialLinks";
import { Separator } from "./ui/separator";

export function RootFooter({ className }: Readonly<{ className?: string }>) {
  const { name, role, navLinks, socialLinks, contact } = siteConfig;
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "relative border-t border-border/60 bg-background",
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-border/70" />

      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="space-y-6 lg:col-span-2">
            <div className="flex items-center gap-3">
              <Image
                src={Logo}
                alt={name}
                width={56}
                height={56}
                className="h-11 w-auto shrink-0"
              />
              <div className="leading-tight">
                <p className="text-base font-semibold text-foreground">{name}</p>
                <p className="text-sm text-muted-foreground">{role}</p>
              </div>
            </div>
            <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
              Building dependable healthcare, fintech, and platform experiences with teams that value thoughtful engineering and sustainable delivery.
            </p>
            <SocialLinks
              links={socialLinks}
              className="justify-start gap-3"
              iconSize={20}
            />
          </div>

          {/* Navigation Column */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Navigate
            </p>
            <nav className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact Column */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Connect
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href={`mailto:${contact.email}`}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {contact.email}
              </Link>
              <p className="text-sm text-muted-foreground">
                {contact.location}
              </p>
              {contact.calendarUrl && (
                <Link
                  href={contact.calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary transition-colors hover:text-primary/80"
                >
                  Schedule a call →
                </Link>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-10 bg-border/60" />

        <div className="flex flex-col items-center justify-between gap-4 text-center text-sm text-muted-foreground sm:flex-row sm:text-left">
          <p>
            © {currentYear} {name}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="#home" className="transition-colors hover:text-foreground">
              Back to top ↑
            </Link>
            <span className="text-border/60">·</span>
            <Link
              href={siteConfig.githubProfile ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              View source
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
