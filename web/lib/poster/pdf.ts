/**
 * A one-page PDF holding the poster, written by hand.
 *
 * A PDF that is a single full-bleed image is a short, well-defined file: five
 * objects, an xref table, a trailer. Carrying a PDF library into the bundle to
 * produce it would cost far more than the sixty lines it takes to emit — and
 * the poster is already a canvas, so JPEG (DCTDecode) drops straight in as an
 * image XObject with no re-encoding step.
 *
 * Ported from the model platform's export (webapp/static/js/app.js).
 */

function jpegBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function posterToPdf(canvas: HTMLCanvasElement, quality = 0.92): Blob {
  const jpeg = jpegBytes(canvas.toDataURL("image/jpeg", quality));
  const pxW = canvas.width;
  const pxH = canvas.height;
  // The page keeps the poster's aspect ratio; 540pt wide is 7.5in, a sane
  // sheet to print or to open on a phone.
  const ptW = 540;
  const ptH = Math.round((ptW * pxH) / pxW);

  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: Record<number, number> = {};
  let pos = 0;

  const add = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? enc.encode(chunk) : chunk;
    parts.push(bytes);
    pos += bytes.length;
  };
  const mark = (n: number) => {
    offsets[n] = pos;
  };

  add("%PDF-1.4\n");
  add(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // binary comment
  mark(1);
  add("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  mark(2);
  add("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  mark(3);
  add(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}]` +
      ` /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  );
  mark(4);
  add(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH}` +
      ` /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode` +
      ` /Length ${jpeg.length} >>\nstream\n`,
  );
  add(jpeg);
  add("\nendstream\nendobj\n");
  mark(5);
  const content = enc.encode(`q ${ptW} 0 0 ${ptH} 0 0 cm /Im0 Do Q`);
  add(`5 0 obj\n<< /Length ${content.length} >>\nstream\n`);
  add(content);
  add("\nendstream\nendobj\n");

  const xrefPos = pos;
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) {
    xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  add(xref);
  add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);

  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
