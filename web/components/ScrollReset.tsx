"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Every navigation starts at the top of the new page.
 *
 * The App Router usually does this itself, but it decides case by case — if it
 * reckons the top of the new segment is already in view it leaves the scroll
 * where it was. With a fixed nav, `min-h-svh` sections and a `loading.tsx` in
 * between, that judgement went wrong in the one place it is most visible:
 * tapping a nav link from the bottom of a long page (the rules, the standings)
 * dropped you into the middle of the next one, past its title — and past the
 * loader, so the wait looked like nothing happening at all.
 *
 * Three things it deliberately does not do:
 *
 * - **It never fights an anchor.** A hash in the URL (`/rules#scoring`,
 *   `#last-race`) is a position somebody asked for, so the reset stands down.
 * - **It never fights the back button.** Browser history restores the scroll
 *   you left, which is the whole point of going back; a `popstate` sets a flag
 *   that skips exactly one reset.
 * - **It does nothing on first paint**, so a deep link lands where it was
 *   meant to.
 *
 * Instant, not smooth: a page that glides to the top while its content is
 * still arriving is a page that looks broken twice.
 */
export default function ScrollReset() {
  const pathname = usePathname();
  const first = useRef(true);
  const restoring = useRef(false);

  useEffect(() => {
    const onPop = () => {
      restoring.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (restoring.current) {
      restoring.current = false;
      return;
    }
    if (window.location.hash) return;
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
