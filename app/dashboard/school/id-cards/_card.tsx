"use client";
import type { CSSProperties } from "react";
import { cardPosition, cardSize, layoutBack, layoutFront, LINE_HEIGHT, sheetSpec, type CardSchool, type CardStudent, type Design, type Prim } from "@/lib/idCardDesign";

const FONT = "Helvetica, Arial, sans-serif";
const PT_MM = 0.3528;
const PX_PER_MM = 3.7795;

function PrimView({ p }: { p: Prim }) {
  const box = (x: number, y: number, w: number, h: number): CSSProperties => ({ position: "absolute", left: `${x}mm`, top: `${y}mm`, width: `${w}mm`, height: `${h}mm` });
  if (p.t === "rect") {
    return <div style={{ ...box(p.x, p.y, p.w, p.h), background: p.fill, border: p.stroke ? `${p.sw ?? 0.2}mm solid ${p.stroke}` : undefined, borderRadius: p.r ? `${p.r}mm` : undefined, boxSizing: "border-box" }} />;
  }
  if (p.t === "line") {
    const horizontal = Math.abs(p.y1 - p.y2) < 0.001;
    return <div style={horizontal ? { ...box(Math.min(p.x1, p.x2), p.y1 - p.sw / 2, Math.abs(p.x2 - p.x1), p.sw), background: p.color } : { ...box(p.x1 - p.sw / 2, Math.min(p.y1, p.y2), p.sw, Math.abs(p.y2 - p.y1)), background: p.color }} />;
  }
  if (p.t === "image") {
    const radius = p.shape === "round" ? "50%" : p.shape === "rounded" ? "2mm" : undefined;
    // eslint-disable-next-line @next/next/no-img-element
    return <div style={{ ...box(p.x, p.y, p.w, p.h), borderRadius: radius, overflow: "hidden" }}><img src={p.src} alt="" style={{ width: "100%", height: "100%", objectFit: p.shape === "contain" ? "contain" : "cover", display: "block" }} /></div>;
  }
  const lineH = p.size * PT_MM * LINE_HEIGHT;
  return (
    <div style={{ ...box(p.x, p.y, p.w, lineH * p.lines), fontFamily: FONT, fontSize: `${p.size}pt`, lineHeight: LINE_HEIGHT, fontWeight: p.bold ? 700 : 400, color: p.color, textAlign: p.align ?? "left", whiteSpace: "pre-wrap", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: p.lines, WebkitBoxOrient: "vertical", wordBreak: "break-word" }}>{p.text}</div>
  );
}

/** One side of one card, in true millimetres. */
export function Face({ design, student, school, side }: { design: Design; student: CardStudent; school: CardSchool; side: "front" | "back" }) {
  const { w, h } = cardSize(design);
  const prims = side === "front" ? layoutFront(design, student, school) : layoutBack(design, student, school);
  return (
    <div style={{ position: "relative", width: `${w}mm`, height: `${h}mm`, background: design.background, overflow: "hidden", fontFamily: FONT, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
      {prims.map((p, i) => <PrimView key={i} p={p} />)}
    </div>
  );
}

/** A card scaled for the screen. `k` is screen pixels per millimetre. */
export function FacePreview({ k, ...props }: { k: number; design: Design; student: CardStudent; school: CardSchool; side: "front" | "back" }) {
  const { w, h } = cardSize(props.design);
  const scale = k / PX_PER_MM;
  return (
    <div style={{ width: w * k, height: h * k, borderRadius: 6 * scale, overflow: "hidden", boxShadow: "0 6px 22px rgba(0,0,0,.28)", background: "#fff", flexShrink: 0 }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: `${w}mm`, height: `${h}mm` }}><Face {...props} /></div>
    </div>
  );
}

/** A4 sheets for the printer: a sheet of fronts, then its sheet of backs (columns mirrored for double-sided printing). */
export function Sheets({ design, students, school, includeBack, mirrorBack, cutGuides }: { design: Design; students: CardStudent[]; school: CardSchool; includeBack: boolean; mirrorBack: boolean; cutGuides: boolean }) {
  const spec = sheetSpec(design);
  const pages: { side: "front" | "back"; items: CardStudent[] }[] = [];
  for (let i = 0; i < students.length; i += spec.perPage) {
    const chunk = students.slice(i, i + spec.perPage);
    pages.push({ side: "front", items: chunk });
    if (includeBack && design.back.show) pages.push({ side: "back", items: chunk });
  }
  return (
    <>
      {pages.map((pg, n) => (
        <div key={n} style={{ position: "relative", width: "210mm", height: "297mm", background: "#fff", overflow: "hidden", breakAfter: n === pages.length - 1 ? "auto" : "page", pageBreakAfter: n === pages.length - 1 ? "auto" : "always", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
          {pg.items.map((s, i) => {
            const pos = cardPosition(design, i, pg.side === "back" && mirrorBack);
            return (
              <div key={i} style={{ position: "absolute", left: `${pos.x}mm`, top: `${pos.y}mm`, outline: cutGuides ? "0.1mm solid #9ca3af" : undefined }}>
                <Face design={design} student={s} school={school} side={pg.side} />
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
