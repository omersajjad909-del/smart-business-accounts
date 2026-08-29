"use client";

/**
 * The item cell on a document line: type to narrow, arrow to choose, Enter to
 * take it.
 *
 * Replaces a plain <select>. With a few thousand rolls in the catalogue a
 * native dropdown is a wall of near-identical names — "B2 WHITE 10G 60in L50
 * White PHR26" sits between two others that differ only in the last number —
 * and its type-ahead matches from the first character, so there is no way to
 * reach one except by scrolling.
 *
 * Enter is passed on to the caller once a pick is made, which is what carries
 * the cursor into the PHR cell (rateFormulaEnterHandler). Choosing an item and
 * typing its PHR is one uninterrupted run of keys, the way it was on the old
 * green screen.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { itemMatches, itemSearchKeys } from "@/lib/itemSearch";

export type PickerItem = {
  id: string;
  name: string;
  code?: string | null;
  unit?: string | null;
  meta?: unknown;
  /** Shown under the name and searched with it — some catalogues carry the
   *  specification here rather than in the name. */
  description?: string | null;
};

/**
 * Beyond this the list is cut — rendering a few thousand rows costs more than
 * anyone gains from them. 60 was far too tight for a real catalogue: opening
 * the picker on a 300-item import showed only the first letter group ("B2 …")
 * with no way to scroll to the rest.
 */
const MAX_VISIBLE = 400;

const MANUAL = "__manual__";

type Props = {
  items: PickerItem[];
  value: string;
  onChange: (id: string) => void;
  /** Passed the key event once the picker has finished with it. */
  onKeyDown?: (e: { key: string; shiftKey: boolean; preventDefault(): void; stopPropagation(): void }) => void;
  /**
   * How a picked item reads in the closed cell. A document that carries the
   * dimensions in their own columns shortens it to the product name; the list
   * below is left alone, because there the dimensions are the only thing
   * telling two near-identical rolls apart.
   */
  label?: (item: PickerItem) => string;
  allowManual?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
  autoFocus?: boolean;
  previewFields?: Array<{ key: string; label: string }>;
  /**
   * What to show in those preview columns for one item.
   *
   * Without this the columns read `item.meta` directly, which is empty for
   * every catalogue that writes the specification into the item NAME
   * ("B2 BLUE 10G 50in L50 Blue PHR28") rather than into saved columns — so
   * every cell rendered as "—". Pass the same reader the row uses when the
   * item is picked and the two agree.
   */
  previewValues?: (item: PickerItem) => Record<string, unknown>;
  /**
   * What is on the floor for one item: received, sold, and what is left.
   *
   * Given these, the list grows the three columns the old sale-billing screen
   * carried and offers to hide anything with nothing left — picking a roll the
   * godown does not have is the mistake this catches.
   */
  stockValues?: (item: PickerItem) => { received: number; sold: number; balance: number } | null;
};

export function ItemPicker({
  items, value, onChange, onKeyDown, label,
  allowManual = true, placeholder = "Type to search…", style, autoFocus,
  previewFields = [], previewValues, stockValues,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => items.find((i) => i.id === value) ?? null, [items, value]);

  // Built once per catalogue rather than per keystroke — a few thousand items
  // times a few characters a second is enough to feel it otherwise.
  const indexed = useMemo(
    () => items.map((item) => ({
      item,
      keys: itemSearchKeys(item.name, item.code, item.description),
    })),
    [items],
  );

  // Resolved once per catalogue. Reading the spec out of a name is regex work,
  // and doing it inside the row render would repeat it for every visible row on
  // every keystroke.
  const previewMap = useMemo(() => {
    if (!previewValues || previewFields.length === 0) return null;
    const map = new Map<string, Record<string, unknown>>();
    for (const item of items) map.set(item.id, previewValues(item));
    return map;
  }, [items, previewValues, previewFields.length]);

  const stockMap = useMemo(() => {
    if (!stockValues) return null;
    const map = new Map<string, { received: number; sold: number; balance: number }>();
    for (const item of items) {
      const row = stockValues(item);
      if (row) map.set(item.id, row);
    }
    return map;
  }, [items, stockValues]);

  /** Whether anything in this catalogue is actually in stock. */
  const anyInStock = useMemo(() => {
    if (!stockMap) return false;
    for (const row of stockMap.values()) if (row.balance > 0) return true;
    return false;
  }, [stockMap]);

  // On by default when the company posts its stock, off when nothing has a
  // balance — a filter that empties the list is worse than no filter.
  const [inStockOnly, setInStockOnly] = useState(true);
  const stockFilterOn = Boolean(stockMap) && anyInStock && inStockOnly;

  const matches = useMemo(() => {
    const keep = (item: PickerItem) =>
      !stockFilterOn || (stockMap?.get(item.id)?.balance ?? 0) > 0;
    const wanted = query.trim();
    const out: PickerItem[] = [];
    for (const row of indexed) {
      if (!keep(row.item)) continue;
      if (wanted && !itemMatches(wanted, row.keys)) continue;
      out.push(row.item);
      if (out.length >= MAX_VISIBLE) break;
    }
    return out;
  }, [indexed, query, stockFilterOn, stockMap]);

  useEffect(() => { setCursor(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  // Keeps the highlighted row in view when it is walked past the fold.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const row = listRef.current.children[cursor] as HTMLElement | undefined;
    row?.scrollIntoView({ block: "nearest" });
  }, [cursor, open]);

  function take(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  function keyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      const last = matches.length - 1 + (allowManual ? 1 : 0);
      setCursor((c) => Math.max(0, Math.min(last, c + (e.key === "ArrowDown" ? 1 : -1))));
      return;
    }
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "Enter") {
      if (open) {
        const manualRow = allowManual && cursor === matches.length;
        const hit = manualRow ? MANUAL : matches[cursor]?.id;
        if (hit) {
          e.preventDefault();
          take(hit);
          // Handed on so the cursor lands in the next cell, exactly as it did
          // when this was a <select>.
          onKeyDown?.(e);
          return;
        }
      }
      onKeyDown?.(e);
      return;
    }
  }

  const selectedLabel = selected ? (label ? label(selected) : selected.name) : "";
  const shown = open ? query : selectedLabel;
  const showStock = Boolean(stockMap);
  // The quality is the column being read; the rest are two or three figures
  // each. Given the room, "CRYSTAL SUPER CLEAR (DIAMOND)" has to arrive whole —
  // cut to "CRYSTAL SUPER CLEAR …" two different qualities read alike.
  const previewColumns = previewFields.length
    ? `minmax(260px, 2.6fr) repeat(${previewFields.length}, minmax(56px, 1fr)) minmax(52px, .7fr)${showStock ? " repeat(3, minmax(58px, .8fr))" : ""}`
    : "minmax(170px, 1fr) minmax(62px, auto) minmax(48px, auto)";

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        value={shown}
        placeholder={selected ? selectedLabel : placeholder}
        autoFocus={autoFocus}
        spellCheck={false}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={keyDown}
        style={{
          width: "100%", boxSizing: "border-box", outline: "none",
          textOverflow: "ellipsis",
          ...style,
        }}
      />

      {open && (
        <div
          ref={listRef}
          style={{
            position: "absolute", zIndex: 60, top: "calc(100% + 4px)", left: 0,
            minWidth: "100%",
            // Shrink-to-fit up to the ceiling: the box takes only what the
            // longest name asks for, and stops short of the window edge.
            maxWidth: previewFields.length ? "min(1180px, calc(100vw - 40px))" : 520,
            maxHeight: "min(620px, calc(100vh - 160px))", overflowY: "auto",
            background: "var(--panel-bg, #14161c)",
            border: "1px solid var(--border, rgba(255,255,255,.14))",
            borderRadius: 10, boxShadow: "0 18px 40px rgba(0,0,0,.45)",
            padding: 4,
          }}
        >
          {showStock && anyInStock && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 10px 7px", borderBottom: "1px solid var(--border, rgba(255,255,255,.12))" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted, rgba(255,255,255,.5))" }}>
                {matches.length} shown{inStockOnly ? " — in stock" : ""}
              </span>
              <label
                onMouseDown={(e) => e.preventDefault()}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, cursor: "pointer", color: "var(--text-muted, rgba(255,255,255,.6))" }}
              >
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  style={{ accentColor: "var(--accent, #6366f1)", cursor: "pointer" }}
                />
                In stock only
              </label>
            </div>
          )}

          {previewFields.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: previewColumns, gap: 8, padding: "7px 10px", borderBottom: "1px solid var(--border, rgba(255,255,255,.12))", color: "var(--text-muted, rgba(255,255,255,.5))", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em" }}>
              <span>Quality / Item</span>
              {previewFields.map((field) => <span key={field.key} style={{ textAlign: "center" }}>{field.label}</span>)}
              <span style={{ textAlign: "right" }}>Unit</span>
              {showStock && <><span style={{ textAlign: "right" }}>R.Qty</span><span style={{ textAlign: "right" }}>Sold</span><span style={{ textAlign: "right" }}>Bal</span></>}
            </div>
          )}

          {matches.length === 0 && !allowManual && (
            <div style={{ padding: "10px 12px", fontSize: 12.5, color: "var(--text-muted)" }}>
              Nothing matches “{query}”
            </div>
          )}

          {matches.map((item, index) => (
            <div
              key={item.id}
              onMouseDown={(e) => { e.preventDefault(); take(item.id); }}
              onMouseEnter={() => setCursor(index)}
              style={{
                display: previewFields.length ? "grid" : "flex",
                gridTemplateColumns: previewFields.length ? previewColumns : undefined,
                alignItems: "center", gap: 8,
                padding: "7px 10px", borderRadius: 7, cursor: "pointer",
                background: index === cursor ? "var(--accent-soft, rgba(99,102,241,.16))" : "transparent",
                whiteSpace: "nowrap",
              }}
            >
              <span
                title={item.name}
                style={{
                  fontFamily: "ui-monospace, monospace", fontSize: 12.5,
                  // With the dimensions in their own columns the full name is
                  // the same figures written twice, and it overflowed into the
                  // Gauge column. The shortened label is what the picked cell
                  // shows too, so the list and the line read alike.
                  color: previewFields.length ? "var(--text-primary, #fff)" : "var(--text-muted, rgba(255,255,255,.4))",
                  minWidth: 62, overflow: "hidden", textOverflow: "ellipsis",
                }}
              >{previewFields.length ? (label ? label(item) : item.name) : (item.code || "—")}</span>
              {!previewFields.length && <span style={{ fontSize: 13, color: "var(--text-primary, #fff)" }}>
                {item.name}
                {item.description ? (
                  <span style={{ color: "var(--text-muted, rgba(255,255,255,.4))", fontSize: 11.5 }}>
                    {" "}· {item.description}
                  </span>
                ) : null}
              </span>}
              {previewFields.map((field) => {
                const resolved = previewMap?.get(item.id);
                const metadata = item.meta && typeof item.meta === "object" ? item.meta as Record<string, unknown> : null;
                const raw = resolved?.[field.key] ?? metadata?.[field.key];
                const text = raw === undefined || raw === null || raw === "" ? "—" : String(raw);
                return <span key={field.key} style={{ textAlign: "center", fontSize: 12, color: text === "—" ? "var(--text-muted, rgba(255,255,255,.35))" : "var(--text-primary, #fff)" }}>{text}</span>;
              })}
              {(item.unit || previewFields.length > 0) && (
                <span style={{ fontSize: 11, color: "var(--text-muted, rgba(255,255,255,.35))", marginLeft: previewFields.length ? 0 : "auto", paddingLeft: previewFields.length ? 0 : 12, textAlign: previewFields.length ? "right" : undefined }}>
                  {item.unit || "—"}
                </span>
              )}
              {showStock && (() => {
                const st = stockMap?.get(item.id);
                const cell = (n: number | undefined, tone?: string) => (
                  <span style={{ textAlign: "right", fontSize: 12, fontVariantNumeric: "tabular-nums", color: tone ?? "var(--text-muted, rgba(255,255,255,.55))" }}>
                    {n === undefined ? "—" : n.toLocaleString()}
                  </span>
                );
                return (
                  <>
                    {cell(st?.received)}
                    {cell(st?.sold)}
                    {/* The one figure the operator is really reading: what is
                        left. Red at zero so an out-of-stock roll cannot be
                        picked by accident when the filter is switched off. */}
                    {cell(st?.balance, (st?.balance ?? 0) > 0 ? "var(--text-primary, #fff)" : "var(--danger, #f87171)")}
                  </>
                );
              })()}
            </div>
          ))}

          {matches.length >= MAX_VISIBLE && (
            <div style={{ padding: "6px 10px", fontSize: 11, color: "var(--text-muted)" }}>
              Showing the first {MAX_VISIBLE} of {items.length} — keep typing to narrow it.
            </div>
          )}

          {allowManual && (
            <div
              onMouseDown={(e) => { e.preventDefault(); take(MANUAL); }}
              onMouseEnter={() => setCursor(matches.length)}
              style={{
                padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontSize: 12.5,
                borderTop: "1px solid var(--border, rgba(255,255,255,.08))", marginTop: 4,
                color: "var(--text-muted, rgba(255,255,255,.5))",
                background: cursor === matches.length ? "var(--accent-soft, rgba(99,102,241,.16))" : "transparent",
              }}
            >
              ✎ Type manually…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
