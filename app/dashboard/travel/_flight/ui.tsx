"use client";

/**
 * The small parts the flight pages are built from.
 *
 * Everything here is theme-variable driven rather than painted in fixed darks,
 * because the shell around these pages switches between light and dark and a
 * booking screen that only works in one of them is half a booking screen.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { isControlAccount } from "@/lib/partyVocabulary";
import { useCurrency } from "@/lib/useCurrency";
import {
  CABIN_LABELS,
  FARE_NOTICE,
  describePax,
  type Airport,
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
/* Safari gives a date input more height than a text input of the same padding,
   so a row mixing the two sits crooked. One height for every single-line
   control; a textarea is exempt because it is meant to grow. */
.fl-form input,.fl-form select,input.fl-in,select.fl-in{box-sizing:border-box;height:38px}
.fl-form textarea,textarea.fl-in{box-sizing:border-box;height:auto;min-height:38px}
.fl-form input[type="date"],input.fl-in[type="date"]{padding-top:0;padding-bottom:0}
.fl-form input[type="checkbox"]{height:auto}
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
    /* alignContent start, because a grid row stretches its items to match the
       tallest — so a field carrying a hint under it stretched the field beside
       it, and the two inputs sat at different heights on the same line. Each
       field takes its own height now and the inputs line up. */
    <label style={{ display: "grid", gap: 6, minWidth: 0, alignContent: "start" }}>
      {/* One line, always. A label that wrapped to two pushed its own input
          down while the field beside it stayed put, and the row went crooked
          again for a different reason. The full text stays available on hover
          rather than being lost. */}
      <span
        title={label}
        style={{
          fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: ".02em",
          lineHeight: "16px", height: 16,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}
      >
        {label}
        {required ? <span style={{ color: "#f87171", marginLeft: 3 }}>*</span> : null}
      </span>
      {children}
      {/* Reserves no space when absent, and cannot stretch the field beside it
          because the row aligns to the top. */}
      {hint ? <span style={{ fontSize: 10.5, color: T.muted, lineHeight: 1.45 }}>{hint}</span> : null}
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

/* React warns about useLayoutEffect on the server, and these controls are
   server-rendered closed before they ever hydrate. */
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * A panel that hangs off a control and is not clipped by anything.
 *
 * It used to be an absolutely positioned div inside the field. That works
 * until an ancestor has overflow hidden — which the travel pages do, to stop a
 * wide row pushing the whole page sideways — and then the panel is silently
 * cut off. The airport pickers near the top of a form looked fine because
 * their panels fitted inside the page box; the supplier picker on the last
 * service row opened into the clipped region and simply never appeared.
 *
 * So it renders into the body and positions itself against the control's
 * rectangle. Nothing above it can clip it, now or when somebody adds another
 * scrolling container next year.
 */
function Popover({
  anchor,
  open,
  onClose,
  children,
  minWidth = 260,
}: {
  anchor: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  minWidth?: number;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ top: number; left: number; width: number; above: boolean } | null>(null);

  // Measured before paint, so it never appears in the wrong place first.
  useIsoLayoutEffect(() => {
    if (!open) { setBox(null); return; }

    const place = () => {
      const el = anchor.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const wanted = panel.current?.offsetHeight ?? 260;
      // Opens downward unless the room is not there, which is the whole
      // reason the last row in a form was the one that failed.
      const above = r.bottom + 6 + wanted > window.innerHeight && r.top > wanted + 12;
      setBox({
        top: above ? r.top - 6 - wanted : r.bottom + 6,
        left: Math.max(8, Math.min(r.left, window.innerWidth - Math.max(minWidth, r.width) - 8)),
        width: Math.max(minWidth, r.width),
        above,
      });
    };

    place();
    // Fixed positioning does not follow a scrolling page on its own.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, anchor, minWidth]);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      const target = event.target as Node;
      // The panel lives outside the field now, so both count as "inside".
      if (anchor.current?.contains(target) || panel.current?.contains(target)) return;
      onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchor]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panel}
      className="fl-scroll"
      style={{
        position: "fixed",
        // Padding and border are inside the measured width, so the panel lines
        // up with the control rather than sitting a few pixels wider than it.
        boxSizing: "border-box",
        top: box?.top ?? -9999,
        left: box?.left ?? -9999,
        width: box?.width,
        maxHeight: 300,
        overflowY: "auto",
        zIndex: 2147483000,
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        boxShadow: "0 18px 40px rgba(0,0,0,.45)",
        padding: 6,
        // Hidden until it has been measured, rather than flashing top-left.
        visibility: box ? "visible" : "hidden",
        fontFamily: ff,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

/* What the picker has already been told about an airport.

   Shared across every box on the page, so swapping From and To, or coming back
   to a form, does not have to ask the server again for a city name it already
   printed once. */
const airportCache = new Map<string, Airport>();

/**
 * An airport box that takes a code but accepts a city.
 *
 * The desk types "LHE" when it knows and "Lahore" when it does not, and both
 * have to land on the same airport — a free-text box is how a booking ends up
 * routed to the wrong Hyderabad.
 *
 * It asks the server rather than searching a list it carries. The table is all
 * 4,008 airports a scheduled flight goes to and weighs 310KB; shipping that to
 * a browser to fill seven rows would be the whole world's airports downloaded
 * so somebody can type three letters.
 */
export function AirportInput({
  value,
  onChange,
  placeholder = "City or airport",
  compact,
}: {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  /** For a service row, where a 46px control beside 38px ones sits proud. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [matches, setMatches] = useState<Airport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Airport | undefined>(() => airportCache.get(value));
  const anchor = useRef<HTMLDivElement>(null);

  /* Whatever comes back is remembered, so the next box asking about the same
     airport costs nothing. */
  const remember = (rows: Airport[]) => {
    rows.forEach((row) => airportCache.set(row.code, row));
  };

  // The code may arrive from outside — a swap, a restored form — with nothing
  // yet known about it.
  useEffect(() => {
    if (!value) { setSelected(undefined); return; }
    const cached = airportCache.get(value);
    if (cached) { setSelected(cached); return; }
    let cancelled = false;
    fetch(`/api/travel/airports?q=${encodeURIComponent(value)}&limit=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const row = body?.airports?.[0] as Airport | undefined;
        if (cancelled || !row || row.code !== value) return;
        remember([row]);
        setSelected(row);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [value]);

  // Typing. Debounced, because a keystroke is not a question worth asking the
  // server on its own.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/travel/airports?q=${encodeURIComponent(text)}&limit=8`)
        .then((r) => (r.ok ? r.json() : null))
        .then((body) => {
          if (cancelled) return;
          const rows = (body?.airports ?? []) as Airport[];
          remember(rows);
          setMatches(rows);
          setTotal(Number(body?.total) || 0);
        })
        .catch(() => { if (!cancelled) setMatches([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 180);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [text, open]);

  return (
    <div ref={anchor} style={{ position: "relative" }}>
      <div
        className="fl-in"
        onClick={() => { setOpen(true); setText(""); }}
        style={{
          ...inputStyle,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: compact ? 7 : 10,
          height: compact ? 38 : undefined,
          minHeight: compact ? 38 : 46,
          padding: compact ? "0 10px" : inputStyle.padding,
          fontSize: compact ? 12.5 : inputStyle.fontSize,
        }}
      >
        <span style={{ fontSize: compact ? 12 : 15 }}>✈</span>
        {open ? (
          <input
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={placeholder}
            style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: T.text, fontSize: 14, fontFamily: "inherit" }}
          />
        ) : value ? (
          /* Compact has one line — the code and the city beside it — because a
             two-line control cannot be 38px. */
          compact ? (
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: T.text }}>{value}</span>
              {selected ? <span style={{ fontSize: 11, color: T.muted }}> · {selected.city}</span> : null}
            </span>
          ) : (
            <span style={{ minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{value}</span>
              <span style={{ display: "block", fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selected ? `${selected.city}, ${selected.country}` : "\u00a0"}
              </span>
            </span>
          )
        ) : (
          <span style={{ fontSize: compact ? 12.5 : 13.5, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{placeholder}</span>
        )}
      </div>

      <Popover anchor={anchor} open={open} onClose={() => setOpen(false)} minWidth={320}>
          {matches.length ? (
            matches.map((airport) => (
              <button
                key={airport.code}
                type="button"
                className="fl-opt"
                onClick={() => { remember([airport]); setSelected(airport); onChange(airport.code); setOpen(false); }}
                style={{
                  display: "flex", width: "100%", gap: 10, alignItems: "center", textAlign: "left",
                  background: "transparent", border: "none", borderRadius: 8, padding: "9px 10px",
                  cursor: "pointer", color: T.text, fontFamily: "inherit",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 800, width: 34, color: T.accent }}>{airport.code}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{airport.city}</span>
                  <span style={{ display: "block", fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {airport.name} · {airport.country}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <div style={{ padding: "10px 12px", fontSize: 12.5, color: T.muted }}>
              {loading ? "Searching…" : text ? `No airport matches “${text}”.` : "Start typing a city or code."}
            </div>
          )}

          {/* Eight rows with nothing typed reads as eight airports. It is
              eight suggestions out of four thousand, and the box says so. */}
          {total ? (
            <div
              style={{
                borderTop: `1px solid ${T.border}`, marginTop: 4, padding: "8px 12px 4px",
                fontSize: 10.5, color: T.muted, position: "sticky", bottom: 0, background: T.card,
              }}
            >
              {text
                ? `Showing ${matches.length} of ${total.toLocaleString()} airports`
                : `Suggestions — type a city, country or code to search all ${total.toLocaleString()} airports`}
            </div>
          ) : null}
      </Popover>
    </div>
  );
}

/** A party the picker can offer, and the trade's word for what they are. */
export type PartyChoice = { name: string; kind?: string | null };

/**
 * Accounts as the pickers want them.
 *
 * Drops the control accounts: `Accounts Payable` carries partyType SUPPLIER so
 * an unnamed posting still lands somewhere, which makes it a fallback and not
 * a company anybody books a room with.
 */
export function readParties(rows: unknown): PartyChoice[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => row as { name?: unknown; code?: unknown; partyKind?: unknown })
    .filter((row) => !isControlAccount(String(row.code ?? "")))
    .map((row) => ({
      name: String(row.name ?? "").trim(),
      kind: row.partyKind ? String(row.partyKind) : null,
    }))
    .filter((party) => party.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "7px 11px 4px", fontSize: 10, fontWeight: 800, color: T.muted,
      letterSpacing: ".08em", textTransform: "uppercase",
    }}>
      {children}
    </div>
  );
}

function Choice({ name, onPick }: { name: string; onPick: (name: string) => void }) {
  return (
    <button
      type="button"
      className="fl-opt"
      onMouseDown={(event) => { event.preventDefault(); onPick(name); }}
      style={{
        display: "block", width: "100%", textAlign: "left", background: "transparent",
        border: "none", borderRadius: 8, padding: "8px 10px", cursor: "pointer",
        color: T.text, fontFamily: "inherit", fontSize: 12.5,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}
    >
      {name}
    </button>
  );
}

/**
 * A party picked from the ones already on file, or typed if it is new.
 *
 * Not a <datalist>. Safari renders those inconsistently — the list does not
 * open on click and often not on typing either — so a supplier box looked
 * exactly like a plain text field and the accounts sitting behind it might as
 * well not have existed.
 *
 * Not a <select> either, for the reason the rest of this module already
 * follows: the supplier being used for the first time must still be typeable,
 * or the first booking with a new consolidator means abandoning a half-built
 * trip to go and create an account.
 */
export function PartyInput({
  value,
  onChange,
  options,
  placeholder = "Pick or type",
  compact,
  kind,
  kindLabel,
}: {
  value: string;
  onChange: (name: string) => void;
  options: PartyChoice[];
  placeholder?: string;
  compact?: boolean;
  /** The sort of party this field wants — "Hotel" for a room, say. */
  kind?: string;
  /** What to call them in the list. Defaults to the kind itself. */
  kindLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const anchor = useRef<HTMLDivElement>(null);

  const needle = text.trim().toLowerCase();

  /* Split rather than filter. A strict filter is what the field is asking for,
     and on a chart where nobody has been categorised yet it would answer with
     an empty list — so the ones that fit come first under their own heading
     and the rest stay reachable underneath. The second group empties itself as
     accounts get categorised. */
  const { fits, rest } = useMemo(() => {
    const pool = needle
      ? options.filter((o) => o.name.toLowerCase().includes(needle))
      : options;
    if (!kind) return { fits: pool.slice(0, 12), rest: [] as PartyChoice[] };
    const fits: PartyChoice[] = [];
    const rest: PartyChoice[] = [];
    pool.forEach((o) => (o.kind === kind ? fits : rest).push(o));
    return { fits: fits.slice(0, 12), rest: rest.slice(0, 12) };
  }, [options, needle, kind]);

  const matches = [...fits, ...rest];

  /* What is typed is the value, whether or not it matches anything. Closing
     without picking keeps it — the new consolidator is the point. */
  function commit(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={anchor} style={{ position: "relative", minWidth: 0 }}>
      <input
        className="fl-in"
        value={open ? text : value}
        placeholder={placeholder}
        onFocus={() => { setText(value); setOpen(true); }}
        /* Focus alone is not enough. Escape closes the list but leaves the
           cursor in the box, and a second click on an already-focused field
           fires no focus event — so the list would stay shut for good. */
        onClick={() => { if (!open) { setText(value); setOpen(true); } }}
        onChange={(event) => { setText(event.target.value); onChange(event.target.value); setOpen(true); }}
        onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); commit(text); }
          if (event.key === "Escape") setOpen(false);
        }}
        style={{
          ...inputStyle,
          height: compact ? 38 : undefined,
          padding: compact ? "0 10px" : inputStyle.padding,
          fontSize: compact ? 12.5 : inputStyle.fontSize,
        }}
      />

      <Popover anchor={anchor} open={open} onClose={() => setOpen(false)} minWidth={0}>
          {matches.length ? (
            <>
              {kind ? <Heading>{kindLabel || kind}</Heading> : null}
              {fits.length
                ? fits.map((choice) => <Choice key={choice.name} name={choice.name} onPick={commit} />)
                : kind
                  ? (
                    <div style={{ padding: "7px 11px", fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
                      None tagged yet — set the type on Accounts and they will be listed here.
                    </div>
                  )
                  : null}

              {rest.length ? (
                <>
                  <Heading>Other accounts</Heading>
                  {rest.map((choice) => <Choice key={choice.name} name={choice.name} onPick={commit} />)}
                </>
              ) : null}
            </>
          ) : (
            <div style={{ padding: "9px 11px", fontSize: 11.5, color: T.muted, lineHeight: 1.5 }}>
              {options.length
                ? `Nothing on file matches “${text}”. Keep typing to use it as a new one.`
                : "No accounts on file yet — type the name and it will be created when the booking posts."}
            </div>
          )}
      </Popover>
    </div>
  );
}

const linkish: React.CSSProperties = {
  border: "none", background: "transparent", color: "var(--accent)", cursor: "pointer",
  fontSize: 11.5, fontWeight: 700, fontFamily: "inherit", padding: "4px 2px",
};

/** Enough of a traveller to show them in a list and put them on a trip. */
export type PickedTraveler = {
  id: string;
  fullName: string;
  passportNo?: string | null;
  phone?: string | null;
};

/* Chips for a hundred-person Hajj group would bury the form as thoroughly as
   listing every traveller on file did, so the wall is folded after this many
   and opened on request. */
const CHIP_LIMIT = 12;

/**
 * The people on a trip, chosen by searching rather than by reading everyone.
 *
 * This used to render one chip per traveller on file. At the twenty this
 * started with that was a convenience; at the thousand a working agency
 * carries it is a wall of names, and the fetch was capped at a hundred anyway,
 * so the nine hundred behind the cap could not be put on a trip at all.
 *
 * Searching is also how you tell two travellers apart. An agency will have
 * several people called Muhammad Ali, and a chip showing only a name cannot
 * say which passport is flying — so each row carries the passport or the
 * phone underneath.
 */
export function TravelerPicker({
  selected,
  onChange,
}: {
  selected: PickedTraveler[];
  onChange: (next: PickedTraveler[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<PickedTraveler[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAllChips, setShowAllChips] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);

  // Nothing typed lists the most recently touched, which is who the desk is
  // usually still working on.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/travel/travelers?q=${encodeURIComponent(text.trim())}&limit=12`)
        .then((r) => (r.ok ? r.json() : null))
        .then((body) => {
          if (cancelled) return;
          setRows(Array.isArray(body?.travelers) ? body.travelers : []);
          setTotal(Number(body?.total) || 0);
        })
        .catch(() => { if (!cancelled) setRows([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, text.trim() ? 250 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, text]);

  const chosenIds = useMemo(() => new Set(selected.map((p) => p.id)), [selected]);

  function toggle(person: PickedTraveler) {
    onChange(
      chosenIds.has(person.id)
        ? selected.filter((p) => p.id !== person.id)
        : [...selected, person],
    );
  }

  const shownChips = showAllChips ? selected : selected.slice(0, CHIP_LIMIT);
  const hiddenChips = selected.length - shownChips.length;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {selected.length ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {shownChips.map((person) => (
            <span
              key={person.id}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                border: `1px solid var(--accent)`, background: "var(--accent-soft)",
                color: T.accent, borderRadius: 999, padding: "5px 6px 5px 13px",
                fontSize: 12, fontWeight: 700, maxWidth: "100%",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {person.fullName}
              </span>
              <button
                type="button"
                aria-label={`Remove ${person.fullName}`}
                onClick={() => toggle(person)}
                style={{
                  border: "none", background: "transparent", color: "inherit", cursor: "pointer",
                  fontSize: 14, lineHeight: 1, padding: "0 4px", fontFamily: "inherit", opacity: 0.75,
                }}
              >
                ×
              </button>
            </span>
          ))}

          {hiddenChips > 0 ? (
            <button type="button" onClick={() => setShowAllChips(true)} style={linkish}>
              +{hiddenChips} more
            </button>
          ) : null}
          {showAllChips && selected.length > CHIP_LIMIT ? (
            <button type="button" onClick={() => setShowAllChips(false)} style={linkish}>
              Show fewer
            </button>
          ) : null}
          {selected.length > 1 ? (
            <button type="button" onClick={() => { onChange([]); setShowAllChips(false); }} style={{ ...linkish, color: T.muted }}>
              Clear all
            </button>
          ) : null}
        </div>
      ) : null}

      <div ref={anchor} style={{ position: "relative", minWidth: 0 }}>
        <input
          className="fl-in"
          value={text}
          placeholder={selected.length ? "Add another traveller — name, passport or phone" : "Search a traveller by name, passport or phone"}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => { setText(event.target.value); setOpen(true); }}
          onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
          style={{ ...inputStyle, height: 38, padding: "0 12px", fontSize: 12.5 }}
        />

        {/* Picking does not close the panel: a group is several people, and
            reopening the list for each of them is the slow way to book. */}
        <Popover anchor={anchor} open={open} onClose={() => setOpen(false)} minWidth={0}>
          {rows.length ? (
            rows.map((person) => {
              const on = chosenIds.has(person.id);
              return (
                <button
                  key={person.id}
                  type="button"
                  className="fl-opt"
                  onMouseDown={(event) => { event.preventDefault(); toggle(person); }}
                  style={{
                    display: "flex", width: "100%", gap: 10, alignItems: "center", textAlign: "left",
                    background: "transparent", border: "none", borderRadius: 8, padding: "8px 10px",
                    cursor: "pointer", color: T.text, fontFamily: "inherit",
                  }}
                >
                  <span style={{ width: 14, fontSize: 12, color: on ? T.accent : "transparent" }}>✓</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: on ? T.accent : T.text }}>
                      {person.fullName}
                    </span>
                    <span style={{ display: "block", fontSize: 10.5, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {person.passportNo || person.phone || "No passport on file"}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <div style={{ padding: "10px 12px", fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
              {loading
                ? "Searching…"
                : text.trim()
                  ? `Nobody on file matches “${text.trim()}”.`
                  : "No travellers on file yet."}
            </div>
          )}

          {total > rows.length ? (
            <div
              style={{
                borderTop: `1px solid ${T.border}`, marginTop: 4, padding: "8px 12px 4px",
                fontSize: 10.5, color: T.muted, position: "sticky", bottom: 0, background: T.card,
              }}
            >
              Showing {rows.length} of {total.toLocaleString()} — narrow it with a name, passport or phone
            </div>
          ) : null}
        </Popover>
      </div>
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
  const anchor = useRef<HTMLDivElement>(null);

  return (
    <div ref={anchor} style={{ position: "relative" }}>
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

      <Popover anchor={anchor} open={open} onClose={() => setOpen(false)} minWidth={280}>
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
      </Popover>
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
        {/* Leads with what the operator has to act on. "Not a live airline
            feed" read as a fault that wanted fixing; the thing that actually
            matters is that a fare here is not yet a fare you can quote. */}
        <strong style={{ color: "#f4c25b" }}>Confirm fares before quoting.</strong>{" "}
        {note || FARE_NOTICE}
      </div>
    </div>
  );
}
