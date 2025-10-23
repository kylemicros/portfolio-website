import Image from "next/image";
import Link from "next/link";
import { DynamicIcon } from "lucide-react/dynamic";

import { siteConfig } from "@/lib/site";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export function HeroSection() {
  const { hero, socialLinks, location } = siteConfig;

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-background"
      aria-labelledby="hero-heading"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-20%] h-128 w-lg -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-30%] right-[-10%] h-112 w-md rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-20 pt-12 sm:gap-12 sm:pt-14 md:gap-14 lg:flex-row lg:items-center lg:gap-20 lg:pt-18 xl:pt-20">
        <div className="flex-1 space-y-10">
          <Badge className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.4em] text-primary-foreground">
            {hero.eyebrow}
          </Badge>

          <div className="space-y-6">
            <h1 id="hero-heading" className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {hero.title}
            </h1>
            <p className="text-pretty text-lg text-muted-foreground sm:text-xl">
              {hero.subtitle}
            </p>
            <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground/90 sm:text-lg">
              {hero.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hero.actions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant ?? "default"}
                size="lg"
                asChild
                className="gap-2"
              >
                <Link href={action.href}>
                  <DynamicIcon name={action.icon} className="size-4" />
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>

          <div className="grid gap-4 min-[480px]:grid-cols-3">
            {hero.highlights.map((highlight) => (
              <div
                key={highlight.label}
                className="rounded-2xl border border-border/60 bg-card/70 p-4 text-center shadow-sm backdrop-blur"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  {highlight.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{highlight.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="rounded-full border border-border/60 px-3 py-1 text-xs uppercase tracking-[0.3em]">
              {location}
            </span>
            <div className="flex items-center gap-2 text-muted-foreground">
              {socialLinks.slice(0, 3).map((link) => (
                <Button
                  key={link.url}
                  variant="ghost"
                  size="icon-sm"
                  asChild
                  className="rounded-full border border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                  aria-label={`Navigate to ${link.icon}`}
                >
                  <Link href={link.url} target="_blank" rel="noopener noreferrer">
                    <DynamicIcon name={link.icon} className="size-4" />
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center lg:justify-end">
          <div className="relative w-full max-w-sm">
            <div className="absolute -left-10 top-10 hidden h-32 w-32 rounded-full bg-secondary/20 blur-3xl lg:block" />
            <div className="absolute -right-6 -bottom-12 hidden h-40 w-40 rounded-full bg-primary/20 blur-3xl lg:block" />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-border/70 bg-background/80 shadow-2xl">
              <Image
                src={hero.portrait ?? "/assets/img/me.jpg"}
                alt={hero.portraitAlt}
                width={640}
                height={800}
                className="h-full w-full object-cover"
                priority
              />
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-background/85 via-background/30 to-transparent p-6 backdrop-blur-sm">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-foreground">
                  {siteConfig.role}
                </span>
                <p className="mt-3 text-sm text-primary-foreground">
                  Focused on dependable healthcare, fintech, and platform experiences.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
