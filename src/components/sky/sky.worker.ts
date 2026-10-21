import { isSkyCommand, type SkyEvent } from "./sky-messages";
import { startSky, type SkyHandle } from "./sky-renderer";

/**
 * Runs the night sky off the page's main thread, on the canvas the page hands over. The page
 * reports scroll progress, size, visibility and motion preference; the worker reports back when
 * the sky is up, or when the page should fall back to its CSS sky.
 */

let sky: SkyHandle | null = null;

const send = (event: SkyEvent) => self.postMessage(event);

self.addEventListener("message", (message: MessageEvent<unknown>) => {
  const command = message.data;
  if (!isSkyCommand(command)) return;

  switch (command.type) {
    case "start":
      sky ??= startSky(
        command.canvas,
        { width: command.width, height: command.height, progress: command.progress, reducedMotion: command.reducedMotion },
        { onReady: () => send({ type: "ready" }), onFallback: () => send({ type: "fallback" }) }
      );
      break;
    case "progress":
      sky?.setProgress(command.value);
      break;
    case "reducedMotion":
      sky?.setReducedMotion(command.value);
      break;
    case "size":
      sky?.setSize(command.width, command.height);
      break;
    case "hidden":
      sky?.setHidden(command.value);
      break;
  }
});
