"use client";

import type { ReactNode } from "react";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";

import { FolderOpenIcon, XIcon } from "lucide-react";

import type { Flip } from "gsap/Flip";

import { gsap, loadFlip, MOTION_OK } from "@/lib/gsap";
import { cn } from "@/lib/utils";

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";

interface FileDialogProps {
  /** The dialog's title. It also names the dialog for assistive technology. */
  title: ReactNode;
  /** A short line under the title, such as the dates. */
  description?: ReactNode;
  /** The trigger's visible label. */
  triggerLabel: string;
  /** Read after the label by assistive technology, so each trigger names its file. */
  triggerContext: string;
  /**
   * The picture shown in the open file. Its root carries a `data-flip-id`, and the card's own copy
   * (the `[data-file-media]` inside the same `[data-file]` element) carries the same one: the
   * picture grows from the card into the file, and back.
   */
  media: ReactNode;
  /** The file's content. It is in the page's HTML too, inside a disclosure, until script runs. */
  children: ReactNode;
  /**
   * A row to open the file from, such as a line of an index. When given, the whole row is the
   * trigger: one button laid over it, named by the label and context, with the label shown at the
   * row's end. Without script the row is the disclosure's summary.
   */
  row?: ReactNode;
  /** Classes for the row, when there is one. */
  rowClassName?: string;
  /** Classes for the visible label: the trigger itself, or the label at the end of a row. */
  triggerClassName?: string;
  /**
   * `stack` (default): the picture beside the title. `split`: the picture fills a column on the
   * left of a wider file, for screenshots; above the content on phones.
   */
  layout?: "stack" | "split";
  className?: string;
}

const FLIP = { duration: 0.45, ease: "power3.inOut" };

const subscribe = () => () => {};
/** False on the server and during hydration, true afterwards. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

const TRIGGER_LOOK =
  "inline-flex w-fit items-center gap-2 border border-border px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.15em] text-paper transition-colors";
const TRIGGER = cn(
  TRIGGER_LOOK,
  "cursor-pointer hover:border-blade-hot hover:text-blade-hot focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
);
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring";

/** Whether an element is on screen as a picture to grow from: laid out, visible and not faded out. */
function isShown(element: HTMLElement): boolean {
  const box = element.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return false;
  const style = getComputedStyle(element);
  return style.visibility !== "hidden" && Number.parseFloat(style.opacity) > 0;
}

/**
 * An open file: a modal dialog (focus kept inside, Escape closes it, focus goes back to the
 * trigger) with a picture, a title, a line of meta and the content. Full screen below `md`.
 * When motion is allowed the picture grows out of the card into the file, and back on close.
 * Before script runs (and without JavaScript) the trigger is a `<details>` disclosure holding the
 * same content, so the page's HTML always carries it.
 */
export function FileDialog({
  title,
  description,
  triggerLabel,
  triggerContext,
  media,
  children,
  row,
  rowClassName,
  triggerClassName,
  layout = "stack",
  className,
}: Readonly<FileDialogProps>) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openMediaRef = useRef<HTMLElement | null>(null);
  // The card picture's position, taken just before opening, for the picture to grow from.
  const pendingRef = useRef<Flip.FlipState | null>(null);
  // Flip loads when a pointer or keyboard focus first reaches the trigger, so it is never part of
  // the page's first load. A file opened before it has loaded simply opens at once.
  const flipRef = useRef<typeof Flip | null>(null);
  const prepareFlip = () => {
    if (flipRef.current || !window.matchMedia(MOTION_OK).matches) return;
    void loadFlip().then((plugin) => {
      flipRef.current = plugin;
    });
  };

  const cardMedia = useCallback((): HTMLElement | null => {
    const media = triggerRef.current?.closest("[data-file]")?.querySelector("[data-file-media]");
    return media instanceof HTMLElement ? media : null;
  }, []);

  // The picture to grow from: the card's own copy when it is on screen, otherwise a stand-in on
  // screen with the same `data-flip-id` (such as a hover preview), otherwise none.
  const sourceMedia = useCallback((): HTMLElement | null => {
    const card = cardMedia();
    if (!card) return null;
    if (isShown(card)) return card;
    const id = card.dataset.flipId;
    if (!id) return null;
    const standIn = document.querySelector(`[data-file-stand-in][data-flip-id="${CSS.escape(id)}"]`);
    return standIn instanceof HTMLElement && isShown(standIn) ? standIn : null;
  }, [cardMedia]);

  const motionOk = () => window.matchMedia(MOTION_OK).matches;

  const onOpenChange = (next: boolean) => {
    const Flip = motionOk() ? flipRef.current : null;
    if (next) {
      const from = sourceMedia();
      pendingRef.current = Flip && from ? Flip.getState(from) : null;
      setOpen(true);
      return;
    }

    // Closing: the card picture grows back from where the file's picture is now, when the card
    // picture is on screen. The dialog goes at once (no exit animation), so only the picture travels.
    const openMedia = openMediaRef.current;
    const card = cardMedia();
    const to = card && isShown(card) ? card : null;
    const state = Flip && openMedia && to ? Flip.getState(openMedia) : null;
    setOpen(false);
    if (Flip && state && to) {
      requestAnimationFrame(() => {
        Flip.from(state, { targets: to, ...FLIP, scale: true });
      });
    }
  };

  // Runs when the file's content is attached, once the dialog has rendered in place.
  const attachFile = useCallback((node: HTMLDivElement | null) => {
    const media = node?.querySelector("[data-flip-id]");
    openMediaRef.current = media instanceof HTMLElement ? media : null;
    const state = pendingRef.current;
    pendingRef.current = null;
    const Flip = flipRef.current;
    if (!node || !window.matchMedia(MOTION_OK).matches) return;

    if (!state || !Flip || !openMediaRef.current) {
      // Nothing on screen to grow from (or Flip has not loaded yet): the file fades and scales in.
      const content = node.closest("[data-slot='dialog-content']") ?? node;
      gsap.fromTo(content, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.25, ease: "power2.out", clearProps: "opacity,transform" });
      return;
    }

    Flip.from(state, { targets: openMediaRef.current, ...FLIP, scale: true });
    const body = node.querySelector("[data-file-body]");
    if (body) {
      gsap.fromTo(body, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, delay: 0.15, ease: "power2.out", clearProps: "opacity,transform" });
    }
  }, []);

  const icon = <FolderOpenIcon aria-hidden="true" className="size-3.5" />;
  const label = (
    <>
      {icon}
      {triggerLabel}
      <span className="sr-only">: {triggerContext}</span>
    </>
  );
  const split = layout === "split";

  if (!hydrated) {
    return (
      <details className={className}>
        {row === undefined ? (
          <summary className={cn(TRIGGER, triggerClassName, "list-none [&::-webkit-details-marker]:hidden")}>{label}</summary>
        ) : (
          <summary className={cn("cursor-pointer list-none [&::-webkit-details-marker]:hidden", FOCUS_RING, rowClassName)}>
            {row}
            <span className={cn(TRIGGER_LOOK, triggerClassName)}>{label}</span>
          </summary>
        )}
        <div className={cn("mt-5 space-y-5 border-t border-border pt-5", split && "sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-start sm:gap-6 sm:space-y-0")}>
          {split && media}
          <div className="space-y-5">
            {description && <p className="font-mono text-xs text-blade-hot">{description}</p>}
            {children}
          </div>
        </div>
      </details>
    );
  }

  const trigger =
    row === undefined ? (
      <DialogTrigger
        ref={triggerRef}
        className={cn(TRIGGER, triggerClassName, className)}
        onPointerEnter={prepareFlip}
        onFocus={prepareFlip}
      >
        {label}
      </DialogTrigger>
    ) : (
      // One button laid over the whole row, so the row is a single stop for the keyboard and a
      // single target for a pointer. Its name is the label and the context; the label is also
      // shown at the row's end.
      <div className={cn("relative", rowClassName, className)}>
        {row}
        <span aria-hidden="true" className={cn(TRIGGER_LOOK, triggerClassName)}>
          {icon}
          {triggerLabel}
        </span>
        <DialogTrigger
          ref={triggerRef}
          className={cn("absolute inset-0 z-10 cursor-pointer", FOCUS_RING)}
          onPointerEnter={prepareFlip}
          onFocus={prepareFlip}
        >
          <span className="sr-only">
            {triggerLabel}: {triggerContext}
          </span>
        </DialogTrigger>
      </div>
    );

  const heading = (
    <>
      <DialogTitle className="text-2xl leading-tight font-black sm:text-3xl">{title}</DialogTitle>
      {description && (
        <DialogDescription className="font-mono text-xs text-blade-hot">{description}</DialogDescription>
      )}
    </>
  );

  // The flipped element is matched by its `data-flip-id`; both copies of the picture carry it.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      {/* Radix hides the rest of the page from assistive technology; `aria-modal` says so too. */}
      <DialogContent
        aria-modal="true"
        showCloseButton={false}
        overlayClassName="bg-background/85 backdrop-blur-sm motion-reduce:animate-none"
        className={cn(
          // Full screen on phones, a centred file from `md`.
          "inset-0 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-y-auto rounded-none border-0 bg-ink-raised p-0 shadow-2xl sm:max-w-none",
          "md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:max-h-[85vh] md:max-w-2xl md:-translate-x-1/2 md:-translate-y-1/2 md:border md:border-border",
          split && "md:max-w-4xl",
          // The picture and the content are animated by script instead.
          "data-[state=open]:animate-none data-[state=closed]:animate-none"
        )}
      >
        <div className="flex items-center justify-end border-b border-border px-5 py-3 md:px-8">
          <DialogClose className="inline-flex items-center gap-2 border border-border px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:border-blade-hot hover:text-blade-hot focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
            <XIcon aria-hidden="true" className="size-3.5" />
            Close
          </DialogClose>
        </div>

        {split ? (
          // The picture on the left (on top on phones), the meta, title and content beside it.
          <div ref={attachFile} className="grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="md:border-r md:border-border">{media}</div>
            <div className="min-w-0 space-y-6 p-5 md:p-8">
              <div className="flex flex-col-reverse gap-2">{heading}</div>
              <div data-file-body="" className="space-y-6">
                {children}
              </div>
            </div>
          </div>
        ) : (
          <div ref={attachFile} className="space-y-6 p-5 md:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="w-fit shrink-0">{media}</div>
              <div className="min-w-0 space-y-2">{heading}</div>
            </div>

            <div data-file-body="" className="space-y-6">
              {children}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
