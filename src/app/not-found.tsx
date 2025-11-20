"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <h1 className="mb-4 text-6xl font-bold">404 - Not Found</h1>
      <p className="text-lg text-muted-foreground">
        Oops! The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Button className="cursor-pointer mt-6" onClick={() => router.push("/")}>
        Go back to Home
      </Button>
    </main>
  );
}
