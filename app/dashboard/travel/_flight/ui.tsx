"use client";

/**
 * The small parts the flight pages are built from.
 *
 * Everything here is theme-variable driven rather than painted in fixed darks,
 * because the shell around these pages switches between light and dark and a
 * booking screen that only works in one of them is half a booking screen.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { useCurrency } from "@/lib/useCurrency";
import {
  CABIN_LABELS,
  describePax,
  findAirport,
  searchAirports,
  type CabinClass,
  type PaxCounts,
} from "@/lib/travel/flightSearch";

export const ff = "'Outfit','Inter',sans-serif";

export const T = {
  card: "var(--card-bg)",
  panel: "var(--panel-bg)",
  panel2: "var(--panel-bg-2)",
  border: "var(--border)",
  input: "var(--input-bg)",
  text: "var(--text-primary)",
  muted: "var(--text-muted)",
  accent: "var(--accent)",
  accentStrong: "var(--accent-strong)",
};

export const flightCss = `
.fl-press{transition:transform .12s,filter .12s,border-color .15s,box-shadow .15s}
.fl-press:hover:not(:disabled){filter:brightness(1.08)}
.fl-press:active:not(:disabled){transform:translateY(1px)}
.fl-card{transition:border-color .15s,box-shadow .15s}
.fl-card:hover{border-color:var(--accent);box-shadow:var(--shadow)}
.fl-opt:hover{background:var(--panel-bg-2)}
.fl-in:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(var(--accent-rgb,56,189,248),.16)}
.fl-scroll::-webkit-scrollbar{width:8px}
.fl-scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:999px}
`;

export function Money({ value, size = 14, weight = 700, tone }: { value: number; size?: number; weight?: number; tone?: string }) {
  const symbol = useCurrency();
  return (
    <span style={{ fontSize: size, fontWeight: weight, color: tone || T.text, whiteSpace: "nowrap" }}>
      {symbol}
      {Math.round(Number(value) || 0).toLocaleString()}
    </span>
  );
}

/** The plain currency string, for places that cannot take a node. */
export function useMoney() {
  const symbol = useCurrency();
  return (value: number) => `${symbol}${Math.round(Number(value) || 0).toLocaleString()}`;
}

export const inputStyle: React.CSSProperties = {
  width: "100%",
  background: T.input,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  padding: "10px 12px",
  color: T.text,
  fontSize: 13.5,
  fontFamily: "inherit",
  boxSizing: "border-box",
};

export function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: ".02em" }}>
        {label}
        {required ? <span style={{ color: "#f87171", marginLeft: 3 }}>*</span> : null}
      </span>
      {children}
      {hint ? <span style={{ fontSize: 10.5, color: T.muted }}>{hint}</span> : null}
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string }>;
  size?: "sm" | "md";
}) {
  return (
    <div style={{ display: "inline-flex", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: 3, gap: 2 }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className="fl-press"
            onClick={() => onChange(option.value)}
            style={{
              border: "none",
              borderRadius: 8,
              padding: size === "sm" ? "6px 12px" : "8px 16px",
              fontSize: size === "sm" ? 12 : 13,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#06121f" : T.muted,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Close me when the click lands somewhere else. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

const popover: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  zIndex: 40,
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  boxShadow: "0 18px 40px rgba(0,0,0,.35)",
  padding: 6,
  minWidth: 260,
};

/**
 * An airport box that takes a code but accepts a city.
 *
 * The desk types "LHE" when it knows and "Lahore" when it does not, and both
 * have to land on the same airport — a free-text box is how a booking ends up
 * routed to the wrong Hyderabad.
 */
export function AirportInput({
  value,
  onChange,
  placeholder = "City or airport",
}: {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const ref = useDismiss(open, () => setOpen(false));
  const selected = findAirport(value);
  const matches = useMemo(() => searchAirports(text, 7), [text]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        className="fl-in"
        onClick={() => { setOpen(true); setText(""); }}
        style={{
          ...inputStyle,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          minHeight: 46,
        }}
      >
        <span style={{ fontSize: 15 }}>✈</span>
        {open ? (
          <input
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={placeholder}
            style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: T.text, fontSize: 14, fontFamily: "inherit" }}
          />
        ) : selected ? (
          <span style={{ minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{selected.code}</span>
            <span style={{ display: "block", fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selected.city}, {selected.country}
            </span>
          </span>
        ) : (
          <span style={{ fontSize: 13.5, color: T.muted }}>{placeholder}</span>
        )}
      </div>

      {open ? (
        <div style={{ ...popover, minWidth: 300, maxHeight: 300, overflowY: "auto" }} className="fl-scroll">
          {matches.length ? (
            matches.map((airport) => (
              <button
                key={airport.code}
                type="button"
                className="fl-opt"
                onClick={() => { onChange(airport.code); setOpen(false); }}
                style={{
                  display: "flex", width: "100%", gap: 10, alignItems: "center", textAlign: "left",
                  background: "transparent", border: "none", borderRadius: 8, padding: "9px 10px",
                  cursor: "pointer", color: T.text, fontFamily: "inherit",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 800, width: 34, color: T.accent }}>{airport.code}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{airport.city}</span>
                  <span style={{ display: "block", fontSize: 11, color: T.muted }}>{airport.name} · {airport.country}</span>
                </span>
              </button>
            ))
          ) : (
            <div style={{ padding: "10px 12px", fontSize: 12.5, color: T.muted }}>
              No airport matches “{text}”. Type the three-letter code if you know it.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const btn: React.CSSProperties = {
    width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`,
    background: T.panel, color: T.text, fontSize: 16, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit", lineHeight: 1,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "8px 6px" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{label}</div>
        <div style={{ fontSize: 10.5, color: T.muted }}>{hint}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" className="fl-press" style={{ ...btn, opacity: value <= min ? 0.4 : 1 }} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
        <span style={{ minWidth: 18, textAlign: "center", fontSize: 14, fontWeight: 700, color: T.text }}>{value}</span>
        <button type="button" className="fl-press" style={{ ...btn, opacity: value >= max ? 0.4 : 1 }} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  );
}

export function PaxPicker({ value, onChange }: { value: PaxCounts; onChange: (next: PaxCounts) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fl-in"
        style={{ ...inputStyle, textAlign: "left", cursor: "pointer", minHeight: 46, display: "flex", alignItems: "center", gap: 10 }}
      >
        <span style={{ fontSize: 15 }}>👤</span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: T.text }}>
            {value.adults + value.children + value.infants} Passenger{value.adults + value.children + value.infants === 1 ? "" : "s"}
          </span>
          <span style={{ display: "block", fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {describePax(value)}
          </span>
        </span>
      </button>

      {open ? (
        <div style={{ ...popover, padding: 10, minWidth: 280 }}>
          <Stepper label="Adults" hint="12 years and over" value={value.adults} min={1} max={9}
            onChange={(n) => onChange({ ...value, adults: n, infants: Math.min(value.infants, n) })} />
          <Stepper label="Children" hint="2 to 11 years" value={value.children} min={0} max={8}
            onChange={(n) => onChange({ ...value, children: n })} />
          {/* An infant travels on an adult's lap, so it cannot outnumber the
              laps — the airline refuses this at check-in, and it is cheaper to
              hear it here. */}
          <Stepper label="Infants" hint="Under 2, on a lap" value={value.infants} min={0} max={value.adults}
            onChange={(n) => onChange({ ...value, infants: n })} />
          <button
            type="button"
            className="fl-press"
            onClick={() => setOpen(false)}
            style={{
              marginTop: 6, width: "100%", border: "none", borderRadius: 9, padding: "9px",
              background: "var(--accent)", color: "#06121f", fontWeight: 800, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Done
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function CabinSelect({ value, onChange }: { value: CabinClass; onChange: (next: CabinClass) => void }) {
  return (
    <select
      className="fl-in"
      value={value}
      onChange={(event) => onChange(event.target.value as CabinClass)}
      style={{ ...inputStyle, minHeight: 46, cursor: "pointer", fontWeight: 600 }}
    >
      {(Object.keys(CABIN_LABELS) as CabinClass[]).map((cabin) => (
        <option key={cabin} value={cabin}>{CABIN_LABELS[cabin]}</option>
      ))}
    </select>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
  wide,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  wide?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="fl-press"
      style={{
        width: wide ? "100%" : undefined,
        border: "none",
        borderRadius: 11,
        padding: "12px 20px",
        background: disabled ? T.panel2 : "linear-gradient(135deg,var(--accent),var(--accent-strong))",
        color: disabled ? T.muted : "#06121f",
        fontWeight: 800,
        fontSize: 13.5,
        fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="fl-press"
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 11,
        padding: "12px 18px",
        background: T.panel,
        color: T.text,
        fontWeight: 700,
        fontSize: 13.5,
        fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {children}
    </button>
  );
}

/**
 * Said once at the top of every page that shows a fare.
 *
 * The schedules and prices on these pages are not a live airline feed and must
 * never be mistaken for one. This is the notice that says so, and it is not
 * dismissible on purpose.
 */
export function FareNotice({ note }: { note?: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        border: "1px solid rgba(244,194,91,.35)",
        background: "rgba(244,194,91,.10)",
        borderRadius: 12,
        padding: "11px 14px",
      }}
    >
      <span style={{ fontSize: 14, lineHeight: 1.3 }}>⚠️</span>
      <div style={{ fontSize: 12.5, color: T.text, lineHeight: 1.5 }}>
        <strong style={{ color: "#f4c25b" }}>Not a live airline feed.</strong>{" "}
        {note ||
          "No airline or GDS connection is configured yet. Schedules are built from the route and fares are either your own past fares or indicative figures — confirm every fare with the airline before you quote it."}
      </div>
    </div>
  );
}
