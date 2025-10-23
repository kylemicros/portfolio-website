"use client";

import type { DetailedHTMLProps, HTMLAttributes } from "react";
import { useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { MenuIcon } from "lucide-react";

import Logo from "@/assets/img/marlowe-logo.png";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

import { Navbar } from "./Navbar";
import { SocialLinks } from "./SocialLinks";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

type RootHeaderProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;

export function RootHeader({ className, ...props }: Readonly<RootHeaderProps>) {
  const { navLinks, socialLinks, contact, name, role } = siteConfig;
  const [isScrolled, setIsScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      {...props}
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        isScrolled ? "bg-background/30 backdrop-blur-md shadow-md" : "bg-background/70 backdrop-blur-xl",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link
          href="#home"
          className="group flex items-center gap-3 text-foreground transition-colors hover:text-primary"
        >
          <Image
            src={Logo}
            alt={name}
            className="h-8 w-auto shrink-0"
            priority
          />
          <div className="leading-tight">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-muted-foreground">
              Portfolio
            </p>
            <p className="text-base font-semibold">{name}</p>
          </div>
        </Link>

        <Navbar links={navLinks} className="hidden md:flex" />

        <div className="hidden items-center gap-3 md:flex">
          <SocialLinks links={socialLinks.slice(0, 3)} className="gap-3" />
          {contact.calendarUrl && (
            <Button variant="outline" size="sm" asChild>
              <Link href={contact.calendarUrl} target="_blank" rel="noopener noreferrer">
                Book a call
              </Link>
            </Button>
          )}
        </div>

        <div className="flex items-center md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Toggle navigation"
                className="rounded-xl border border-border/60"
              >
                <MenuIcon className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex h-full flex-col gap-0 p-0">
              <SheetHeader className="items-start gap-3 border-b border-border/60 px-6 pb-6 pt-10">
                <SheetTitle className="text-left text-lg font-semibold text-foreground">
                  {name}
                </SheetTitle>
                <p className="text-left text-sm text-muted-foreground">{role}</p>
              </SheetHeader>

              <nav className="flex flex-col gap-2 px-6 py-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-2xl border border-transparent px-4 py-3 text-base font-medium text-foreground transition-colors hover:border-border/70 hover:bg-accent"
                    onClick={(e) => {
                      e.preventDefault();
                      setOpen(false);
                      setTimeout(() => {
                        const element = document.querySelector(link.href);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }, 300);
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto flex flex-col gap-6 border-t border-border/60 px-6 py-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    Connect
                  </p>
                  <SocialLinks
                    links={socialLinks}
                    className="justify-start gap-3"
                    iconSize={24}
                  />
                </div>
                {contact.email && (
                  <Button asChild size="lg" className="justify-center">
                    <Link href={`mailto:${contact.email}`}>Say hello</Link>
                  </Button>
                )}
                {contact.calendarUrl && (
                  <Button asChild variant="outline" size="lg" className="justify-center">
                    <Link href={contact.calendarUrl} target="_blank" rel="noopener noreferrer">
                      Schedule a call
                    </Link>
                  </Button>
                )}
                <p className="text-sm text-muted-foreground">
                  {contact.availability}
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}