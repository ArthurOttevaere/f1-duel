"use client";

import { useEffect } from "react";
import Logomark from "@/components/Logomark";
import StartLights from "@/components/StartLights";

const KEY = "f1duel-booted";
/** Never hold the page longer than this, whatever the network is doing. */
const MAX_HOLD = 2500;
/**
 * …and never less than this. The load event can land in 200ms on a warm
 * desktop, and a screen that appears and vanishes inside a blink reads as a
 * glitch rather than as an intro. Long enough for three lights.
 */
const MIN_HOLD = 700;

/**
 * The arrival screen — the first thing anyone sees on the site.
 *
 * Pages paint in stages (the hero glow, the grid overlay and the glass cards
 * can each land a frame late), which reads as dark blocks flashing over the
 * content. This covers the site with an opaque screen that is already in the
 * server HTML — so it is there from the very first paint, start lights running
 * on CSS alone — and lifts it once the window `load` event says everything is
 * in. An inline script skips it on later loads in the same session, so it
 * greets you when you arrive and never nags you again.
 */
export default function BootScreen() {
  useEffect(() => {
    const el = document.getElementById("boot-screen");
    if (!el || el.hidden) return;

    const shownAt = Date.now();
    let done = false;
    let timer = 0;

    const finish = () => {
      if (done) return;
      done = true;
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {
        // Private mode: the screen simply shows again on the next load.
      }
      el.classList.add("boot-done");
      window.setTimeout(() => {
        el.hidden = true;
      }, 340);
    };

    /** Lift the screen, but never before it has been up long enough to read. */
    const release = () => {
      if (done) return;
      window.clearTimeout(timer);
      const waited = Date.now() - shownAt;
      timer = window.setTimeout(finish, Math.max(0, MIN_HOLD - waited));
    };

    if (document.readyState === "complete") {
      release();
    } else {
      window.addEventListener("load", release, { once: true });
    }
    const cap = window.setTimeout(finish, MAX_HOLD);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(cap);
      window.removeEventListener("load", release);
    };
  }, []);

  return (
    <>
      <div id="boot-screen" role="status" aria-label="Loading F1 Duel">
        {/* The one surface big enough for the full cut: at 120px the vertical
            name reads, and the boot screen is the only place the identity gets
            the whole viewport to itself. Everywhere else the mark stands alone
            beside the Archivo name — see Logomark. */}
        <Logomark withName className="h-[7.5rem] w-auto text-ink" />
        <StartLights />
      </div>
      {/* Runs before hydration: don't replay the screen on every page load of
          the session. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var e=document.getElementById('boot-screen');if(e&&sessionStorage.getItem('${KEY}'))e.hidden=true;}catch(_){}})();`,
        }}
      />
      <noscript>
        <style>{`#boot-screen{display:none}`}</style>
      </noscript>
    </>
  );
}
