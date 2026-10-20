import type { CSSProperties } from "react";

import Image from "next/image";
import Link from "next/link";
import { DynamicIcon } from "lucide-react/dynamic";

import { HeroMotion } from "@/components/motion/HeroMotion";
import { KanjiNightRaid } from "@/components/motion/KanjiNightRaid";
import { siteConfig } from "@/lib/site";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

// A ragged ink-brush outline (4:5, like the portrait). It is a data URI, so it is set as an
// inline style rather than a class; Tailwind handles the mask size and repeat.
const BRUSH_SHAPE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 125" preserveAspectRatio="none">' +
  '<path d="M5 6C15 2 26 5 38 3C52 1 63 4.5 76 2.5C86 1 93 3 97 5.5C99 20 96.5 34 98.5 48C100 64 97 80 99 95C100 106 97.5 115 96 121.5C84 124 70 121 56 123.5C42 125 28 121.5 15 123C9 124 5 122 3 119.5C1 104 4 90 2 75C0 58 3 42 1 27C0 17 2.5 10 5 6Z"/>' +
  "</svg>";
const BRUSH_MASK = `url("data:image/svg+xml,${encodeURIComponent(BRUSH_SHAPE)}")`;
const brushMaskStyle: CSSProperties = { maskImage: BRUSH_MASK, WebkitMaskImage: BRUSH_MASK };

/** The title with its emphasis in red, when the emphasis really is part of the title. */
function renderTitle(title: string, emphasis?: string) {
  const index = emphasis ? title.indexOf(emphasis) : -1;
  if (!emphasis || index < 0) return title;

  return (
    <>
      {title.slice(0, index)}
      <em className="not-italic text-blade-hot">{emphasis}</em>
      {title.slice(index + emphasis.length)}
    </>
  );
}

export function HeroSection() {
  const { hero } = siteConfig;

  return (
    <section
      id="home"
      className="relative overflow-hidden"
      aria-labelledby="hero-heading"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_40%_at_72%_38%,color-mix(in_oklab,var(--blade)_20%,transparent),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_35%_28%_at_12%_78%,color-mix(in_oklab,var(--blade)_12%,transparent),transparent_70%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-20 pt-12 sm:gap-12 sm:pt-14 md:gap-14 lg:flex-row lg:items-center lg:gap-24 lg:pt-18 xl:pt-20">
        <KanjiNightRaid className="pointer-events-none absolute right-6 top-12 hidden min-[480px]:block sm:top-14 lg:right-auto lg:left-1/2 lg:top-18 lg:-translate-x-1/2 xl:top-20" />

        <HeroMotion className="flex-1" kanjiSelector="[data-hero-kanji]">
          <div className="space-y-10">
            <Badge className="rounded-full border-blade/60 bg-blade/15 px-3 py-1 text-xs uppercase tracking-[0.4em] text-paper">
              {hero.eyebrow}
            </Badge>

            <div className="space-y-6">
              <h1
                id="hero-heading"
                className="text-balance text-4xl font-black leading-tight tracking-tight min-[480px]:max-lg:pr-20 sm:text-5xl lg:text-6xl"
              >
                {renderTitle(hero.title, hero.titleEmphasis)}
              </h1>
              <p className="text-pretty text-lg text-paper/90 sm:text-xl">
                {hero.subtitle}
              </p>
              <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                {hero.description}
              </p>
            </div>

            <div data-hero-actions="" className="flex flex-wrap items-center gap-3">
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
          </div>
        </HeroMotion>

        <div className="flex flex-1 items-center justify-center lg:justify-end">
          <div className="relative w-full max-w-sm">
            <div className="absolute -left-10 top-10 hidden h-32 w-32 rounded-full bg-secondary/20 blur-3xl lg:block" />
            <div className="absolute -right-6 -bottom-12 hidden h-40 w-40 rounded-full bg-primary/20 blur-3xl lg:block" />
            {/* The red layer shows as a thin edge around the masked portrait. */}
            <div
              data-hero-portrait=""
              className="relative bg-blade p-[3px] mask-size-[100%_100%] mask-no-repeat"
              style={brushMaskStyle}
            >
              <div
                className="relative overflow-hidden bg-background mask-size-[100%_100%] mask-no-repeat"
                style={brushMaskStyle}
              >
                <Image
                  src={hero.portrait ?? "/assets/img/me.jpg"}
                  alt={hero.portraitAlt}
                  width={640}
                  height={800}
                  className="h-full w-full object-cover"
                  priority
                />
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-background/85 via-background/30 to-transparent p-6 pb-8 backdrop-blur-sm">
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
      </div>
    </section>
  );
}
