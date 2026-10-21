import Link from "next/link";

import { linkSection } from "@/lib/current-section";
import { cn } from "@/lib/utils";

import { Each } from "./Each";
import { NavSeal } from "./NavSeal";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "./ui/navigation-menu";

import type { ComponentProps } from "react";

export type NavbarLink = {
  label: string;
  href: string;
}

interface NavbarProps extends ComponentProps<typeof NavigationMenu> {
  links: NavbarLink[];
  /** The id of the section the visitor is in (`about`): its link is marked with the seal. */
  current?: string | null;
  onLinkClick?: () => void;
}

export function Navbar({ links, current = null, onLinkClick, viewport = false, ...props }: Readonly<NavbarProps>) {
  return (
    <NavigationMenu viewport={viewport} {...props}>
      <NavigationMenuList className="gap-2">
        <Each
          of={links}
          render={(link, index) => {
            const isCurrent = current !== null && linkSection(link.href) === current;
            return (
              <NavigationMenuItem key={index}>
                {/* 3px left of the link's text, over its padding and the gap before it, so no link moves. */}
                <NavSeal on={isCurrent} className="top-1/2 -left-[7px] -translate-y-1/2" />
                {/* A click or tap leaves no grey box and no colour change behind, only the seal; the
                    keyboard's focus ring stays. Drawn over the seal, so the ring is never cut. */}
                <NavigationMenuLink
                  className={cn(
                    "relative z-[1] hover:bg-transparent focus:bg-transparent font-semibold text-sm uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground",
                    isCurrent ? "text-paper" : "focus:not-hover:text-muted-foreground"
                  )}
                  asChild
                >
                  <Link href={link.href} onClick={onLinkClick} aria-current={isCurrent ? "location" : undefined}>
                    {link.label}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            );
          }}
        />
      </NavigationMenuList>
    </NavigationMenu>
  )
}