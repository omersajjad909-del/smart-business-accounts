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
import { itemMatches, itemSearchKeys } from "@/lib/itemSearch";

export type PickerItem = {
  id: string;
  name: string;
  code?: string | null;
  unit?: string | null;
  /** Shown under the name and searched with it — some catalogues carry the
   *  specification here rather than in the name. */
  description?: string | null;
};

/** Beyond this the list is cut — nobody reads past it, and rendering costs. */
const MAX_VISIBLE = 60;

const MANUAL = "__manual__";

type Props = {
  items: PickerItem[];
  value: string;
  onChange: (id: string) => void;
  /** Passed the key event once the picker has finished with it. */
  onKeyDown?: (e: { key: string; shiftKey: boolean; preventDefault(): void; stopPropagation(): void }) => void;
  allowManual?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
  autoFocus?: boolean;
};

export function ItemPicker({
  items, value, onChange, onKeyDown,
  allowManual = true, placeholder = "Type to search…", style, autoFocus,
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

  const matches = useMemo(() => {
    if (!query.trim()) return indexed.slice(0, MAX_VISIBLE).map((r) => r.item);
    const out: PickerItem[] = [];
    for (const row of indexed) {
      if (itemMatches(query, row.keys)) {
        out.push(row.item);
        if (out.length >= MAX_VISIBLE) break;
      }
    }
    return out;
  }, [indexed, query]);

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

  const shown = open ? query : selected?.name ?? "";

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        value={shown}
        placeholder={selected ? selected.name : placeholder}
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
            minWidth: "100%", maxWidth: 520, maxHeight: 320, overflowY: "auto",
            background: "var(--panel-bg, #14161c)",
            border: "1px solid var(--border, rgba(255,255,255,.14))",
            borderRadius: 10, boxShadow: "0 18px 40px rgba(0,0,0,.45)",
            padding: 4,
          }}
        >
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
                display: "flex", alignItems: "baseline", gap: 10,
                padding: "7px 10px", borderRadius: 7, cursor: "pointer",
                background: index === cursor ? "var(--accent-soft, rgba(99,102,241,.16))" : "transparent",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{
                fontFamily: "ui-monospace, monospace", fontSize: 11.5,
                color: "var(--text-muted, rgba(255,255,255,.4))", minWidth: 62,
              }}>{item.code || "—"}</span>
              <span style={{ fontSize: 13, color: "var(--text-primary, #fff)" }}>
                {item.name}
                {item.description ? (
                  <span style={{ color: "var(--text-muted, rgba(255,255,255,.4))", fontSize: 11.5 }}>
                    {" "}· {item.description}
                  </span>
                ) : null}
              </span>
              {item.unit && (
                <span style={{ fontSize: 11, color: "var(--text-muted, rgba(255,255,255,.35))", marginLeft: "auto", paddingLeft: 12 }}>
                  {item.unit}
                </span>
              )}
            </div>
          ))}

          {matches.length >= MAX_VISIBLE && (
            <div style={{ padding: "6px 10px", fontSize: 11, color: "var(--text-muted)" }}>
              Showing the first {MAX_VISIBLE} — keep typing to narrow it.
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
