"use client";

import { useEffect } from "react";

/**
 * The number on the home-screen icon, for players who installed the site
 * (iOS 16.4+ and desktop PWAs). Everywhere else `setAppBadge` is missing or
 * a no-op, so this costs nothing — no permission prompt, no service worker.
 * Cleared as soon as nothing is owed, including on sign-out.
 */
export default function AppBadge({ count }: { count: number }) {
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    const done = count > 0 ? nav.setAppBadge?.(count) : nav.clearAppBadge?.();
    done?.catch(() => {});
  }, [count]);
  return null;
}
