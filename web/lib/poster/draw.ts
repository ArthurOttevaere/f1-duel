import type { PosterData, PosterDriver, SlotKind } from "@/lib/poster/types";

/**
 * The shareable race poster, drawn by hand on a canvas.
 *
 * Everything here is drawing code — no DOM, no dependencies, no screenshot of
 * the page. That is deliberate: html-to-image libraries render whatever the
 * browser happens to support that day, while a canvas gives the same 1080×1350
 * sheet on every device, and the same sheet can be handed to the PDF writer.
 *
 * The look is the site's: the dark base, the red glow over a faint grid, glass
 * rows, and the checkered finish line that separates the footer from the rest
 * of the site (`.checker-edge` in globals.css).
 */

const W = 1080;
const H = 1350;
/** Drawn at 2× and downscaled by the browser, so the text stays crisp. */
const SCALE = 2;
const PAD = 64;
const INNER = W - PAD * 2;

const C = {
  bgTop: "#0d0f15",
  bgBottom: "#07080b",
  ink: "#f4f6fa",
  dim: "#a7adba",
  mute: "#6c7280",
  race: "#ff1e3c",
  exact: "#34d399",
  near: "#fbbf24",
  line: "rgba(255,255,255,0.10)",
  glass: "rgba(255,255,255,0.045)",
  row: "rgba(255,255,255,0.035)",
};

const VERDICT = {
  beat: { label: "You beat the model", tone: C.exact },
  drew: { label: "Dead heat with the model", tone: C.near },
  lost: { label: "The model takes this one", tone: C.race },
} as const;

// ─── Small drawing helpers ───────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Shrinks the size until the text fits `maxWidth` (never below `min`). */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  max: number,
  min: number,
  family: string,
  maxWidth: number,
) {
  let size = max;
  while (size > min) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  return size;
}

/** Loads an image, resolving to null instead of rejecting when it 404s. */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * next/font hashes its family names ("__Inter_e8ce0c"), so the canvas can't ask
 * for "Inter" and get the font the page is using — it has to read the variable
 * the font loader defined on <html>.
 */
function fontStack(variable: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  return v ? `${v}, ${fallback}` : fallback;
}

async function preloadFonts(sans: string, mono: string) {
  if (!document.fonts?.load) return;
  // document.fonts.load takes one family, not a stack.
  const first = (stack: string) => stack.split(",")[0].trim();
  await Promise.all([
    document.fonts.load(`800 60px ${first(sans)}`),
    document.fonts.load(`700 24px ${first(sans)}`),
    document.fonts.load(`600 18px ${first(sans)}`),
    document.fonts.load(`800 40px ${first(mono)}`),
    document.fonts.load(`600 14px ${first(mono)}`),
  ]).catch(() => {});
}

function toneFor(kind: SlotKind | null): string {
  switch (kind) {
    case "exact":
      return C.exact;
    case "near":
      return C.near;
    case "in_top10":
      return C.dim;
    default:
      return C.mute;
  }
}

// ─── Background ──────────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D) {
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, C.bgTop);
  base.addColorStop(1, C.bgBottom);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // The hero's grid, masked to a soft ellipse. Drawn offscreen so the mask
  // erases the lines only and leaves the gradient underneath untouched.
  const grid = document.createElement("canvas");
  grid.width = W;
  grid.height = H;
  const g = grid.getContext("2d");
  if (g) {
    g.strokeStyle = "rgba(255,255,255,0.05)";
    g.lineWidth = 1;
    for (let x = 0; x <= W; x += 72) {
      g.beginPath();
      g.moveTo(x + 0.5, 0);
      g.lineTo(x + 0.5, H);
      g.stroke();
    }
    for (let y = 0; y <= H; y += 72) {
      g.beginPath();
      g.moveTo(0, y + 0.5);
      g.lineTo(W, y + 0.5);
      g.stroke();
    }
    g.globalCompositeOperation = "destination-in";
    const mask = g.createRadialGradient(W / 2, 300, 80, W / 2, 300, 780);
    mask.addColorStop(0, "rgba(0,0,0,1)");
    mask.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = mask;
    g.fillRect(0, 0, W, H);
    ctx.drawImage(grid, 0, 0);
  }

  // Red aurora top-right, blue counterweight bottom-left — the hero's pair.
  const red = ctx.createRadialGradient(W - 120, -80, 40, W - 120, -80, 760);
  red.addColorStop(0, "rgba(255,30,60,0.26)");
  red.addColorStop(1, "rgba(255,30,60,0)");
  ctx.fillStyle = red;
  ctx.fillRect(0, 0, W, 900);

  const blue = ctx.createRadialGradient(-60, H + 40, 40, -60, H + 40, 620);
  blue.addColorStop(0, "rgba(72,92,255,0.20)");
  blue.addColorStop(1, "rgba(72,92,255,0)");
  ctx.fillStyle = blue;
  ctx.fillRect(0, H - 700, W, 700);
}

/** The site's finish line: two rows of checkered flag, faded at both edges. */
function drawFinishLine(ctx: CanvasRenderingContext2D, top: number, h: number) {
  const sq = h / 2;
  const fade = W * 0.1;
  ctx.save();
  ctx.fillStyle = C.ink;
  for (let row = 0; row < 2; row++) {
    for (let x = 0; x < W; x += sq) {
      if ((Math.round(x / sq) + row) % 2 !== 0) continue;
      const edge = Math.min(x / fade, (W - x - sq) / fade, 1);
      if (edge <= 0) continue;
      ctx.globalAlpha = 0.92 * edge;
      ctx.fillRect(x, top + row * sq, sq, sq);
    }
  }
  ctx.restore();
}

// ─── Driver bits ─────────────────────────────────────────────────────────────

function drawDriverCircle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  driver: PosterDriver,
  cx: number,
  cy: number,
  r: number,
  sans: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = `${driver.color}33`;
  ctx.fill();

  if (img) {
    ctx.save();
    ctx.clip();
    const s = (r * 2) / Math.min(img.width, img.height);
    const w = img.width * s;
    const h = img.height * s;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
  } else {
    ctx.fillStyle = driver.color;
    ctx.font = `700 ${Math.round(r * 0.72)}px ${sans}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(driver.code, cx, cy + 1);
    ctx.textBaseline = "alphabetic";
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = driver.color;
  ctx.stroke();
  ctx.restore();
}

/** A team-colour tick, the site's way of marking a driver without a photo. */
function drawTeamBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  midY: number,
  color: string,
) {
  ctx.fillStyle = color;
  roundRect(ctx, x, midY - 11, 3, 22, 2);
  ctx.fill();
}

// ─── The poster ──────────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const one = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export interface PosterOptions {
  /** The model's picks, its score and the duel verdict. Off = your race only. */
  includeModel: boolean;
}

export async function drawPoster(
  data: PosterData,
  { includeModel }: PosterOptions,
): Promise<HTMLCanvasElement> {
  const sans = fontStack("--font-inter", "system-ui, sans-serif");
  const mono = fontStack("--font-geist-mono", "ui-monospace, monospace");
  await preloadFonts(sans, mono);

  const withModel = includeModel && data.modelTotal !== null;

  // Portraits for your own picks only: the other columns are one line of text
  // each, and ten more faces would turn the table into a contact sheet.
  const photos = new Map<string, HTMLImageElement | null>();
  await Promise.all(
    data.slots
      .map((s) => s.mine)
      .filter((id): id is string => Boolean(id))
      .map(async (id) => {
        const src = data.drivers[id]?.photo;
        photos.set(id, src ? await loadImage(src) : null);
      }),
  );

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = "alphabetic";

  drawBackground(ctx);

  // ── Header: brand left, round chip right ──────────────────────────────────
  ctx.fillStyle = C.race;
  roundRect(ctx, PAD, 62, 46, 34, 9);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `800 19px ${sans}`;
  ctx.textAlign = "center";
  ctx.fillText("F1", PAD + 23, 86);
  ctx.textAlign = "left";
  ctx.fillStyle = C.ink;
  ctx.font = `700 21px ${sans}`;
  ctx.fillText("DUEL", PAD + 58, 86);

  const chip = `ROUND ${data.round} · ${data.season}`;
  ctx.font = `700 13px ${mono}`;
  const chipW = ctx.measureText(chip).width + 28;
  ctx.fillStyle = C.glass;
  roundRect(ctx, W - PAD - chipW, 62, chipW, 32, 16);
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = C.dim;
  ctx.textAlign = "center";
  ctx.fillText(chip, W - PAD - chipW / 2, 83);
  ctx.textAlign = "left";

  ctx.strokeStyle = C.line;
  ctx.beginPath();
  ctx.moveTo(PAD, 126);
  ctx.lineTo(W - PAD, 126);
  ctx.stroke();

  // ── Title: the Grand Prix ─────────────────────────────────────────────────
  const title = data.raceName.toUpperCase();
  const tSize = fitFont(ctx, title, 800, 62, 32, sans, INNER);
  ctx.font = `800 ${tSize}px ${sans}`;
  ctx.fillStyle = C.ink;
  ctx.fillText(title, PAD, 200);

  const meta = [data.circuit, data.country].filter(Boolean).join(" · ");
  ctx.font = `600 20px ${sans}`;
  ctx.fillStyle = C.dim;
  if (meta) ctx.fillText(meta, PAD, 234);
  const date = dateLabel(data.raceAt);
  if (date) {
    ctx.font = `600 17px ${sans}`;
    ctx.fillStyle = C.mute;
    ctx.fillText(date, PAD, 262);
  }

  // ── Verdict card ──────────────────────────────────────────────────────────
  const cardTop = 292;
  const cardH = 116;
  const verdict = data.verdict ? VERDICT[data.verdict] : null;
  const tone = withModel && verdict ? verdict.tone : C.race;

  ctx.fillStyle = C.glass;
  roundRect(ctx, PAD, cardTop, INNER, cardH, 20);
  ctx.fill();
  ctx.strokeStyle = `${tone}66`;
  ctx.lineWidth = 1.5;
  roundRect(ctx, PAD, cardTop, INNER, cardH, 20);
  ctx.stroke();

  ctx.font = `700 13px ${mono}`;
  ctx.fillStyle = tone;
  ctx.fillText(
    (withModel && verdict ? verdict.label : "Final score").toUpperCase(),
    PAD + 28,
    cardTop + 40,
  );

  ctx.font = `800 42px ${mono}`;
  ctx.fillStyle = C.ink;
  if (withModel) {
    const you = one(data.total);
    ctx.fillText(you, PAD + 28, cardTop + 90);
    const youW = ctx.measureText(you).width;
    ctx.fillStyle = C.mute;
    ctx.fillText("—", PAD + 28 + youW + 16, cardTop + 90);
    const dashW = ctx.measureText("—").width;
    ctx.fillStyle = C.dim;
    ctx.fillText(
      one(data.modelTotal ?? 0),
      PAD + 28 + youW + 32 + dashW,
      cardTop + 90,
    );
  } else {
    const pts = one(data.total);
    ctx.fillText(pts, PAD + 28, cardTop + 90);
    const w = ctx.measureText(pts).width;
    ctx.font = `700 18px ${mono}`;
    ctx.fillStyle = C.mute;
    ctx.fillText("PTS", PAD + 28 + w + 12, cardTop + 90);
  }

  ctx.textAlign = "right";
  const rightX = W - PAD - 28;
  const nameSize = fitFont(ctx, data.player, 700, 24, 15, sans, INNER * 0.4);
  ctx.font = `700 ${nameSize}px ${sans}`;
  ctx.fillStyle = C.ink;
  ctx.fillText(data.player, rightX, cardTop + 44);
  ctx.font = `600 13px ${mono}`;
  ctx.fillStyle = C.mute;
  ctx.fillText(withModel ? "YOU · MODEL" : "TOP 10 PREDICTION", rightX, cardTop + 70);
  if (withModel && data.duelBonus > 0) {
    ctx.fillStyle = C.exact;
    ctx.fillText(`+${one(data.duelBonus)} DUEL BONUS`, rightX, cardTop + 94);
  }
  ctx.textAlign = "left";

  // ── Footer furniture first: the table fills whatever is left ──────────────
  const footerBaseline = H - 54;
  const checkerTop = H - 116;
  const hasCalls = Boolean(data.dotd || data.safetyCar);
  const callsBaseline = checkerTop - 42;
  const statsBottom = hasCalls ? callsBaseline - 34 : checkerTop - 28;
  const statsH = 104;
  const statsTop = statsBottom - statsH;

  const tableTop = cardTop + cardH + 62;
  const legendBaseline = statsTop - 20;
  const tableBottom = legendBaseline - 26;
  const rowGap = 6;
  const rowH = (tableBottom - tableTop - rowGap * 9) / 10;

  // ── Table: your call against the official result (and the model) ──────────
  const posW = 50;
  const ptsW = 96;
  const colCount = withModel ? 3 : 2;
  const colGap = 16;
  const colW = (INNER - posW - ptsW - colGap * (colCount - 1)) / colCount;
  const colX = (i: number) => PAD + posW + i * (colW + colGap);

  ctx.font = `700 11px ${mono}`;
  ctx.fillStyle = C.mute;
  const labels = withModel
    ? ["YOUR CALL", "OFFICIAL", "MODEL"]
    : ["YOUR CALL", "OFFICIAL"];
  ctx.fillText("POS", PAD + 6, tableTop - 16);
  labels.forEach((l, i) => ctx.fillText(l, colX(i) + (i === 0 ? 44 : 14), tableTop - 16));
  ctx.textAlign = "right";
  ctx.fillText("PTS", W - PAD - 6, tableTop - 16);
  ctx.textAlign = "left";

  data.slots.forEach((slot, i) => {
    const top = tableTop + i * (rowH + rowGap);
    const midY = top + rowH / 2;
    const mine = slot.mine ? data.drivers[slot.mine] : null;

    ctx.fillStyle = C.row;
    roundRect(ctx, PAD, top, INNER, rowH, 12);
    ctx.fill();
    if (mine) {
      ctx.fillStyle = mine.color;
      roundRect(ctx, PAD, top, 4, rowH, 2);
      ctx.fill();
    }

    ctx.font = `700 19px ${mono}`;
    ctx.fillStyle = C.mute;
    ctx.textAlign = "center";
    ctx.fillText(`P${slot.position}`, PAD + posW / 2 + 4, midY + 7);
    ctx.textAlign = "left";

    // Your pick — face, name, team, and the colour of how it went.
    if (mine && slot.mine) {
      const r = Math.min(17, rowH / 2 - 7);
      drawDriverCircle(ctx, photos.get(slot.mine) ?? null, mine, colX(0) + r + 6, midY, r, sans);
      const nx = colX(0) + r * 2 + 18;
      const room = colW - (nx - colX(0)) - 8;
      const size = fitFont(ctx, mine.name, 700, 21, 13, sans, room);
      ctx.font = `700 ${size}px ${sans}`;
      ctx.fillStyle = toneFor(slot.kind);
      ctx.fillText(mine.name, nx, mine.team ? midY + 1 : midY + 7);
      if (mine.team) {
        const tSize = fitFont(ctx, mine.team, 600, 12, 9, sans, room);
        ctx.font = `600 ${tSize}px ${sans}`;
        ctx.fillStyle = C.mute;
        ctx.fillText(mine.team, nx, midY + 17);
      }
    } else {
      ctx.font = `600 18px ${sans}`;
      ctx.fillStyle = C.mute;
      ctx.fillText("—", colX(0) + 14, midY + 7);
    }

    // Official, then the model when it is invited.
    const others: { id: string | null; kind: SlotKind | null }[] = [
      { id: slot.official, kind: null },
    ];
    if (withModel) others.push({ id: slot.model, kind: slot.modelKind });

    others.forEach((cell, j) => {
      const x = colX(j + 1);
      const d = cell.id ? data.drivers[cell.id] : null;
      if (!d) {
        ctx.font = `600 18px ${sans}`;
        ctx.fillStyle = C.mute;
        ctx.fillText("—", x + 14, midY + 7);
        return;
      }
      drawTeamBar(ctx, x + 2, midY, d.color);
      const nx = x + 16;
      const size = fitFont(ctx, d.name, 600, 20, 13, sans, colW - 24);
      ctx.font = `600 ${size}px ${sans}`;
      // The official column is the reference and stays plain; the model's is
      // graded like yours, which is the whole point of putting them side by
      // side — you can see where it was right and you weren't.
      ctx.fillStyle = j === 0 ? C.ink : cell.kind === "exact" ? C.exact : C.dim;
      ctx.fillText(d.name, nx, midY + 7);
    });

    // Points, with the rarity multiplier alongside when one fired.
    ctx.textAlign = "right";
    if (slot.points > 0) {
      ctx.font = `700 20px ${mono}`;
      ctx.fillStyle = C.ink;
      const pts = one(slot.points);
      ctx.fillText(pts, W - PAD - 6, midY + 7);
      if (slot.multiplier > 1) {
        const ptsW = ctx.measureText(pts).width;
        ctx.font = `700 12px ${mono}`;
        ctx.fillStyle = C.race;
        ctx.fillText(`×${slot.multiplier}`, W - PAD - 12 - ptsW, midY + 6);
      }
    } else {
      ctx.font = `700 20px ${mono}`;
      ctx.fillStyle = C.mute;
      ctx.fillText("0", W - PAD - 6, midY + 7);
    }
    ctx.textAlign = "left";
  });

  // ── Legend: what the colours in your column mean ──────────────────────────
  // The poster goes to people who have never played, and without this the
  // green and amber names are just decoration.
  {
    const items: [string, string][] = [
      [C.exact, "EXACT"],
      [C.near, "±1"],
      [C.dim, "IN TOP 10"],
      [C.mute, "MISSED"],
    ];
    ctx.font = `700 11px ${mono}`;
    const gap = 26;
    const widths = items.map(([, l]) => ctx.measureText(l).width + 16);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
    let x = W / 2 - total / 2;
    items.forEach(([color, label], i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + 4, legendBaseline - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.mute;
      ctx.fillText(label, x + 16, legendBaseline);
      x += widths[i] + gap;
    });
  }

  // ── Stats band ────────────────────────────────────────────────────────────
  const tiles: { value: string; label: string }[] = [
    { value: one(data.total), label: "POINTS" },
    { value: `${data.stats.exact}/10`, label: "EXACT" },
    { value: `${data.stats.inTop10}/10`, label: "IN TOP 10" },
    {
      value: data.stats.avgMiss === null ? "—" : data.stats.avgMiss.toFixed(1),
      label: "AVG MISS",
    },
  ];
  if (withModel) {
    // The model's own total is already the right-hand half of the verdict
    // card; what the band can add is the margin.
    const margin = data.total - (data.modelTotal ?? 0);
    tiles.push({
      value: `${margin > 0 ? "+" : ""}${one(margin)}`,
      label: "VS MODEL",
    });
  }

  ctx.fillStyle = C.glass;
  roundRect(ctx, PAD, statsTop, INNER, statsH, 18);
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  roundRect(ctx, PAD, statsTop, INNER, statsH, 18);
  ctx.stroke();

  const tileW = INNER / tiles.length;
  ctx.textAlign = "center";
  tiles.forEach((tile, i) => {
    const cx = PAD + tileW * (i + 0.5);
    if (i > 0) {
      ctx.strokeStyle = C.line;
      ctx.beginPath();
      ctx.moveTo(PAD + tileW * i, statsTop + 22);
      ctx.lineTo(PAD + tileW * i, statsTop + statsH - 22);
      ctx.stroke();
    }
    const vSize = fitFont(ctx, tile.value, 800, 34, 20, mono, tileW - 24);
    ctx.font = `800 ${vSize}px ${mono}`;
    ctx.fillStyle = C.ink;
    ctx.fillText(tile.value, cx, statsTop + 56);
    const lSize = fitFont(ctx, tile.label, 700, 11, 8, mono, tileW - 16);
    ctx.font = `700 ${lSize}px ${mono}`;
    ctx.fillStyle = C.mute;
    ctx.fillText(tile.label, cx, statsTop + 78);
  });
  ctx.textAlign = "left";

  // ── The two side bets, on one line ────────────────────────────────────────
  if (hasCalls) {
    const bits: { text: string; tone: string }[] = [];
    if (data.dotd) {
      bits.push({
        text: `Driver of the Day: ${data.dotd.actual}`,
        tone: C.dim,
      });
      if (data.dotd.mine) {
        bits.push({
          text: data.dotd.hit ? "you called it" : `you said ${data.dotd.mine}`,
          tone: data.dotd.hit ? C.exact : C.mute,
        });
      }
    }
    if (data.safetyCar) {
      bits.push({
        text: `Safety car: ${data.safetyCar.actual}`,
        tone: C.dim,
      });
      if (data.safetyCar.mine) {
        bits.push({
          text: data.safetyCar.hit ? "called" : `you said ${data.safetyCar.mine}`,
          tone: data.safetyCar.hit ? C.exact : C.mute,
        });
      }
    }

    ctx.font = `600 16px ${sans}`;
    const sep = "   ·   ";
    const total = bits.reduce(
      (sum, b, i) => sum + ctx.measureText(b.text).width + (i ? ctx.measureText(sep).width : 0),
      0,
    );
    let x = W / 2 - total / 2;
    bits.forEach((b, i) => {
      if (i) {
        ctx.fillStyle = C.mute;
        ctx.fillText(sep, x, callsBaseline);
        x += ctx.measureText(sep).width;
      }
      ctx.fillStyle = b.tone;
      ctx.fillText(b.text, x, callsBaseline);
      x += ctx.measureText(b.text).width;
    });
  }

  // ── Finish line + footer ──────────────────────────────────────────────────
  drawFinishLine(ctx, checkerTop, 18);

  ctx.font = `700 13px ${sans}`;
  ctx.fillStyle = C.dim;
  ctx.fillText("F1 DUEL", PAD, footerBaseline);
  const brandW = ctx.measureText("F1 DUEL").width;
  ctx.font = `600 13px ${sans}`;
  ctx.fillStyle = C.mute;
  ctx.fillText("· one duel per Grand Prix", PAD + brandW + 8, footerBaseline);
  ctx.textAlign = "right";
  ctx.fillText("Humans versus the machine", W - PAD, footerBaseline);
  ctx.textAlign = "left";

  return canvas;
}

/** `f1-duel-round-14-2026.png` — sorts by season and reads in a share sheet. */
export function posterFileName(data: PosterData, ext: string): string {
  return `f1-duel-round-${data.round}-${data.season}.${ext}`;
}
