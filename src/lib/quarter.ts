/** The placeholder in a content string that is replaced by the current quarter. */
export const QUARTER_TOKEN = "{quarter}";

/** The quarter a date falls in, in the date's local time, such as "Q4 2026" for November 2026. */
export function quarterLabel(date: Date): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter} ${date.getFullYear()}`;
}

/** The text with every `{quarter}` replaced by the quarter of `date`. */
export function withQuarter(text: string, date: Date): string {
  return text.replaceAll(QUARTER_TOKEN, quarterLabel(date));
}
