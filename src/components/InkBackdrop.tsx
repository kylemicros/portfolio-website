/**
 * Faint ink-wash stains fixed behind the page. Pure CSS gradients, no images.
 */
export function InkBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_40%_at_15%_80%,rgb(255_255_255/0.05),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_35%_55%_at_88%_18%,color-mix(in_oklab,var(--blade)_18%,transparent),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_25%_20%_at_60%_60%,rgb(255_255_255/0.03),transparent_70%)]" />
    </div>
  );
}
