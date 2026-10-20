import Link from "next/link";

import type { SectionCut } from "@/components/motion/SectionMotion";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { Button } from "@/components/ui/button";

// One cut across the top of the message, played once on load.
const CUT: SectionCut = { from: { x: -0.06, y: 0.8 }, to: { x: 1.06, y: 0.3 }, bow: 0.2, thickness: 0.8 };

export default function NotFound() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_45%_35%_at_50%_45%,color-mix(in_oklab,var(--blade)_16%,transparent),transparent_70%)]"
      />
      <SectionMotion
        cut={CUT}
        cutClassName="h-36 sm:h-44"
        className="flex w-full max-w-2xl flex-col items-center gap-6 pt-10"
      >
        <h1 className="flex flex-col items-center gap-4 font-black tracking-tight">
          <span className="text-7xl text-blade-hot sm:text-8xl">404</span>
          {" "}
          <span className="text-3xl sm:text-4xl">Page not found</span>
        </h1>
        <p className="text-pretty text-lg text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild size="lg" className="mt-2">
          <Link href="/">Back to the home page</Link>
        </Button>
      </SectionMotion>
    </main>
  );
}
