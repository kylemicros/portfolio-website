import Link from "next/link";
import { DynamicIcon, dynamicIconImports } from "lucide-react/dynamic";

import type { ContactInfo } from "@/lib/site";
import { siteConfig } from "@/lib/site";

import { SocialLinks } from "../SocialLinks";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

interface ContactSectionProps {
  contact: ContactInfo;
}

export function ContactSection({ contact }: Readonly<ContactSectionProps>) {
  return (
    <section
      id="contact"
      className="relative border-t border-border/60 bg-linear-to-b from-background via-background/60 to-primary/5"
      aria-labelledby="contact-heading"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-20 text-center">
        <div className="space-y-4">
          <Badge variant="outline" className="mx-auto rounded-full px-3 py-1 text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Contact
          </Badge>
          <h2 id="contact-heading" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Let’s shape your next product milestone
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            I collaborate with teams who value strong design partnerships, clear communication, and a culture of experimentation. Tell me about your goals and we’ll explore how to reach them together.
          </p>
        </div>

        <Card className="mx-auto max-w-2xl border border-border/60 bg-card/75 shadow-lg backdrop-blur">
          <CardHeader className="gap-3">
            <CardTitle className="text-2xl font-semibold">Ready when you are</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {contact.note}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoChip icon="map-pin" label="Based in" value={contact.location} />
              {contact.availability && (
                <InfoChip label="Availability" value={contact.availability} />
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href={`mailto:${contact.email}`}>
                  <DynamicIcon name="mail" className="size-4" />
                  Email me
                </Link>
              </Button>
              {contact.calendarUrl && (
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link href={contact.calendarUrl} target="_blank" rel="noopener noreferrer">
                    <DynamicIcon name="calendar" className="size-4" />
                    Book a call
                  </Link>
                </Button>
              )}
            </div>

            <div className="pt-4">
              <SocialLinks links={siteConfig.socialLinks} className="justify-center gap-4" iconSize={24} />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

type IconName = keyof typeof dynamicIconImports;

interface InfoChipProps {
  icon?: IconName;
  label: string;
  value: string;
}

function InfoChip({ icon, label, value }: Readonly<InfoChipProps>) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-background/60 p-4 text-center">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {icon && <DynamicIcon name={icon} className="size-4" />}
        <span className="uppercase tracking-[0.3em] text-[0.65rem]">{label}</span>
      </div>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
