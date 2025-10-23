import Link from "next/link";

import { Each } from "./Each";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "./ui/navigation-menu";

import type { ComponentProps } from "react";

export type NavbarLink = {
  label: string;
  href: string;
}

interface NavbarProps extends ComponentProps<typeof NavigationMenu> {
  links: NavbarLink[];
  onLinkClick?: () => void;
}

export function Navbar({ links, onLinkClick, viewport = false, ...props }: Readonly<NavbarProps>) {
  return (
    <NavigationMenu viewport={viewport} {...props}>
      <NavigationMenuList className="gap-2">
        <Each
          of={links}
          render={(link, index) => (
            <NavigationMenuItem key={index}>
              <NavigationMenuLink className="hover:bg-transparent font-semibold text-sm uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground" asChild>
                <Link href={link.href} onClick={onLinkClick}>
                  {link.label}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          )}
        />
      </NavigationMenuList>
    </NavigationMenu>
  )
}