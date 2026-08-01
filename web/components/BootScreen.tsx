"use client";

import { useEffect } from "react";

const KEY = "f1duel-booted";
/** Never hold the page longer than this, whatever the network is doing. */
const MAX_HOLD = 2500;

/**
 * Mobile-only arrival screen.
 *
 * Phones paint the home page in stages — the hero glow, the grid overlay and
 * the glass cards can each land a frame late, which reads as dark blocks over
 * the content. This covers the site with an opaque screen that is already in
 * the server HTML (so it is there from the very first paint) and lifts it once
 * the window `load` event says everything is in. Desktop hides it in CSS, and
 * an inline script skips it on later loads in the same session.
 */
export default function BootScreen() {
  useEffect(() => {
    const el = document.getElementById("boot-screen");
    if (!el || el.hidden) return;

    let done = false;
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

    if (document.readyState === "complete") {
      requestAnimationFrame(finish);
    } else {
      window.addEventListener("load", finish, { once: true });
    }
    const timer = window.setTimeout(finish, MAX_HOLD);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("load", finish);
    };
  }, []);

  return (
    <>
      <div id="boot-screen" role="status" aria-label="Loading F1 Duel">
        <span className="font-mono text-sm font-semibold tracking-widest">
          <span className="text-race">F1</span> DUEL
        </span>
        <span className="size-9 animate-spin rounded-full border-2 border-line border-t-race" />
      </div>
      {/* Runs before hydration: don't replay the screen on every page load of
          the session, and never show it on a desktop viewport. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var e=document.getElementById('boot-screen');if(!e)return;if(window.matchMedia('(min-width: 768px)').matches||sessionStorage.getItem('${KEY}'))e.hidden=true;}catch(_){}})();`,
        }}
      />
      <noscript>
        <style>{`#boot-screen{display:none}`}</style>
      </noscript>
    </>
  );
}
