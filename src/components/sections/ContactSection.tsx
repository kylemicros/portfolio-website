import type { ReactNode } from "react";

import { CopyEmail } from "@/components/CopyEmail";
import { CurrentQuarter } from "@/components/CurrentQuarter";
import { BriefMotion } from "@/components/motion/BriefMotion";
import { SectionHead } from "@/components/SectionHead";
import { SlabLink } from "@/components/SlabLink";
import type { ContactInfo } from "@/lib/site";
import { withQuarter } from "@/lib/quarter";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

import { SocialLinks } from "../SocialLinks";

interface ContactSectionProps {
  contact: ContactInfo;
}

// The contact box's frame: four 1px edges, each growing from the start of its line when the
// border draws on (see `BriefMotion`).
const EDGES = [
  { side: "top", className: "inset-x-0 top-0 h-px origin-left" },
  { side: "left", className: "inset-y-0 left-0 w-px origin-top" },
  { side: "right", className: "inset-y-0 right-0 w-px origin-top" },
  { side: "bottom", className: "inset-x-0 bottom-0 h-px origin-left" },
] as const;

export function ContactSection({ contact }: Readonly<ContactSectionProps>) {
  const fields: [label: string, value: ReactNode][] = [];
  if (contact.availability) {
    // The server's text carries the quarter of the build; the browser puts in the visitor's own.
    const status = (
      <CurrentQuarter text={contact.availability} serverText={withQuarter(contact.availability, new Date())} />
    );
    fields.push(["Status", status]);
  }
  fields.push(["Base", contact.location]);

  return (
    <section id="contact" className="relative border-t border-border/60" aria-labelledby="contact-heading">
      <div className="site-width flex flex-col gap-10 py-20">
        <SectionHead
          number="04"
          label="Open a brief"
          headingId="contact-heading"
          title={contact.title}
          intro={contact.intro}
        />

        <BriefMotion className="sky-shade grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
          <div className="space-y-6">
            {contact.note && (
              <p data-brief-line="" className="max-w-measure text-pretty text-base leading-relaxed text-paper/90 sm:text-lg">
                {contact.note}
              </p>
            )}
            <dl className="text-sm">
              {fields.map(([label, value]) => (
                <div
                  key={label}
                  data-brief-line=""
                  className="flex items-baseline justify-between gap-6 border-b border-dashed border-border py-2.5"
                >
                  <dt className="shrink-0 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="text-pretty text-right text-paper">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-4">
            <div className="relative px-5 pt-8 pb-6 sm:px-7">
              {EDGES.map((edge) => (
                <span
                  key={edge.side}
                  aria-hidden="true"
                  data-brief-edge={edge.side}
                  className={cn("pointer-events-none absolute bg-paper", edge.className)}
                />
              ))}
              {/* Sits on the top edge, covering it. */}
              <p className="absolute -top-2 left-4 bg-background px-2 font-mono text-[0.7rem] leading-4 uppercase tracking-[0.2em] text-paper">
                Ready when you are
              </p>

              <CopyEmail email={contact.email} />

              <div className="mt-7 flex flex-wrap gap-4">
                {contact.calendarUrl && (
                  <SlabLink href={contact.calendarUrl} target="_blank" rel="noopener noreferrer">
                    Book a strategy call
                  </SlabLink>
                )}
                <SlabLink href={`mailto:${contact.email}`} variant="outline">
                  Send an email
                </SlabLink>
              </div>

              {/* The icons load after the page, so the row's height is kept for them from the start. */}
              <SocialLinks links={siteConfig.socialLinks} className="mt-6 min-h-10 justify-start gap-3" iconSize={22} />
            </div>

            {contact.signoff && (
              <p className="max-w-measure text-pretty text-sm leading-relaxed text-muted-foreground">{contact.signoff}</p>
            )}
          </div>
        </BriefMotion>
      </div>
    </section>
  );
}
