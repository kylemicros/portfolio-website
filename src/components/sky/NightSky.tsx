import { SkyLayers } from "./SkyLayers";

/**
 * The blood-moon night sky fixed behind every page. The CSS gradient (`bg-night-sky`) is the sky
 * without JavaScript or WebGL, and before the moving sky starts. It is as tall as the largest
 * viewport, so a phone's toolbar sliding away never resizes it.
 */
export function NightSky() {
  return (
    <div aria-hidden="true" className="bg-night-sky pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh overflow-hidden">
      <SkyLayers />
    </div>
  );
}
