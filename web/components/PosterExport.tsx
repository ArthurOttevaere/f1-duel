"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { drawPoster, posterFileName } from "@/lib/poster/draw";
import { downloadBlob, posterToPdf } from "@/lib/poster/pdf";
import type { PosterData } from "@/lib/poster/types";

type Busy = null | "png" | "pdf" | "share" | "copy";

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))),
      "image/png",
    ),
  );
}

/** A pill switch: the poster has exactly one option, so it gets one control. */
function ModelToggle({
  on,
  disabled,
  onChange,
}: {
  on: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="pressable flex w-full items-center justify-between gap-4 rounded-2xl border border-line bg-glass px-4 py-3 text-left transition-colors hover:border-line-hi disabled:opacity-50"
    >
      <span>
        <span className="block text-sm font-medium">Include the model</span>
        <span className="mt-0.5 block text-xs text-ink-mute">
          {disabled
            ? "No model entry for this race"
            : on
              ? "Its picks, its score and the duel verdict"
              : "Your prediction and the result only"}
        </span>
      </span>
      <span
        aria-hidden
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          on ? "bg-race" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            on ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export default function PosterExport({ data }: { data: PosterData }) {
  const [open, setOpen] = useState(false);
  const [withModel, setWithModel] = useState(data.modelTotal !== null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  // Feature detection has to wait for the client, or the server would render a
  // different set of buttons than the browser does.
  const [shareable, setShareable] = useState(false);
  const [copyable, setCopyable] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- client-only detection */
    setShareable(typeof navigator !== "undefined" && "canShare" in navigator);
    setCopyable(
      typeof ClipboardItem !== "undefined" && Boolean(navigator.clipboard?.write),
    );
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // The poster is redrawn whenever the dialog opens or the model is toggled —
  // it takes a few dozen milliseconds and keeping stale bitmaps around is a
  // worse trade than redrawing. Clearing the old preview is the job of whoever
  // triggers the redraw (`show` below), so this effect only ever sets state
  // from the async result.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let url: string | null = null;

    drawPoster(data, { includeModel: withModel })
      .then(async (canvas) => {
        if (cancelled) return;
        canvasRef.current = canvas;
        const blob = await canvasBlob(canvas);
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreview(url);
      })
      .catch(() => {
        if (!cancelled) setError("The poster failed to render.");
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, withModel, data]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  /** Anything that invalidates the drawn poster goes through here. */
  const show = useCallback((next: () => void) => {
    setPreview(null);
    setError(null);
    next();
  }, []);

  const run = useCallback(
    async (action: Exclude<Busy, null>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      setBusy(action);
      setError(null);
      try {
        if (action === "pdf") {
          downloadBlob(posterToPdf(canvas), posterFileName(data, "pdf"));
        } else {
          const blob = await canvasBlob(canvas);
          const name = posterFileName(data, "png");
          if (action === "png") {
            downloadBlob(blob, name);
          } else if (action === "copy") {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);
          } else {
            const file = new File([blob], name, { type: "image/png" });
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: `${data.raceName} — F1 Duel`,
              });
            } else {
              downloadBlob(blob, name);
            }
          }
        }
      } catch (e) {
        // A share sheet the user dismissed is not an error worth shouting about.
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          setError("That didn't work. Try downloading the PNG instead.");
        }
      } finally {
        setBusy(null);
      }
    },
    [data],
  );

  const actionClass =
    "pressable rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60";

  return (
    <>
      <button
        type="button"
        onClick={() => show(() => setOpen(true))}
        className="pressable glass-chip flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors hover:border-line-hi"
      >
        <span aria-hidden>🏁</span>
        Export poster
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="sheet-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm sm:p-8"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Race poster"
              // min-w-0 so the panel shrinks to the phone rather than to its
              // own content, which contains a 1080px-wide bitmap.
              className="sheet-panel glass-card flex max-h-full w-full min-w-0 max-w-4xl flex-col overflow-hidden"
            >
              <header className="flex items-center justify-between border-b border-line px-5 py-3">
                <div>
                  <p className="font-mono text-[0.6rem] tracking-[0.2em] text-race uppercase">
                    Round {data.round} · {data.season}
                  </p>
                  <p className="text-sm font-semibold">{data.raceName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="pressable rounded-full px-3 py-1 text-lg text-ink-mute transition-colors hover:text-ink"
                >
                  ✕
                </button>
              </header>

              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 sm:flex-row">
                {/* The poster itself, at whatever size the dialog can spare. */}
                <div className="flex min-h-0 min-w-0 flex-1 items-start justify-center">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a canvas blob, not an asset
                    <img
                      src={preview}
                      alt={`Poster for ${data.raceName}`}
                      // max-w-full matters more than it looks: a 4:5 sheet at
                      // 60vh is wider than a phone, and without it the whole
                      // dialog scrolls sideways.
                      className="max-h-[45vh] w-auto max-w-full rounded-xl border border-line object-contain shadow-2xl sm:max-h-[60vh]"
                    />
                  ) : (
                    <div className="aspect-[1080/1350] w-full max-w-[min(100%,16rem)] animate-pulse rounded-xl border border-line bg-glass" />
                  )}
                </div>

                <div className="flex w-full shrink-0 flex-col gap-3 sm:w-64">
                  <ModelToggle
                    on={withModel && data.modelTotal !== null}
                    disabled={data.modelTotal === null}
                    onChange={(next) => show(() => setWithModel(next))}
                  />

                  {/* Share is the point of the poster, so it gets the whole
                      width; the file formats share a row underneath. */}
                  <div className="flex flex-col gap-2">
                    {shareable && (
                      <button
                        type="button"
                        disabled={!preview || busy !== null}
                        onClick={() => run("share")}
                        className={`${actionClass} w-full bg-race text-white hover:bg-race-deep`}
                      >
                        {busy === "share" ? "…" : "Share"}
                      </button>
                    )}
                    <div className={`grid gap-2 ${copyable ? "grid-cols-3" : "grid-cols-2"}`}>
                      {(
                        [
                          ["png", "PNG"],
                          ["pdf", "PDF"],
                          ...(copyable ? ([["copy", "Copy"]] as const) : []),
                        ] as const
                      ).map(([action, label]) => (
                        <button
                          key={action}
                          type="button"
                          disabled={!preview || busy !== null}
                          onClick={() => run(action)}
                          className={`${actionClass} ${
                            !shareable && action === "png"
                              ? "bg-race text-white hover:bg-race-deep"
                              : "glass-chip hover:border-line-hi"
                          }`}
                        >
                          {busy === action ? "…" : label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error ? (
                    <p className="text-xs text-race">{error}</p>
                  ) : (
                    <p className="text-xs text-ink-mute">
                      1080 × 1350 — sized for a story or a post.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
