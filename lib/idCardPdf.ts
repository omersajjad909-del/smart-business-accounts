// Builds the ID card PDF from the same layout the preview uses (lib/idCardDesign.ts). Browser only.
// Text is drawn with the PDF's built-in Helvetica, which has no Urdu glyphs — Urdu names print correctly from the
// browser's Print button but not in this PDF.

import type { jsPDF } from "jspdf";
import { A4, cardPosition, cardSize, layoutBack, layoutFront, LINE_HEIGHT, sheetSpec, type CardSchool, type CardStudent, type Design, type ImageShape, type Prim } from "@/lib/idCardDesign";

const PT = 0.3528;
const PX_PER_MM = 12; // ≈ 300 dpi

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Crops (or fits) an image to the box and applies the shape, returning a PNG/JPEG data URL — or null if it could not be loaded. */
async function renderImage(url: string, w: number, h: number, shape: ImageShape): Promise<string | null> {
  const img = await loadImage(url);
  if (!img) return null;
  const cw = Math.max(1, Math.round(w * PX_PER_MM)), ch = Math.max(1, Math.round(h * PX_PER_MM));
  const canvas = document.createElement("canvas");
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (shape === "round" || shape === "rounded") {
    const r = shape === "round" ? Math.min(cw, ch) / 2 : 2 * PX_PER_MM;
    ctx.beginPath(); ctx.roundRect(0, 0, cw, ch, r); ctx.clip();
  }
  const scale = shape === "contain" ? Math.min(cw / img.width, ch / img.height) : Math.max(cw / img.width, ch / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  try { return canvas.toDataURL(shape === "square" ? "image/jpeg" : "image/png", 0.92); } catch { return null; } // a tainted canvas (no CORS) throws
}

const key = (p: Extract<Prim, { t: "image" }>) => `${p.src}|${p.w}|${p.h}|${p.shape}`;

function drawPrims(doc: jsPDF, prims: Prim[], ox: number, oy: number, images: Map<string, string | null>) {
  for (const p of prims) {
    if (p.t === "rect") {
      if (p.fill) doc.setFillColor(p.fill);
      if (p.stroke) { doc.setDrawColor(p.stroke); doc.setLineWidth(p.sw ?? 0.2); }
      const style = p.fill && p.stroke ? "FD" : p.fill ? "F" : "S";
      const isCircle = !!p.r && Math.abs(p.w - p.h) < 0.01 && p.r >= p.w / 2 - 0.01;
      if (isCircle) doc.circle(ox + p.x + p.w / 2, oy + p.y + p.h / 2, p.w / 2, style);
      else if (p.r) doc.roundedRect(ox + p.x, oy + p.y, p.w, p.h, p.r, p.r, style); else doc.rect(ox + p.x, oy + p.y, p.w, p.h, style);
    } else if (p.t === "line") {
      doc.setDrawColor(p.color); doc.setLineWidth(p.sw);
      doc.line(ox + p.x1, oy + p.y1, ox + p.x2, oy + p.y2);
    } else if (p.t === "image") {
      const data = images.get(key(p));
      if (data) doc.addImage(data, data.startsWith("data:image/png") ? "PNG" : "JPEG", ox + p.x, oy + p.y, p.w, p.h);
    } else {
      doc.setFont("helvetica", p.bold ? "bold" : "normal");
      doc.setFontSize(p.size);
      doc.setTextColor(p.color);
      const lines = (doc.splitTextToSize(p.text, p.w) as string[]).slice(0, p.lines);
      const lh = p.size * PT * LINE_HEIGHT, ascent = p.size * PT * 0.92;
      lines.forEach((line, i) => {
        const x = p.align === "center" ? ox + p.x + p.w / 2 : p.align === "right" ? ox + p.x + p.w : ox + p.x;
        doc.text(line, x, oy + p.y + ascent + i * lh, { align: p.align ?? "left" });
      });
    }
  }
}

export type PdfOptions = { includeBack: boolean; mirrorBack: boolean; cutGuides: boolean };

/** One A4 sheet of fronts, then (if wanted) its sheet of backs, then the next — ready for double-sided printing. */
export async function buildIdCardPdf(design: Design, students: CardStudent[], school: CardSchool, opts: PdfOptions): Promise<jsPDF> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const spec = sheetSpec(design), size = cardSize(design);

  // Prepare every image once (logo, each photo).
  const images = new Map<string, string | null>();
  const faces = students.map((s) => ({ front: layoutFront(design, s, school), back: layoutBack(design, s, school) }));
  const wanted = faces.flatMap((f) => [...f.front, ...f.back]).filter((p): p is Extract<Prim, { t: "image" }> => p.t === "image");
  await Promise.all([...new Map(wanted.map((p) => [key(p), p])).values()].map(async (p) => { images.set(key(p), await renderImage(p.src, p.w, p.h, p.shape)); }));

  const page = (items: { prims: Prim[] }[], mirror: boolean, first: boolean) => {
    if (!first) doc.addPage();
    items.forEach((it, n) => {
      const pos = cardPosition(design, n, mirror);
      doc.setFillColor(design.background); doc.rect(pos.x, pos.y, size.w, size.h, "F");
      drawPrims(doc, it.prims, pos.x, pos.y, images);
      if (opts.cutGuides) { doc.setDrawColor("#9ca3af"); doc.setLineWidth(0.1); doc.rect(pos.x, pos.y, size.w, size.h, "S"); }
    });
  };

  let first = true;
  for (let i = 0; i < faces.length; i += spec.perPage) {
    const chunk = faces.slice(i, i + spec.perPage);
    page(chunk.map((f) => ({ prims: f.front })), false, first); first = false;
    if (opts.includeBack && design.back.show) page(chunk.map((f) => ({ prims: f.back })), opts.mirrorBack, false);
  }
  void A4;
  return doc;
}

export const pdfFileName = (label: string) => `id-cards-${label.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "school"}.pdf`;
