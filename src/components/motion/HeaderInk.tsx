"use client";

import type { ComponentProps } from "react";
import { useEffect, useRef } from "react";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

// Without JavaScript the scroll states never switch on, so the header keeps the ink backdrop all
// the time and content never shows through it.
const NO_SCRIPT_HEADER =
  "[data-site-header]{background-color:color-mix(in oklab,var(--background) 80%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}";

interface HeaderInkProps extends ComponentProps<"header"> {
  /** The section the header stays transparent over. Pages without it get the ink header. */
  heroSelector?: string;
}

/**
 * The site header's frame. It is transparent while the page sits at the top, takes a dark,
 * blurred backdrop as soon as content scrolls beneath it (so the hero's large text never shows
 * through the links), and gains a thin blade-red underline once the hero has scrolled past.
 * The states are `data-lifted` and `data-ink` attributes, so scrolling never re-renders the header.
 */
export function HeaderInk({ heroSelector = "#home", className, children, ...props }: Readonly<HeaderInkProps>) {
  const headerRef = useRef<HTMLElement>(null);
  // The header lives in the root layout, so it is set up again on each route change: the new
  // page may or may not have the hero.
  const pathname = usePathname();

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const setFlag = (name: "lifted" | "ink", on: boolean) => {
      if (on) header.dataset[name] = "";
      else delete header.dataset[name];
    };

    const onScroll = () => setFlag("lifted", window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const hero = document.querySelector(heroSelector);
    // The hero counts as gone once its bottom edge has passed under the header.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setFlag("ink", !entry.isIntersecting);
      },
      { rootMargin: `-${header.offsetHeight}px 0px 0px 0px` }
    );
    if (hero) observer.observe(hero);
    else setFlag("ink", true);

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
      setFlag("lifted", false);
      setFlag("ink", false);
    };
  }, [heroSelector, pathname]);

  return (
    <header
      {...props}
      ref={headerRef}
      data-site-header=""
      className={cn(
        "border-b border-transparent bg-transparent transition-[background-color,border-color,backdrop-filter] duration-300 data-ink:border-blade/70 data-ink:bg-background/80 data-ink:backdrop-blur-md data-lifted:bg-background/80 data-lifted:backdrop-blur-md",
        className
      )}
    >
      <noscript>
        <style>{NO_SCRIPT_HEADER}</style>
      </noscript>
      {children}
    </header>
  );
}
