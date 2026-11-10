// Telling one flick of the wheel or trackpad from the next, from the wheel events alone (browsers
// do not say when a finger touches the trackpad). The rule above all: one gesture must never count
// as two, since each flick moves a section; missing a quick second flick is the lesser fault.
//
// A flick is a run of events in one direction with no quiet gap. After the finger lifts, a
// trackpad keeps sending events for seconds as its momentum dies away. A fresh swipe on that dying
// momentum makes the wheel's SPEED (px per ms) jump far above where the momentum has got to, and
// stay there. Speed, not size: when the page is busy Chrome merges several events into one,
// summing their deltas over the time they cover, so the speed stays level where the size jumps.
// The same idea as the Lethargy library. A sharp drop in speed is not used: a slowing drag looks
// the same as a finger stopping the momentum.
//
// The numbers were set on modelled wheel streams, not recordings from devices: a mouse notch and a
// burst, trackpad flicks at 60 and 120 events a second (one with a pause as the finger lifts, one
// with a fifth of jitter, one with every fourth event merged, one with two back-to-back merges of
// six), a swipe that keeps speeding up from a slow start, a slow drag with faster bumps, and second
// flicks 150 to 2500 ms into the momentum. Then, unchanged, they were checked on a second modelled
// set: merges of 3, 4 and 6 events, jitter of a half and three fifths, uneven slow drags, mouse
// spins speeding up and slowing down, a drag that stops abruptly, Windows and slow notches, and
// gentle, hard and resting second flicks. No single gesture there counts as two. A gentle second
// flick in the first 700 ms of the momentum, or a weak one at any time, is missed, and the page
// stays where the first flick took it.

/** The quiet that ends a flick, in ms: a trackpad sends an event every 8 to 16 ms, a fast mouse wheel every 20 to 80 ms. */
const QUIET_MS = 200;
/** The time an event's delta is spread over, in ms, kept within this range (a merged event covers several frames). */
const MIN_DT = 8;
const MAX_DT = 100;
/** The momentum's level: the median speed of BASE events, taken before the latest LAG, so a new swipe's own rise is not in it. */
const BASE = 6;
const LAG = 3;
/**
 * The flick has died down once its recent speed (median of the last three) has fallen to this share
 * of its highest. It stays so: a new swipe's own rise must not undo it, and a flick still speeding
 * up (its finger phase) never gets there.
 */
const DECAYED = 0.8;
/** A new swipe: this many times the momentum's level, and at least MIN_RATE px per ms, on CONFIRM events in a row. */
const RISE = 4;
const MIN_RATE = 0.75;
const CONFIRM = 2;

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
};

/**
 * Returns a function to call with each wheel event's vertical delta (px) and time (ms), in order;
 * it answers whether that event starts a new flick.
 */
export function flickStarts(): (delta: number, time: number) => boolean {
  let last = Number.NEGATIVE_INFINITY;
  let direction = 0;
  // The current flick's speeds, oldest first, its highest smoothed speed, whether it has died down,
  // and how many events in a row have looked like a new swipe.
  let rates: number[] = [];
  let peak = 0;
  let decayed = false;
  let rising = 0;

  return (delta, time) => {
    const way = Math.sign(delta);
    const dt = time - last;
    const rate = Math.abs(delta) / Math.min(MAX_DT, Math.max(MIN_DT, dt));
    let fresh = dt > QUIET_MS || way !== direction;

    if (!fresh && rates.length >= BASE + LAG) {
      const level = median(rates.slice(-(BASE + LAG), -LAG));
      rising = decayed && rate >= MIN_RATE && rate >= level * RISE ? rising + 1 : 0;
      if (rising >= CONFIRM) fresh = true;
    }

    last = time;
    direction = way;
    if (fresh) {
      rates = [];
      peak = 0;
      decayed = false;
      rising = 0;
    }
    rates.push(rate);
    if (rates.length > BASE + LAG) rates.shift();
    if (rates.length >= LAG) {
      const recent = median(rates.slice(-LAG));
      peak = Math.max(peak, recent);
      if (recent <= peak * DECAYED) decayed = true;
    }
    return fresh;
  };
}
