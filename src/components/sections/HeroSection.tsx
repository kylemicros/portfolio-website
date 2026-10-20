import Image from "next/image";
import Link from "next/link";

import { HeroMotion } from "@/components/motion/HeroMotion";
import { KanjiNightRaid } from "@/components/motion/KanjiNightRaid";
import { Stamp } from "@/components/Stamp";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

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

/** The year of the earliest experience start, such as 2021 for "February 2021". */
function activeSince(): number | undefined {
  const years = siteConfig.experiences
    .map((experience) => Number(experience.start.match(/\d{4}/)?.[0]))
    .filter((year) => Number.isFinite(year) && year > 0);
  return years.length > 0 ? Math.min(...years) : undefined;
}

// Without JavaScript the stamp's entrance never runs, so it is shown in place.
const NO_SCRIPT_STAMP = "[data-hero-stamp]{opacity:1}";

export function HeroSection() {
  const { hero, name, role, contact } = siteConfig;
  const since = activeSince();
  const fields: [label: string, value: string][] = [
    ["Name", name],
    ["Role", role],
    ["Base", contact.location],
  ];
  if (since) fields.push(["Active", `Since ${since}`]);

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

      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 pb-20 pt-12 sm:pt-14 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-0 lg:pt-18 xl:pt-20">
        <KanjiNightRaid className="pointer-events-none absolute right-6 top-12 hidden min-[480px]:block sm:top-14 lg:top-18 xl:top-20" />

        {/* The text column comes first, so phones read it before the card. From `lg` the card
            moves to the left; the column's clip keeps the slash from reaching across it. */}
        <HeroMotion
          className="lg:col-start-2 lg:row-start-1 lg:self-center lg:pl-12 lg:[clip-path:inset(-50vh_-50vw_-50vh_0)] xl:pl-16"
          kanjiSelector="[data-hero-kanji]"
          stampSelector="[data-hero-stamp]"
        >
          <div className="space-y-8">
            <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">FILE KM-01 / PROFILE</p>

            <div className="space-y-6">
              <h1
                id="hero-heading"
                className="text-balance text-4xl font-black leading-tight tracking-tight min-[480px]:pr-20 sm:text-5xl lg:pr-24 lg:text-6xl"
              >
                {renderTitle(hero.title, hero.titleEmphasis)}
              </h1>
              <p className="max-w-2xl text-pretty text-lg text-paper/90 sm:text-xl">
                {hero.subtitle}
              </p>
              <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                {hero.description}
              </p>
            </div>

            <div data-hero-actions="" className="flex flex-wrap items-center gap-4">
              {hero.actions.map((action) => {
                const primary = (action.variant ?? "default") === "default";
                return (
                  // The box is skewed and its label skewed back, so the label stays upright.
                  // The link itself is not transformed, so the entrance can move it.
                  <Link key={action.label} href={action.href} className="group inline-block outline-none">
                    <span
                      className={cn(
                        "block -skew-x-12 border px-5 py-3 transition-colors group-focus-visible:ring-[3px] group-focus-visible:ring-ring",
                        primary
                          ? "border-blade bg-blade text-primary-foreground group-hover:border-blade-hot group-hover:bg-blade-hot"
                          : "border-paper text-paper group-hover:bg-paper/10"
                      )}
                    >
                      <span className="block skew-x-12 text-xs font-semibold uppercase tracking-[0.15em]">
                        {action.label}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </HeroMotion>

        <div className="w-full max-w-sm border border-border bg-ink-raised p-5 sm:grid sm:max-w-none sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:items-start sm:gap-6 lg:col-start-1 lg:row-start-1 lg:block lg:self-center">
          <div className="relative">
            <div className="overflow-hidden border border-border">
              <Image
                src={hero.portrait ?? "/assets/img/me.jpg"}
                alt={hero.portraitAlt}
                width={640}
                height={800}
                // The card's width less its padding: up to 344px on phones, 220px beside the
                // fields from `sm`, 260px in the left column from `lg`.
                sizes="(min-width: 1024px) 260px, (min-width: 640px) 220px, 344px"
                className="aspect-4/5 h-auto w-full object-cover grayscale-[0.3]"
                preload
              />
            </div>
            {/* Hidden until the hero's entrance lands it; shown in place with reduced motion. */}
            <Stamp
              data-hero-stamp=""
              className="absolute bottom-6 right-3 -rotate-12 opacity-0 motion-reduce:opacity-100"
            >
              WANTED
            </Stamp>
            <noscript>
              <style>{NO_SCRIPT_STAMP}</style>
            </noscript>
          </div>

          <dl className="mt-5 text-sm sm:mt-0 lg:mt-5">
            {fields.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4 border-b border-dashed border-border py-2">
                <dt className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
                <dd className="text-right text-paper">{value}</dd>
              </div>
            ))}
            <div className="pt-3">
              <dt className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Focus</dt>
              <dd className="mt-1 text-pretty text-xs leading-relaxed text-muted-foreground">{hero.portraitCaption}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
