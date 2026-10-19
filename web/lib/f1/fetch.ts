/**
 * One GET against a public F1 API, through Next's data cache.
 *
 * Every page under `(site)` is dynamic (the nav reads the session cookie), so
 * an uncached fetch here would hit Jolpica or OpenF1 on every view — and
 * OpenF1's free tier allows thirty requests a minute. `next.revalidate` puts
 * each URL in the shared data cache instead: one upstream call per URL per
 * window, however many people are reading.
 *
 * Only a 200 is cached (Next's own rule), so a failure is retried on the next
 * view rather than served for the whole window. The timeout is there because
 * Jolpica is occasionally slow rather than down, and a page that hangs is
 * worse than a page that says the data is late.
 *
 * A 429 is waited out twice before giving up. Both APIs rate-limit per second
 * (Jolpica 4, OpenF1 3), and a page that fans out on a cold cache can trip
 * that on its own; a cache hit never reaches this code path's retry at all.
 */
export async function getJson<T>(url: string, revalidate: number): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 429 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    return (await res.json()) as T;
  }
}

/** Cache windows, in seconds. */
export const FRESH = {
  /** Anything that can still change this weekend: results, standings. */
  live: 300,
  /** The calendar, which moves a few times a season. */
  calendar: 3600,
  /** A classification more than a few days old — corrections are done. */
  settled: 86_400,
} as const;
