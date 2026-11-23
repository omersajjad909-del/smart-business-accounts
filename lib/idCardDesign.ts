// ID card design: the model, a sanitiser, and the layout.
//
// The layout is a list of primitives in millimetres. The same list is drawn three ways — as HTML for the live
// preview and for printing, and with jsPDF for the downloadable PDF (lib/idCardPdf.ts) — so what you design is
// what prints, and what you download. Pure TypeScript: no DOM, no React, usable on the server to validate input.

export type FieldKey = "class" | "admissionNo" | "rollNo" | "guardian" | "phone" | "bloodGroup" | "dob" | "address";
export const FIELD_LABELS: Record<FieldKey, string> = { class: "Class", admissionNo: "Adm no.", rollNo: "Roll no.", guardian: "Guardian", phone: "Phone", bloodGroup: "Blood group", dob: "Date of birth", address: "Address" };
export const FIELD_ORDER: FieldKey[] = ["class", "admissionNo", "rollNo", "guardian", "phone", "bloodGroup", "dob", "address"];

export type Template = "classic" | "modern" | "minimal";
export type Orientation = "landscape" | "portrait";
export type PhotoShape = "square" | "rounded" | "round";

export type Design = {
  template: Template;
  orientation: Orientation;
  primary: string; accent: string; text: string; background: string;
  photoShape: PhotoShape;
  showLogo: boolean;
  schoolName: string;        // empty = the company name
  tagline: string;
  fields: Record<FieldKey, boolean>;
  validityText: string;      // empty = "Valid till 31 Mar <year>"
  showSignature: boolean;
  signatureLabel: string;
  fontScale: number;         // 0.9 – 1.15
  back: { show: boolean; title: string; text: string; showAddress: boolean; showEmergency: boolean; footer: string };
};

export const DEFAULT_DESIGN: Design = {
  template: "classic", orientation: "landscape",
  primary: "#1e3a8a", accent: "#f59e0b", text: "#111827", background: "#ffffff",
  photoShape: "rounded", showLogo: true, schoolName: "", tagline: "",
  fields: { class: true, admissionNo: true, rollNo: true, guardian: true, phone: true, bloodGroup: false, dob: false, address: false },
  validityText: "", showSignature: true, signatureLabel: "Principal", fontScale: 1,
  back: { show: true, title: "Terms & Conditions", text: "This card is the property of the school and must be carried every day.\nIf found, please return it to the school address given below.", showAddress: true, showEmergency: true, footer: "" },
};

export const THEMES: { name: string; primary: string; accent: string }[] = [
  { name: "Royal blue", primary: "#1e3a8a", accent: "#f59e0b" },
  { name: "Green", primary: "#166534", accent: "#facc15" },
  { name: "Maroon", primary: "#7f1d1d", accent: "#d4af37" },
  { name: "Teal", primary: "#0f766e", accent: "#fb7185" },
  { name: "Purple", primary: "#5b21b6", accent: "#22d3ee" },
  { name: "Charcoal", primary: "#1f2937", accent: "#ef4444" },
];

const HEX = /^#[0-9a-f]{6}$/i;
const color = (v: unknown, d: string) => (typeof v === "string" && HEX.test(v) ? v : d);
const text = (v: unknown, d: string, max: number) => (typeof v === "string" ? v.slice(0, max) : d);
const flag = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T => (allowed.includes(v as T) ? (v as T) : d);

/** Accepts anything (a saved design, a request body) and returns a complete, safe design. */
export function sanitizeDesign(input: unknown): Design {
  const i = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const f = (i.fields && typeof i.fields === "object" ? i.fields : {}) as Record<string, unknown>;
  const b = (i.back && typeof i.back === "object" ? i.back : {}) as Record<string, unknown>;
  const d = DEFAULT_DESIGN;
  const scale = typeof i.fontScale === "number" && Number.isFinite(i.fontScale) ? Math.min(1.15, Math.max(0.9, i.fontScale)) : d.fontScale;
  return {
    template: pick(i.template, ["classic", "modern", "minimal"] as const, d.template),
    orientation: pick(i.orientation, ["landscape", "portrait"] as const, d.orientation),
    primary: color(i.primary, d.primary), accent: color(i.accent, d.accent), text: color(i.text, d.text), background: color(i.background, d.background),
    photoShape: pick(i.photoShape, ["square", "rounded", "round"] as const, d.photoShape),
    showLogo: flag(i.showLogo, d.showLogo), schoolName: text(i.schoolName, d.schoolName, 60), tagline: text(i.tagline, d.tagline, 60),
    fields: Object.fromEntries(FIELD_ORDER.map((k) => [k, flag(f[k], d.fields[k])])) as Record<FieldKey, boolean>,
    validityText: text(i.validityText, d.validityText, 40), showSignature: flag(i.showSignature, d.showSignature), signatureLabel: text(i.signatureLabel, d.signatureLabel, 30),
    fontScale: scale,
    back: { show: flag(b.show, d.back.show), title: text(b.title, d.back.title, 40), text: text(b.text, d.back.text, 400), showAddress: flag(b.showAddress, d.back.showAddress), showEmergency: flag(b.showEmergency, d.back.showEmergency), footer: text(b.footer, d.back.footer, 60) },
  };
}

// ── Data the card shows ──────────────────────────────────────────────────────

export type CardStudent = {
  name: string; admissionNo: string; rollNo: string | null; className: string; guardianName: string | null; phone: string | null;
  bloodGroup: string | null; dob: string | null; address: string | null; emergencyPhone: string | null; photoUrl: string | null;
};
export type CardSchool = { name: string; logoUrl: string | null; address: string; phone: string };

export const SAMPLE_STUDENT: CardStudent = { name: "Ali Raza", admissionNo: "0042", rollNo: "7", className: "Class 9 - A", guardianName: "Raza Ahmed", phone: "03001234567", bloodGroup: "B+", dob: "2011-05-21", address: "House 12, Model Town, Lahore", emergencyPhone: "03211234567", photoUrl: null };

export function defaultValidity(now = new Date()) {
  return `Valid till 31 Mar ${now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear()}`;
}

// ── Primitives ───────────────────────────────────────────────────────────────

export type ImageShape = "square" | "rounded" | "round" | "contain";
export type Prim =
  | { t: "rect"; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; sw?: number; r?: number }
  | { t: "text"; x: number; y: number; w: number; text: string; size: number; bold?: boolean; color: string; align?: "left" | "center" | "right"; lines: number }
  | { t: "image"; x: number; y: number; w: number; h: number; src: string; shape: ImageShape }
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; color: string; sw: number };

export const CARD = { landscape: { w: 85.6, h: 54 }, portrait: { w: 54, h: 85.6 } } as const;
export const cardSize = (d: Design) => CARD[d.orientation];

const PT = 0.3528;                                  // 1pt in mm
export const LINE_HEIGHT = 1.15;
/** Estimated lines a string needs at a size in a width — used to place what comes below it. */
function estLines(s: string, size: number, w: number, max: number) {
  const perLine = Math.max(4, Math.floor(w / (size * PT * 0.56)));
  return Math.max(1, Math.min(max, Math.ceil(s.length / perLine)));
}
const blockHeight = (lines: number, size: number) => lines * size * PT * LINE_HEIGHT;

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export function fieldRows(d: Design, s: CardStudent): [string, string][] {
  const v: Record<FieldKey, string> = { class: s.className, admissionNo: s.admissionNo, rollNo: s.rollNo ?? "", guardian: s.guardianName ?? "", phone: s.phone ?? "", bloodGroup: s.bloodGroup ?? "", dob: fmtDate(s.dob), address: s.address ?? "" };
  return FIELD_ORDER.filter((k) => d.fields[k] && v[k]).map((k) => [FIELD_LABELS[k], v[k]]);
}

type Box = { x: number; w: number };

/** Photo (or a "PHOTO" placeholder when the student has none). Round photos are square boxes. */
function photo(d: Design, s: CardStudent, x: number, y: number, w: number, h: number): Prim[] {
  const side = Math.min(w, h);
  const bx = d.photoShape === "round" ? x + (w - side) / 2 : x, bw = d.photoShape === "round" ? side : w, bh = d.photoShape === "round" ? side : h;
  const radius = d.photoShape === "round" ? bw / 2 : d.photoShape === "rounded" ? 2 : 0;
  if (s.photoUrl) return [{ t: "image", x: bx, y, w: bw, h: bh, src: s.photoUrl, shape: d.photoShape }];
  return [
    { t: "rect", x: bx, y, w: bw, h: bh, fill: "#f3f4f6", stroke: "#9ca3af", sw: 0.25, r: radius },
    { t: "text", x: bx, y: y + bh / 2 - 1.2, w: bw, text: "PHOTO", size: 6 * d.fontScale, color: "#6b7280", align: "center", lines: 1 },
  ];
}

/** The label/value rows, fitted into the height that is left. */
function rows(d: Design, s: CardStudent, box: Box, top: number, bottom: number): Prim[] {
  const list = fieldRows(d, s);
  if (list.length === 0) return [];
  const rh = Math.min(3.9, (bottom - top) / list.length);
  const size = Math.min(6.8, rh * 1.95) * d.fontScale;
  const labelW = Math.min(14, box.w * 0.38);
  const out: Prim[] = [];
  list.forEach(([label, value], i) => {
    const y = top + i * rh;
    out.push({ t: "text", x: box.x, y, w: labelW, text: label, size: size * 0.86, color: "#6b7280", lines: 1 });
    out.push({ t: "text", x: box.x + labelW, y, w: box.w - labelW, text: value, size, bold: true, color: d.text, lines: 1 });
  });
  return out;
}

function nameBlock(d: Design, s: CardStudent, x: number, y: number, w: number, align: "left" | "center", base: number): { prims: Prim[]; height: number } {
  const size = (s.name.length > Math.floor(w / (base * PT * 0.56)) * 1.1 ? base - 2 : base) * d.fontScale;
  const lines = estLines(s.name, size, w, 2);
  return { prims: [{ t: "text", x, y, w, text: s.name, size, bold: true, color: d.text, align, lines: 2 }], height: blockHeight(lines, size) };
}

const schoolNameOf = (d: Design, school: CardSchool) => d.schoolName.trim() || school.name;

// ── Front ────────────────────────────────────────────────────────────────────

function frontLandscape(d: Design, s: CardStudent, school: CardSchool): Prim[] {
  const { w: W, h: H } = CARD.landscape;
  const fs = d.fontScale, name = schoolNameOf(d, school), logo = d.showLogo && !!school.logoUrl;
  const p: Prim[] = [];
  const footer = (x: number, w: number): Prim[] => {
    const o: Prim[] = [{ t: "line", x1: x, y1: 48.4, x2: x + w, y2: 48.4, color: d.primary, sw: 0.3 }];
    o.push({ t: "text", x, y: 49.6, w: w * 0.55, text: d.validityText.trim() || defaultValidity(), size: 5.4 * fs, color: "#4b5563", lines: 1 });
    if (d.showSignature) o.push({ t: "text", x: x + w * 0.5, y: 49.6, w: w * 0.5, text: d.signatureLabel, size: 5.4 * fs, bold: true, color: d.text, align: "right", lines: 1 });
    return o;
  };

  if (d.template === "classic") {
    p.push({ t: "rect", x: 0, y: 0, w: W, h: 11.5, fill: d.primary });
    if (logo) p.push({ t: "image", x: 2.2, y: 1.7, w: 8, h: 8, src: school.logoUrl!, shape: "contain" });
    const tx = logo ? 11.5 : 3, tw = W - tx - 2.5;
    p.push({ t: "text", x: tx, y: d.tagline ? 1.6 : 3.3, w: tw, text: name, size: 9.5 * fs, bold: true, color: "#ffffff", align: logo ? "left" : "center", lines: d.tagline ? 1 : 2 });
    if (d.tagline) p.push({ t: "text", x: tx, y: 6.9, w: tw, text: d.tagline, size: 5.6 * fs, color: "#ffffff", align: logo ? "left" : "center", lines: 1 });
    p.push(...photo(d, s, 4, 14.5, 22, 27.5));
    const nb = nameBlock(d, s, 29.5, 14, W - 32, "left", 11.5);
    p.push(...nb.prims, ...rows(d, s, { x: 29.5, w: W - 32 }, 14 + nb.height + 1.6, 47.2), ...footer(3, W - 6));
  } else if (d.template === "modern") {
    p.push({ t: "rect", x: 0, y: 0, w: 27, h: H, fill: d.primary });
    if (logo) p.push({ t: "image", x: 8.5, y: 2.5, w: 10, h: 10, src: school.logoUrl!, shape: "contain" });
    p.push(...photo(d, s, 3.5, 14, 20, 24.5));
    p.push({ t: "text", x: 0, y: 41.5, w: 27, text: s.admissionNo, size: 8.5 * fs, bold: true, color: "#ffffff", align: "center", lines: 1 });
    p.push({ t: "text", x: 0, y: 45.6, w: 27, text: "ADM NO.", size: 4.6 * fs, color: "#ffffff", align: "center", lines: 1 });
    p.push({ t: "text", x: 30, y: 3.2, w: W - 32.5, text: name, size: 8.2 * fs, bold: true, color: d.primary, lines: 2 });
    p.push({ t: "rect", x: 30, y: 11.8, w: 16, h: 0.9, fill: d.accent });
    const nb = nameBlock(d, s, 30, 14.3, W - 32.5, "left", 11);
    p.push(...nb.prims, ...rows(d, s, { x: 30, w: W - 32.5 }, 14.3 + nb.height + 1.6, 47.4));
    p.push({ t: "text", x: 30, y: 49.6, w: 30, text: d.validityText.trim() || defaultValidity(), size: 5.4 * fs, color: "#4b5563", lines: 1 });
    if (d.showSignature) p.push({ t: "text", x: 54, y: 49.6, w: W - 56.5, text: d.signatureLabel, size: 5.4 * fs, bold: true, color: d.text, align: "right", lines: 1 });
  } else {
    p.push({ t: "rect", x: 0, y: 0, w: W, h: 1.8, fill: d.primary }, { t: "rect", x: 0, y: H - 1.8, w: W, h: 1.8, fill: d.accent });
    if (logo) p.push({ t: "image", x: 3.5, y: 4.5, w: 8, h: 8, src: school.logoUrl!, shape: "contain" });
    const tx = logo ? 13 : 3.5;
    p.push({ t: "text", x: tx, y: 5, w: W - tx - 30, text: name, size: 8.5 * fs, bold: true, color: d.primary, lines: 2 });
    p.push(...photo(d, s, W - 26.5, 5, 22, 27));
    const nb = nameBlock(d, s, 3.5, 16, W - 33, "left", 11);
    p.push(...nb.prims, ...rows(d, s, { x: 3.5, w: W - 33 }, 16 + nb.height + 1.6, 46.4));
    p.push({ t: "text", x: 3.5, y: 47.8, w: 40, text: d.validityText.trim() || defaultValidity(), size: 5.4 * fs, color: "#4b5563", lines: 1 });
    if (d.showSignature) p.push({ t: "text", x: W - 33, y: 47.8, w: 29.5, text: d.signatureLabel, size: 5.4 * fs, bold: true, color: d.text, align: "right", lines: 1 });
  }
  return p;
}

function frontPortrait(d: Design, s: CardStudent, school: CardSchool): Prim[] {
  const { w: W, h: H } = CARD.portrait;
  const fs = d.fontScale, name = schoolNameOf(d, school), logo = d.showLogo && !!school.logoUrl;
  const p: Prim[] = [];
  let photoY: number, photoW = 24, photoH = 29;

  if (d.template === "classic") {
    p.push({ t: "rect", x: 0, y: 0, w: W, h: 17.5, fill: d.primary });
    if (logo) p.push({ t: "image", x: (W - 7) / 2, y: 1.5, w: 7, h: 7, src: school.logoUrl!, shape: "contain" });
    p.push({ t: "text", x: 2, y: logo ? 9.2 : 4, w: W - 4, text: name, size: 7 * fs, bold: true, color: "#ffffff", align: "center", lines: 2 });
    if (d.tagline) p.push({ t: "text", x: 2, y: 14.6, w: W - 4, text: d.tagline, size: 4.8 * fs, color: "#ffffff", align: "center", lines: 1 });
    photoY = 20;
  } else if (d.template === "modern") {
    p.push({ t: "rect", x: 0, y: 0, w: W, h: 33, fill: d.primary });
    if (logo) p.push({ t: "image", x: 3, y: 2.5, w: 7, h: 7, src: school.logoUrl!, shape: "contain" });
    p.push({ t: "text", x: logo ? 11.5 : 3, y: 3.2, w: W - (logo ? 14 : 6), text: name, size: 6.6 * fs, bold: true, color: "#ffffff", lines: 2 });
    p.push({ t: "rect", x: (W - photoW) / 2 - 0.9, y: 16.1, w: photoW + 1.8, h: (d.photoShape === "round" ? photoW : photoH) + 1.8, fill: "#ffffff", r: d.photoShape === "round" ? (photoW + 1.8) / 2 : 2.4 });
    photoY = 17;
  } else {
    p.push({ t: "rect", x: 0, y: 0, w: W, h: 2, fill: d.primary }, { t: "rect", x: 0, y: H - 2, w: W, h: 2, fill: d.accent });
    if (logo) p.push({ t: "image", x: (W - 8) / 2, y: 4.5, w: 8, h: 8, src: school.logoUrl!, shape: "contain" });
    p.push({ t: "text", x: 2, y: logo ? 13.5 : 5, w: W - 4, text: name, size: 7 * fs, bold: true, color: d.primary, align: "center", lines: 2 });
    photoW = 22; photoH = 27; photoY = 22.5;
  }
  p.push(...photo(d, s, (W - photoW) / 2, photoY, photoW, photoH));
  const afterPhoto = photoY + (d.photoShape === "round" ? photoW : photoH) + 2.2;
  const nb = nameBlock(d, s, 2, afterPhoto, W - 4, "center", 10);
  p.push(...nb.prims);
  if (d.template === "modern") p.push({ t: "rect", x: (W - 14) / 2, y: afterPhoto + nb.height + 1.5, w: 14, h: 0.8, fill: d.accent });
  const rowsTop = afterPhoto + nb.height + (d.template === "modern" ? 3.9 : 2.6);
  p.push(...rows(d, s, { x: 5, w: W - 10 }, rowsTop, H - 8));
  p.push({ t: "text", x: 2, y: H - 5.4, w: W - 4, text: d.validityText.trim() || defaultValidity(), size: 4.8 * fs, color: "#4b5563", align: "center", lines: 1 });
  if (d.showSignature) p.push({ t: "text", x: 2, y: H - 8.8, w: W - 4, text: d.signatureLabel, size: 4.8 * fs, bold: true, color: d.text, align: "right", lines: 1 });
  return p;
}

export const layoutFront = (d: Design, s: CardStudent, school: CardSchool) => (d.orientation === "landscape" ? frontLandscape(d, s, school) : frontPortrait(d, s, school));

// ── Back ─────────────────────────────────────────────────────────────────────

export function layoutBack(d: Design, s: CardStudent, school: CardSchool): Prim[] {
  const { w: W, h: H } = cardSize(d);
  const fs = d.fontScale, port = d.orientation === "portrait";
  const p: Prim[] = [];
  const topH = port ? 11 : 9;
  p.push({ t: "rect", x: 0, y: 0, w: W, h: topH, fill: d.primary });
  p.push({ t: "text", x: 2, y: topH / 2 - 1.5, w: W - 4, text: d.back.title, size: (port ? 7 : 8) * fs, bold: true, color: "#ffffff", align: "center", lines: 1 });
  const pad = port ? 4 : 5;
  p.push({ t: "text", x: pad, y: topH + 3, w: W - pad * 2, text: d.back.text, size: (port ? 5.6 : 6.2) * fs, color: d.text, lines: port ? 9 : 5 });
  let y = port ? 46 : 33;
  if (d.back.showAddress) {
    p.push({ t: "line", x1: pad, y1: y - 1.2, x2: W - pad, y2: y - 1.2, color: d.accent, sw: 0.35 });
    p.push({ t: "text", x: pad, y, w: W - pad * 2, text: schoolNameOf(d, school), size: 6.4 * fs, bold: true, color: d.primary, lines: 1 });
    const addr = [school.address, school.phone ? `Tel: ${school.phone}` : ""].filter(Boolean).join("\n");
    if (addr) p.push({ t: "text", x: pad, y: y + 3.2, w: W - pad * 2, text: addr, size: 5.6 * fs, color: d.text, lines: 3 });
    y += port ? 15 : 12;
  }
  const emergency = s.emergencyPhone || s.phone;
  if (d.back.showEmergency && emergency) p.push({ t: "text", x: pad, y, w: W - pad * 2, text: `In an emergency call: ${emergency}`, size: 6 * fs, bold: true, color: d.text, lines: 2 });
  p.push({ t: "rect", x: 0, y: H - 5, w: W, h: 5, fill: d.accent });
  if (d.back.footer.trim()) p.push({ t: "text", x: 2, y: H - 3.8, w: W - 4, text: d.back.footer, size: 5 * fs, bold: true, color: "#ffffff", align: "center", lines: 1 });
  return p;
}

// ── Sheets (A4) ──────────────────────────────────────────────────────────────

export const A4 = { w: 210, h: 297 };
export function sheetSpec(d: Design) {
  const { w, h } = cardSize(d);
  const cols = d.orientation === "landscape" ? 2 : 3, rowsN = d.orientation === "landscape" ? 5 : 3;
  const gx = d.orientation === "landscape" ? 6 : 6, gy = d.orientation === "landscape" ? 4 : 6;
  const mx = (A4.w - cols * w - (cols - 1) * gx) / 2, my = (A4.h - rowsN * h - (rowsN - 1) * gy) / 2;
  return { w, h, cols, rows: rowsN, perPage: cols * rowsN, gx, gy, mx, my };
}

/** Top-left corner of the n-th card on a page; backs mirror the columns so each lines up behind its front when the sheet is flipped. */
export function cardPosition(d: Design, n: number, mirror: boolean) {
  const s = sheetSpec(d);
  const col = n % s.cols, row = Math.floor(n / s.cols);
  const c = mirror ? s.cols - 1 - col : col;
  return { x: s.mx + c * (s.w + s.gx), y: s.my + row * (s.h + s.gy) };
}
