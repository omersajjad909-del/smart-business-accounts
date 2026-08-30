"use client";

/**
 * The item cell on a document line: type to narrow, arrow to choose, Enter to
 * take it.
 *
 * Replaces a plain <select>. With a few thousand rolls in the catalogue a
 * native dropdown is a wall of near-identical names.
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
  description?: string | null;
};

const MAX_VISIBLE = 400;

const MANUAL = "__manual__";

type Props = {
  items: PickerItem[];
  value: string;
  onChange: (id: string) => void;

  onKeyDown?: (e: {
    key: string;
    shiftKey: boolean;
    preventDefault(): void;
    stopPropagation(): void;
  }) => void;

  label?: (item: PickerItem) => string;

  /**
   * A short badge on each row — the quantity a purchase order is expecting,
   * say. `label` cannot serve this: it is only read when `previewFields` are
   * given, and it replaces the row's text rather than adding to it.
   */
  note?: (item: PickerItem) => string | null | undefined;

  allowManual?: boolean;
  placeholder?: string;
  inputId?: string;
  style?: React.CSSProperties;
  autoFocus?: boolean;

  previewFields?: Array<{
    key: string;
    label: string;
  }>;

  previewValues?: (
    item: PickerItem
  ) => Record<string, unknown>;

  stockValues?: (
    item: PickerItem
  ) => {
    received: number;
    sold: number;
    balance: number;
  } | null;
};

export function ItemPicker({
  items,
  value,
  onChange,
  onKeyDown,
  label,
  note,
  allowManual = true,
  placeholder = "Type to search…",
  inputId,
  style,
  autoFocus,
  previewFields = [],
  previewValues,
  stockValues,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  /*
   * ------------------------------------------------------------
   * RESIZABLE PICKER
   * ------------------------------------------------------------
   *
   * Default height = 620px
   * Minimum height = 220px
   *
   * User can drag the handle at the bottom to resize.
   */
  const DEFAULT_HEIGHT = 620;
  const MIN_HEIGHT = 220;

  const [pickerHeight, setPickerHeight] =
    useState(DEFAULT_HEIGHT);

  const resizingRef = useRef(false);
  const resizeStartYRef = useRef(0);
  const resizeStartHeightRef = useRef(DEFAULT_HEIGHT);

  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /*
   * The picker is rendered into <body> and positioned by hand: the line
   * grid it sits in clips overflow, so an absolutely positioned panel was
   * being cut down to its first row.
   */
  const [anchor, setAnchor] = useState<{
    top: number;
    left: number;
    bottom: number;
    width: number;
  } | null>(null);

  const selected = useMemo(
    () =>
      items.find((i) => i.id === value) ?? null,
    [items, value]
  );

  // ------------------------------------------------------------
  // Search index
  // ------------------------------------------------------------

  const indexed = useMemo(
    () =>
      items.map((item) => ({
        item,
        keys: itemSearchKeys(
          item.name,
          item.code,
          item.description
        ),
      })),
    [items]
  );

  // ------------------------------------------------------------
  // Preview values
  // ------------------------------------------------------------

  const previewMap = useMemo(() => {
    if (!previewValues || previewFields.length === 0) {
      return null;
    }

    const map = new Map<
      string,
      Record<string, unknown>
    >();

    for (const item of items) {
      map.set(
        item.id,
        previewValues(item)
      );
    }

    return map;
  }, [
    items,
    previewValues,
    previewFields.length,
  ]);

  // ------------------------------------------------------------
  // Stock values
  // ------------------------------------------------------------

  const stockMap = useMemo(() => {
    if (!stockValues) return null;

    const map = new Map<
      string,
      {
        received: number;
        sold: number;
        balance: number;
      }
    >();

    for (const item of items) {
      const row = stockValues(item);

      if (row) {
        map.set(item.id, row);
      }
    }

    return map;
  }, [items, stockValues]);

  const anyInStock = useMemo(() => {
    if (!stockMap) return false;

    for (const row of stockMap.values()) {
      if (row.balance > 0) {
        return true;
      }
    }

    return false;
  }, [stockMap]);

  const [inStockOnly, setInStockOnly] =
    useState(true);

  const stockFilterOn =
    Boolean(stockMap) &&
    anyInStock &&
    inStockOnly;

  // ------------------------------------------------------------
  // Filtered items
  // ------------------------------------------------------------

  const matches = useMemo(() => {
    const keep = (item: PickerItem) =>
      !stockFilterOn ||
      (stockMap?.get(item.id)?.balance ?? 0) > 0;

    const wanted = query.trim();

    const out: PickerItem[] = [];

    for (const row of indexed) {
      if (!keep(row.item)) continue;

      if (
        wanted &&
        !itemMatches(wanted, row.keys)
      ) {
        continue;
      }

      out.push(row.item);

      if (out.length >= MAX_VISIBLE) {
        break;
      }
    }

    return out;
  }, [
    indexed,
    query,
    stockFilterOn,
    stockMap,
  ]);

  // ------------------------------------------------------------
  // Reset cursor on search
  // ------------------------------------------------------------

  useEffect(() => {
    setCursor(0);
  }, [query]);

  // ------------------------------------------------------------
  // Track the input's position on screen
  // ------------------------------------------------------------

  useEffect(() => {
    if (!open) return;

    const measure = () => {
      const el = boxRef.current;
      if (!el) return;

      const r = el.getBoundingClientRect();

      setAnchor({
        top: r.top,
        left: r.left,
        bottom: r.bottom,
        width: r.width,
      });
    };

    measure();

    // Capture phase: the invoice grid scrolls inside its own panel.
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);

    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open]);

  // ------------------------------------------------------------
  // Close when clicking outside
  // ------------------------------------------------------------

  useEffect(() => {
    if (!open) return;

    const away = (e: MouseEvent) => {
      const target = e.target as Node;

      if (
        boxRef.current &&
        !boxRef.current.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      away
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        away
      );
    };
  }, [open]);

  // ------------------------------------------------------------
  // Keep highlighted row visible
  // ------------------------------------------------------------

  useEffect(() => {
    if (!open || !listRef.current) return;

    const row =
      listRef.current.children[
        cursor
      ] as HTMLElement | undefined;

    row?.scrollIntoView({
      block: "nearest",
    });
  }, [cursor, open]);

  // ------------------------------------------------------------
  // RESIZE HANDLERS
  // ------------------------------------------------------------

  function startResize(
    e: React.PointerEvent<HTMLDivElement>
  ) {
    e.preventDefault();
    e.stopPropagation();

    resizingRef.current = true;

    resizeStartYRef.current = e.clientY;
    resizeStartHeightRef.current =
      pickerHeight;

    e.currentTarget.setPointerCapture(
      e.pointerId
    );
  }

  function moveResize(
    e: React.PointerEvent<HTMLDivElement>
  ) {
    if (!resizingRef.current) return;

    e.preventDefault();

    const delta =
      e.clientY -
      resizeStartYRef.current;

    let newHeight =
      resizeStartHeightRef.current +
      delta;

    // Minimum
    newHeight = Math.max(
      MIN_HEIGHT,
      newHeight
    );

    // Maximum available viewport height
    const maxHeight =
      window.innerHeight - 160;

    newHeight = Math.min(
      maxHeight,
      newHeight
    );

    setPickerHeight(newHeight);
  }

  function stopResize(
    e: React.PointerEvent<HTMLDivElement>
  ) {
    resizingRef.current = false;

    try {
      e.currentTarget.releasePointerCapture(
        e.pointerId
      );
    } catch {
      // Pointer capture may already have been released.
    }
  }

  // ------------------------------------------------------------
  // Select item
  // ------------------------------------------------------------

  function take(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  // ------------------------------------------------------------
  // Keyboard handling
  // ------------------------------------------------------------

  function keyDown(
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (
      e.key === "ArrowDown" ||
      e.key === "ArrowUp"
    ) {
      e.preventDefault();

      if (!open) {
        setOpen(true);
        return;
      }

      const last =
        matches.length -
        1 +
        (allowManual ? 1 : 0);

      setCursor((c) =>
        Math.max(
          0,
          Math.min(
            last,
            c +
              (e.key === "ArrowDown"
                ? 1
                : -1)
          )
        )
      );

      return;
    }

    if (e.key === "Escape") {
      setOpen(false);
      return;
    }

    if (e.key === "Enter") {
      // Closed list: this is the keystroke that asks for it. It does not fall
      // through to the parent, so the row does not advance — the operator gets
      // the list they just asked for, and the next Enter picks from it.
      if (!open) {
        e.preventDefault();
        setOpen(true);
        return;
      }

      const manualRow =
        allowManual &&
        cursor === matches.length;

      const hit = manualRow
        ? MANUAL
        : matches[cursor]?.id;

      if (hit) {
        e.preventDefault();

        take(hit);

        onKeyDown?.(e);

        return;
      }

      // Open, but nothing under the cursor to take — let the row advance.
      onKeyDown?.(e);
    }
  }

  // ------------------------------------------------------------
  // Display
  // ------------------------------------------------------------

  const selectedLabel = selected
    ? label
      ? label(selected)
      : selected.name
    : "";

  const shown = open
    ? query
    : selectedLabel;

  const showStock = Boolean(stockMap);

  const previewColumns =
    previewFields.length
      ? `minmax(260px, 2.6fr) repeat(${previewFields.length}, minmax(56px, 1fr)) minmax(52px, .7fr)${
          showStock
            ? " repeat(3, minmax(58px, .8fr))"
            : ""
        }`
      : "minmax(170px, 1fr) minmax(62px, auto) minmax(48px, auto)";

  // ------------------------------------------------------------
  // Where the panel goes
  // ------------------------------------------------------------

  const viewportH =
    typeof window === "undefined" ? 900 : window.innerHeight;
  const viewportW =
    typeof window === "undefined" ? 1440 : window.innerWidth;

  const roomBelow = anchor ? viewportH - anchor.bottom - 12 : 0;
  const roomAbove = anchor ? anchor.top - 12 : 0;

  // Only flip when below is genuinely cramped and above has more room.
  const dropUp =
    Boolean(anchor) &&
    roomBelow < Math.min(pickerHeight, 320) &&
    roomAbove > roomBelow;

  const panelHeight = Math.max(
    MIN_HEIGHT,
    Math.min(pickerHeight, dropUp ? roomAbove : roomBelow)
  );

  return (
    <div
      ref={boxRef}
      style={{
        position: "relative",
      }}
    >
      {/* ----------------------------------------------------
          INPUT
      ---------------------------------------------------- */}

      <input
        id={inputId}
        value={shown}
        placeholder={
          selected
            ? selectedLabel
            : placeholder
        }
        autoFocus={autoFocus}
        spellCheck={false}
        onFocus={() => {
          // Arriving here does not open the list any more.
          //
          // Enter from the cell before lands focus in this one, and the list
          // used to spring open on that same keystroke — covering the qty and
          // rate fields on every single pass down the row, whether or not the
          // operator wanted to change the item. Opening is now something asked
          // for: press Enter again, start typing, or click.
          setQuery("");
        }}
        onMouseDown={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={keyDown}
        style={{
          width: "100%",
          boxSizing: "border-box",
          outline: "none",
          textOverflow: "ellipsis",
          ...style,
        }}
      />

      {/* ----------------------------------------------------
          PICKER
      ---------------------------------------------------- */}

      {open && anchor && createPortal(
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            zIndex: 4000,

            // Below the cell when there is room, above it when there isn't.
            ...(dropUp
              ? { bottom: viewportH - anchor.top + 4 }
              : { top: anchor.bottom + 4 }),

            left: anchor.left,

            minWidth: anchor.width,

            maxWidth: Math.max(
              320,
              Math.min(
                previewFields.length ? 1180 : 520,
                viewportW - anchor.left - 16
              )
            ),

            /*
             * THIS IS THE RESIZABLE HEIGHT
             */
            height: `${panelHeight}px`,

            background:
              "var(--panel-bg, #14161c)",

            border:
              "1px solid var(--border, rgba(255,255,255,.14))",

            borderRadius: 10,

            boxShadow:
              "0 18px 40px rgba(0,0,0,.45)",

            padding: 4,

            /*
             * Important:
             * Outer box does NOT scroll.
             * Inner list below handles scrolling.
             */
            overflow: "hidden",

            boxSizing: "border-box",
          }}
        >
          {/* ------------------------------------------------
              SCROLLABLE CONTENT
          ------------------------------------------------ */}

          <div
            ref={listRef}
            style={{
              height: "100%",
              overflowY: "auto",
              overflowX: "hidden",
              paddingBottom: 14,
            }}
          >
            {/* ------------------------------------------------
                STOCK FILTER
            ------------------------------------------------ */}

            {showStock && anyInStock && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  gap: 8,
                  padding:
                    "6px 10px 7px",
                  borderBottom:
                    "1px solid var(--border, rgba(255,255,255,.12))",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color:
                      "var(--text-muted, rgba(255,255,255,.5))",
                  }}
                >
                  {matches.length} shown
                  {inStockOnly
                    ? " — in stock"
                    : ""}
                </span>

                <label
                  onMouseDown={(e) =>
                    e.preventDefault()
                  }
                  style={{
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    gap: 6,
                    fontSize: 11,
                    cursor:
                      "pointer",
                    color:
                      "var(--text-muted, rgba(255,255,255,.6))",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      inStockOnly
                    }
                    onChange={(e) =>
                      setInStockOnly(
                        e.target.checked
                      )
                    }
                    style={{
                      accentColor:
                        "var(--accent, #6366f1)",
                      cursor:
                        "pointer",
                    }}
                  />

                  In stock only
                </label>
              </div>
            )}

            {/* ------------------------------------------------
                TABLE HEADER
            ------------------------------------------------ */}

            {previewFields.length >
              0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    previewColumns,
                  gap: 8,
                  padding:
                    "7px 10px",
                  borderBottom:
                    "1px solid var(--border, rgba(255,255,255,.12))",
                  color:
                    "var(--text-muted, rgba(255,255,255,.5))",
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    ".04em",
                  position:
                    "sticky",
                  top: 0,
                  zIndex: 2,
                  background:
                    "var(--panel-bg, #14161c)",
                }}
              >
                <span>
                  Quality / Item
                </span>

                {previewFields.map(
                  (field) => (
                    <span
                      key={
                        field.key
                      }
                      style={{
                        textAlign:
                          "center",
                      }}
                    >
                      {
                        field.label
                      }
                    </span>
                  )
                )}

                <span
                  style={{
                    textAlign:
                      "right",
                  }}
                >
                  Unit
                </span>

                {showStock && (
                  <>
                    <span
                      style={{
                        textAlign:
                          "right",
                      }}
                    >
                      R.Qty
                    </span>

                    <span
                      style={{
                        textAlign:
                          "right",
                      }}
                    >
                      Sold
                    </span>

                    <span
                      style={{
                        textAlign:
                          "right",
                      }}
                    >
                      Bal
                    </span>
                  </>
                )}
              </div>
            )}

            {/* ------------------------------------------------
                NO RESULTS
            ------------------------------------------------ */}

            {matches.length === 0 &&
              !allowManual && (
                <div
                  style={{
                    padding:
                      "10px 12px",
                    fontSize: 12.5,
                    color:
                      "var(--text-muted)",
                  }}
                >
                  Nothing matches “
                  {query}”
                </div>
              )}

            {/* ------------------------------------------------
                ITEMS
            ------------------------------------------------ */}

            {matches.map(
              (item, index) => (
                <div
                  key={item.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    take(item.id);
                  }}
                  onMouseEnter={() =>
                    setCursor(index)
                  }
                  style={{
                    display:
                      previewFields.length
                        ? "grid"
                        : "flex",

                    gridTemplateColumns:
                      previewFields.length
                        ? previewColumns
                        : undefined,

                    alignItems:
                      "center",

                    gap: 8,

                    padding:
                      "7px 10px",

                    borderRadius: 7,

                    cursor:
                      "pointer",

                    background:
                      index === cursor
                        ? "var(--accent-soft, rgba(99,102,241,.16))"
                        : "transparent",

                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {/* QUALITY / ITEM */}

                  <span
                    title={item.name}
                    style={{
                      fontFamily:
                        "ui-monospace, monospace",

                      fontSize: 12.5,

                      color:
                        previewFields.length
                          ? "var(--text-primary, #fff)"
                          : "var(--text-muted, rgba(255,255,255,.4))",

                      minWidth: 62,

                      overflow:
                        "hidden",

                      textOverflow:
                        "ellipsis",
                    }}
                  >
                    {previewFields.length
                      ? label
                        ? label(item)
                        : item.name
                      : item.code ||
                        "—"}
                  </span>

                  {/* NAME */}

                  {!previewFields.length && (
                    <span
                      style={{
                        fontSize: 13,
                        color:
                          "var(--text-primary, #fff)",
                      }}
                    >
                      {item.name}

                      {item.description ? (
                        <span
                          style={{
                            color:
                              "var(--text-muted, rgba(255,255,255,.4))",

                            fontSize:
                              11.5,
                          }}
                        >
                          {" "}
                          ·{" "}
                          {
                            item.description
                          }
                        </span>
                      ) : null}
                    </span>
                  )}

                  {/* PREVIEW FIELDS */}

                  {previewFields.map(
                    (field) => {
                      const resolved =
                        previewMap?.get(
                          item.id
                        );

                      const metadata =
                        item.meta &&
                        typeof item.meta ===
                          "object"
                          ? (item.meta as Record<
                              string,
                              unknown
                            >)
                          : null;

                      const raw =
                        resolved?.[
                          field.key
                        ] ??
                        metadata?.[
                          field.key
                        ];

                      const text =
                        raw ===
                          undefined ||
                        raw === null ||
                        raw === ""
                          ? "—"
                          : String(raw);

                      return (
                        <span
                          key={
                            field.key
                          }
                          style={{
                            textAlign:
                              "center",

                            fontSize: 12,

                            color:
                              text ===
                              "—"
                                ? "var(--text-muted, rgba(255,255,255,.35))"
                                : "var(--text-primary, #fff)",
                          }}
                        >
                          {text}
                        </span>
                      );
                    }
                  )}

                  {/* NOTE */}

                  {(() => {
                    const text =
                      note?.(item);
                    if (!text) return null;
                    return (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          marginLeft: 10,
                          padding:
                            "1px 7px",
                          borderRadius: 5,
                          whiteSpace:
                            "nowrap",
                          background:
                            "rgba(52,211,153,.12)",
                          color:
                            "#34d399",
                        }}
                      >
                        {text}
                      </span>
                    );
                  })()}

                  {/* UNIT */}

                  {(item.unit ||
                    previewFields.length >
                      0) && (
                    <span
                      style={{
                        fontSize: 11,

                        color:
                          "var(--text-muted, rgba(255,255,255,.35))",

                        marginLeft:
                          previewFields.length
                            ? 0
                            : "auto",

                        paddingLeft:
                          previewFields.length
                            ? 0
                            : 12,

                        textAlign:
                          previewFields.length
                            ? "right"
                            : undefined,
                      }}
                    >
                      {item.unit ||
                        "—"}
                    </span>
                  )}

                  {/* STOCK */}

                  {showStock &&
                    (() => {
                      const st =
                        stockMap?.get(
                          item.id
                        );

                      const cell = (
                        n:
                          | number
                          | undefined,
                        tone?: string
                      ) => (
                        <span
                          style={{
                            textAlign:
                              "right",

                            fontSize: 12,

                            fontVariantNumeric:
                              "tabular-nums",

                            color:
                              tone ??
                              "var(--text-muted, rgba(255,255,255,.55))",
                          }}
                        >
                          {n ===
                          undefined
                            ? "—"
                            : n.toLocaleString()}
                        </span>
                      );

                      return (
                        <>
                          {cell(
                            st?.received
                          )}

                          {cell(
                            st?.sold
                          )}

                          {cell(
                            st?.balance,
                            (st?.balance ??
                              0) > 0
                              ? "var(--text-primary, #fff)"
                              : "var(--danger, #f87171)"
                          )}
                        </>
                      );
                    })()}
                </div>
              )
            )}

            {/* ------------------------------------------------
                MAX VISIBLE MESSAGE
            ------------------------------------------------ */}

            {matches.length >=
              MAX_VISIBLE && (
              <div
                style={{
                  padding:
                    "6px 10px",
                  fontSize: 11,
                  color:
                    "var(--text-muted)",
                }}
              >
                Showing the first{" "}
                {MAX_VISIBLE} of{" "}
                {items.length} —
                keep typing to narrow
                it.
              </div>
            )}

            {/* ------------------------------------------------
                MANUAL
            ------------------------------------------------ */}

            {allowManual && (
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  take(MANUAL);
                }}
                onMouseEnter={() =>
                  setCursor(
                    matches.length
                  )
                }
                style={{
                  padding:
                    "7px 10px",

                  borderTop:
                    "1px solid var(--border, rgba(255,255,255,.08))",

                  marginTop: 4,

                  borderRadius: 7,

                  cursor:
                    "pointer",

                  fontSize: 12.5,

                  color:
                    "var(--text-muted, rgba(255,255,255,.5))",

                  background:
                    cursor ===
                    matches.length
                      ? "var(--accent-soft, rgba(99,102,241,.16))"
                      : "transparent",
                }}
              >
                ✎ Type manually…
              </div>
            )}
          </div>

          {/* ------------------------------------------------
              RESIZE HANDLE
          ------------------------------------------------
          
              Isko bottom par mouse se drag karein.
          ------------------------------------------------ */}

          <div
            onPointerDown={
              startResize
            }
            onPointerMove={
              moveResize
            }
            onPointerUp={
              stopResize
            }
            onPointerCancel={
              stopResize
            }
            style={{
              position:
                "absolute",

              bottom: 0,
              left: 0,
              right: 0,

              height: 10,

              cursor:
                "ns-resize",

              zIndex: 10,

              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",

              background:
                "transparent",

              touchAction:
                "none",
            }}
          >
            {/* Visual grip */}

            <div
              style={{
                width: 42,
                height: 4,
                borderRadius: 999,

                background:
                  "var(--border, rgba(255,255,255,.28))",

                opacity: 0.8,
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
