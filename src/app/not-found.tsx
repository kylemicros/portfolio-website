import Link from "next/link";

import { LandingStamp } from "@/components/motion/LandingStamp";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    // Clipped sideways: the stamp starts large as it lands, and must not widen a narrow screen.
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-x-clip px-6 py-24 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_45%_35%_at_50%_45%,color-mix(in_oklab,var(--blade)_16%,transparent),transparent_70%)]"
      />
      <div className="flex w-full max-w-2xl flex-col items-center gap-6 pt-10">
        <div className="relative">
          <h1 className="flex flex-col items-center gap-4 font-black tracking-tight">
            <span className="text-7xl text-blade-hot sm:text-8xl">404</span>
            {" "}
            <span className="text-3xl sm:text-4xl">Page not found</span>
          </h1>
          {/* Pressed across the number, after the page loads. */}
          <div className="pointer-events-none absolute inset-x-0 top-11 flex justify-center sm:top-15">
            <LandingStamp when="load" className="-rotate-8 whitespace-nowrap px-3 text-lg sm:text-xl">
              FILE NOT FOUND
            </LandingStamp>
          </div>
        </div>
        <p className="text-pretty text-lg text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild size="lg" className="mt-2">
          <Link href="/">Back to the home page</Link>
        </Button>
      </div>
    </main>
  );
}
