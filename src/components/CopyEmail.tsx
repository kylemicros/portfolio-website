"use client";

import { useEffect, useRef, useState } from "react";

import { CopyIcon } from "lucide-react";

import { Stamp } from "@/components/Stamp";
import { cn } from "@/lib/utils";

interface CopyEmailProps {
  email: string;
  className?: string;
}

// How long the "Copied" stamp stays, in milliseconds.
const SHOWN_FOR = 1500;
// Without JavaScript the button could do nothing, so it is not shown; the address stays selectable.
const NO_SCRIPT_BUTTON = "[data-copy-email]{display:none}";

/**
 * The email address in large serif type, with a button that copies it. A copy shows a small
 * "Copied" stamp for a moment and is announced politely. Where the clipboard cannot be used
 * (an insecure page, a denied permission, an older browser), the address is selected instead,
 * ready to copy by hand.
 */
export function CopyEmail({ email, className }: Readonly<CopyEmailProps>) {
  const addressRef = useRef<HTMLParagraphElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const at = email.indexOf("@");

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const selectAddress = () => {
    const address = addressRef.current;
    const selection = window.getSelection();
    if (!address || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(address);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const copy = async () => {
    // Undefined outside a secure context, whatever the DOM types say.
    const clipboard: Clipboard | undefined = navigator.clipboard;
    if (!clipboard) {
      selectAddress();
      return;
    }
    try {
      await clipboard.writeText(email);
    } catch {
      selectAddress();
      return;
    }
    window.clearTimeout(timerRef.current);
    setCopied(true);
    timerRef.current = window.setTimeout(() => setCopied(false), SHOWN_FOR);
  };

  return (
    <div className={className}>
      {/* The address may break after the "@" only; breaking anywhere is the last resort on the
          narrowest phones. */}
      <p
        ref={addressRef}
        className="font-display text-[1.0625rem] leading-snug font-black wrap-anywhere text-paper min-[420px]:text-xl sm:text-2xl md:wrap-normal lg:text-xl"
      >
        {at < 0 ? (
          email
        ) : (
          <>
            {email.slice(0, at + 1)}
            <wbr />
            {email.slice(at + 1)}
          </>
        )}
      </p>
      <div className="relative mt-3 inline-flex items-center">
        <button
          type="button"
          data-copy-email=""
          onClick={() => void copy()}
          className="inline-flex items-center gap-2 border border-border px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:border-blade-hot hover:text-blade-hot focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <CopyIcon aria-hidden="true" className="size-3.5" />
          Copy email
        </button>
        <noscript>
          <style>{NO_SCRIPT_BUTTON}</style>
        </noscript>
        {/* Beside the button, out of the flow, so showing it moves nothing. */}
        <Stamp
          className={cn(
            "absolute top-1/2 left-full ml-3 -translate-y-1/2 -rotate-6 px-2 py-0.5 text-xs",
            copied ? "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-150 motion-safe:duration-200" : "hidden"
          )}
        >
          Copied
        </Stamp>
        <span role="status" className="sr-only">
          {copied ? "Email address copied" : ""}
        </span>
      </div>
    </div>
  );
}
