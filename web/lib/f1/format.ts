/** "1:32.274" from 92.274 seconds; null for no time. */
export function lapTime(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return null;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, "0")}`;
}

/** "United States Grand Prix" → "United States". */
export function shortGp(name: string): string {
  return name.replace(" Grand Prix", "");
}
