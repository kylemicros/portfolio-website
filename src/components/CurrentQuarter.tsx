"use client";

import { useSyncExternalStore } from "react";

import { withQuarter } from "@/lib/quarter";

interface CurrentQuarterProps {
  /** The content text, with `{quarter}` where the quarter goes. */
  text: string;
  /**
   * The text as the server rendered it, with the quarter of the build. It is what hydration
   * expects and what visitors without JavaScript keep.
   */
  serverText: string;
}

const subscribe = () => () => {};

/**
 * A line of text naming the current quarter, such as "Q4 2026". The page's HTML carries the
 * quarter of the build; once the page has hydrated, the visitor's own date replaces it.
 */
export function CurrentQuarter({ text, serverText }: Readonly<CurrentQuarterProps>) {
  return useSyncExternalStore(
    subscribe,
    () => withQuarter(text, new Date()),
    () => serverText
  );
}
