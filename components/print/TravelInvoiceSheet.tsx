"use client";

/**
 * A travel invoice on A4, in one of the designs from ./travelDesigns.ts.
 *
 * It is not PrintDocA4 on purpose. That component is a trading bill — a
 * letterhead, a particulars box, a ruled grid — and a flight has a shape it
 * cannot express: a journey with two ends. Here the sector is the first thing
 * on the page, and the passengers are listed under it the way they are on the
 * airline's own paperwork.
 *
 * Built from divs and CSS grid rather than a <table>: the dashboard's dark
 * theme repaints every th and td it can reach, which is what turned the old
 * grid's headings into white on white. A div it has no opinion about.
 *
 * It carries `print-doc-a4` so globals.css still hides the dashboard around it
 * at print time; the rest of the look is its own.
 */

import type { CSSProperties, ReactNode } from "react";
import { travelDesign, type TravelDesign } from "./travelDesigns";
import type { PrintFieldKey } from "@/lib/printProfile";

export type TravelColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  width?: string | number;
  render?: (value: unknown) => string;
};

export type TravelInvoiceSheetProps = {
  design?: string;
  fields?: Partial<Record<PrintFieldKey, boolean>>;

  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyTaxLabel?: string;
  companyTaxValue?: string;
  companyStrn?: string;
  logoUrl?: string;
  showLogo?: boolean;

  docTitle: string;
  docNo: string;
  date: string;
  partyName: string;
  metaFields: { label: string; value: string }[];
  columns: TravelColumn[];
  rows: Record<string, unknown>[];
  totalText: string;
  summaryFields?: { label: string; value: string }[];
  notes?: string;
  footerNote?: string;
  signatureLabels?: string[];
};

const FONT = "'Outfit','Inter',Arial,sans-serif";

function cellText(col: TravelColumn, row: Record<string, unknown>): string {
  const raw = row[col.key];
  const text = col.render ? col.render(raw) : String(raw ?? "").trim();
  // A passport or ticket number nobody has entered reads as a gap, not a typo.
  return text === "" ? "—" : text;
}

/** "KHI -> DXB" → ["KHI", "DXB"]. Anything that is not a pair is left alone. */
function splitSector(value: string): [string, string] | null {
  const parts = value.split(/\s*(?:->|→|—|–|\bto\b)\s*/i).map((p) => p.trim()).filter(Boolean);
  return parts.length === 2 ? [parts[0], parts[1]] : null;
}

export function TravelInvoiceSheet(props: TravelInvoiceSheetProps) {
  const d = travelDesign(props.design);
  const show = (key: PrintFieldKey) => props.fields?.[key] !== false;

  const find = (label: string) => props.metaFields.find((m) => m.label === label)?.value || "";
  const sector = splitSector(find("Sector"));
  const hasRoute = !!sector && d.route !== "inline";

  // What the route card already says is not repeated in the particulars.
  const inRoute = hasRoute ? new Set(["Sector", "Airline", "Flight", "Travel Date", "Class"]) : new Set<string>();
  const stub = d.route === "ticket" && hasRoute ? new Set(["PNR", "Booking Ref"]) : new Set<string>();
  const particulars = props.metaFields.filter((m) => !inRoute.has(m.label) && !stub.has(m.label));

  const contact = [
    show("companyAddress") ? props.companyAddress : "",
    [show("companyPhone") ? props.companyPhone : "", show("companyEmail") ? props.companyEmail : ""].filter(Boolean).join("  ·  "),
    show("companyTaxNumber")
      ? [props.companyTaxValue && `${props.companyTaxLabel || "NTN"}: ${props.companyTaxValue}`, props.companyStrn && `STRN: ${props.companyStrn}`]
          .filter(Boolean).join("  ·  ")
      : "",
  ].filter(Boolean) as string[];

  const logo = show("logo") && props.showLogo !== false && props.logoUrl
    ? <img src={props.logoUrl} alt="" style={{ height: 44, maxWidth: 120, objectFit: "contain" }} />
    : null;

  const signatures = show("signatures")
    ? (props.signatureLabels?.length ? props.signatureLabels.slice(0, 3) : ["Customer Signature", "Authorised Signature"])
    : [];

  const body = (
    <>
      {hasRoute && sector ? (
        <Route d={d} sector={sector} airline={find("Airline")} flight={find("Flight")} date={find("Travel Date")} cabin={find("Class")} pnr={find("PNR")} bookingRef={find("Booking Ref")} />
      ) : null}
      {d.header !== "side" ? <Particulars d={d} docNo={props.docNo} date={props.date} partyName={props.partyName} meta={particulars} /> : (
        particulars.length > 0 && !hasRoute ? <MetaGrid d={d} meta={particulars} /> : null
      )}
      <Grid d={d} columns={props.columns} rows={props.rows} />
      <Totals d={d} text={props.totalText} />
      {props.summaryFields?.length ? (
        <div style={{ display: "grid", gap: 4, marginTop: 12, fontSize: 11 }}>
          {props.summaryFields.map((f) => (
            <div key={f.label} style={{ display: "flex", gap: 8 }}>
              <span style={{ color: d.muted, minWidth: 92, textTransform: "uppercase", fontSize: 9.5, letterSpacing: 0.5, paddingTop: 1 }}>{f.label}</span>
              <span style={{ fontWeight: 600 }}>{f.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {props.notes ? (
        <div style={{ marginTop: 14, fontSize: 10.5, color: d.muted, lineHeight: 1.5 }}>{props.notes}</div>
      ) : null}
      {signatures.length ? (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 28, marginTop: 44 }}>
          {signatures.map((label) => (
            <div key={label} style={{ flex: 1, borderTop: `1px solid ${d.ink}`, paddingTop: 4, fontSize: 10, color: d.muted, textAlign: "center" }}>
              {label}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );

  const footer = show("footerNote") && props.footerNote ? (
    d.header === "band" || d.header === "soft" ? (
      <div className="tvx-fill" style={{ background: d.accent, color: d.onAccent, textAlign: "center", fontSize: 10.5, padding: "8px 12mm", marginTop: "auto" }}>
        {props.footerNote}
      </div>
    ) : (
      <div style={{ textAlign: "center", fontSize: 10.5, color: d.muted, fontStyle: "italic", padding: "10px 12mm 8mm", marginTop: "auto" }}>
        {props.footerNote}
      </div>
    )
  ) : null;

  const root: CSSProperties = {
    width: "210mm", maxWidth: "100%", minHeight: "297mm", margin: "0 auto", boxSizing: "border-box",
    background: "#fff", color: d.ink, fontFamily: FONT, fontSize: 11.5, display: "flex", flexDirection: "column",
  };

  return (
    <div className="print-doc-a4 tvx-sheet" style={root}>
      <style>{`
        @media screen { .tvx-wrap { background:#e9edf2; padding:24px; overflow:auto; } .tvx-sheet { box-shadow:0 4px 24px rgba(0,0,0,.12); } }
        @media print {
          .tvx-wrap { background:#fff !important; padding:0 !important; }
          .tvx-sheet { box-shadow:none !important; width:auto !important; min-height:235mm !important; }
          .tvx-sheet, .tvx-sheet * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
          .tvx-sheet [data-keep] { page-break-inside:avoid; }
        }
      `}</style>

      {d.header === "side" ? (
        <div style={{ display: "grid", gridTemplateColumns: "62mm minmax(0,1fr)", flex: 1 }}>
          <aside className="tvx-fill" style={{ background: d.accent, color: d.onAccent, padding: "12mm 7mm", display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              {logo}
              <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.2, marginTop: logo ? 8 : 0 }}>{props.companyName}</div>
              {contact.map((line) => <div key={line} style={{ fontSize: 10, opacity: 0.8, marginTop: 3, lineHeight: 1.4 }}>{line}</div>)}
            </div>
            <SideField label="Bill To" value={props.partyName || "—"} big />
            <SideField label="Invoice No" value={props.docNo} />
            <SideField label="Date" value={props.date} />
            {particulars.map((m) => <SideField key={m.label} label={m.label} value={m.value} />)}
          </aside>
          <main style={{ padding: "12mm 10mm 8mm", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 2, marginBottom: 16 }}>{props.docTitle}</div>
            {body}
            {footer}
          </main>
        </div>
      ) : (
        <>
          <Header d={d} p={props} logo={logo} contact={contact} />
          <div style={{ padding: "7mm 12mm 0", display: "flex", flexDirection: "column", flex: 1 }}>{body}</div>
          {footer}
        </>
      )}
    </div>
  );
}

/** The sheet on its screen paper. At print time the paper is the sheet alone. */
export function TravelPaper({ children }: { children: ReactNode }) {
  return <div className="tvx-wrap">{children}</div>;
}

/* ── Header ──────────────────────────────────────────────────────────── */

function Header({ d, p, logo, contact }: { d: TravelDesign; p: TravelInvoiceSheetProps; logo: ReactNode; contact: string[] }) {
  const company = (onFill: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
      {logo}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.15 }}>{p.companyName}</div>
        {contact.map((line) => (
          <div key={line} style={{ fontSize: 10, marginTop: 2, lineHeight: 1.35, color: onFill ? d.onAccent : d.muted, opacity: onFill ? 0.85 : 1 }}>{line}</div>
        ))}
      </div>
    </div>
  );
  const docBlock = (onFill: boolean, align: "right" | "center" = "right") => (
    <div style={{ textAlign: align, flex: "none" }}>
      <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: 2.2, color: onFill ? d.onAccent : d.accent }}>{p.docTitle}</div>
      <div style={{ fontSize: 10.5, marginTop: 3, color: onFill ? d.onAccent : d.muted, opacity: onFill ? 0.9 : 1 }}>
        {p.docNo} · {p.date}
      </div>
    </div>
  );

  if (d.header === "centered") {
    return (
      <div style={{ padding: "10mm 12mm 0", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>{company(false)}</div>
        <div style={{ borderTop: `2px solid ${d.ink}`, borderBottom: `1px solid ${d.ink}`, marginTop: 10, padding: "6px 0", fontSize: 15, fontWeight: 800, letterSpacing: 3 }}>
          {p.docTitle}
        </div>
      </div>
    );
  }
  if (d.header === "band") {
    return (
      <div className="tvx-fill" style={{ background: d.accent, color: d.onAccent, padding: "9mm 12mm", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        {company(true)}
        {docBlock(true)}
      </div>
    );
  }
  if (d.header === "soft") {
    return (
      <div className="tvx-fill" style={{ background: d.tint, borderRadius: "0 0 30px 30px", padding: "10mm 12mm 9mm", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, borderBottom: `3px solid ${d.accent}` }}>
        {company(false)}
        {docBlock(false)}
      </div>
    );
  }
  return (
    <div style={{ padding: "10mm 12mm 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, paddingBottom: 10, borderBottom: `${d.id === "travel_minimal" ? 1 : 2}px solid ${d.accent}` }}>
        {company(false)}
        {docBlock(false)}
      </div>
    </div>
  );
}

/* ── Route ───────────────────────────────────────────────────────────── */

function Route({ d, sector, airline, flight, date, cabin, pnr, bookingRef }: {
  d: TravelDesign; sector: [string, string]; airline: string; flight: string; date: string; cabin: string; pnr: string; bookingRef: string;
}) {
  const carrier = [airline, flight].filter(Boolean).join(" · ");
  const facts = [date && ["Travel Date", date], cabin && ["Class", cabin]].filter(Boolean) as [string, string][];

  const path = (
    <div style={{ flex: 1, minWidth: 0, textAlign: "center", padding: "0 10px" }}>
      <div style={{ fontSize: 10.5, color: d.muted, marginBottom: 4, fontWeight: 600 }}>{carrier}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: 7, border: `2px solid ${d.accent}`, flex: "none" }} />
        <span style={{ flex: 1, borderTop: `2px dashed ${d.accent}`, opacity: 0.7 }} />
        <span style={{ color: d.accent, fontSize: 16, lineHeight: 1 }}>✈</span>
        <span style={{ flex: 1, borderTop: `2px dashed ${d.accent}`, opacity: 0.7 }} />
        <span style={{ width: 7, height: 7, borderRadius: 7, background: d.accent, flex: "none" }} />
      </div>
    </div>
  );
  const code = (value: string, align: "left" | "right") => (
    <div style={{ textAlign: align, flex: "none" }}>
      <div style={{ fontSize: d.id === "travel_minimal" ? 40 : 34, fontWeight: 800, letterSpacing: 1.5, lineHeight: 1, color: d.id === "travel_minimal" ? d.ink : d.accent }}>{value}</div>
    </div>
  );

  if (d.route === "ticket") {
    return (
      <div data-keep className="tvx-fill" style={{ display: "flex", border: `1.5px solid ${d.accent}`, borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ flex: 1, padding: "14px 16px", background: d.tint }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: d.muted, textTransform: "uppercase", marginBottom: 8 }}>Boarding · Flight details</div>
          <div style={{ display: "flex", alignItems: "center" }}>{code(sector[0], "left")}{path}{code(sector[1], "right")}</div>
          <div style={{ display: "flex", gap: 22, marginTop: 12 }}>
            {facts.map(([k, v]) => <Fact key={k} d={d} label={k} value={v} />)}
          </div>
        </div>
        <div style={{ borderLeft: `2px dashed ${d.accent}`, width: "44mm", padding: "14px 14px", background: d.accent, color: d.onAccent, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
          {pnr ? <div><div style={{ fontSize: 8.5, opacity: 0.8, letterSpacing: 1.2 }}>PNR</div><div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>{pnr}</div></div> : null}
          {bookingRef ? <div><div style={{ fontSize: 8.5, opacity: 0.8, letterSpacing: 1.2 }}>BOOKING REF</div><div style={{ fontSize: 10.5, fontWeight: 700, wordBreak: "break-all" }}>{bookingRef}</div></div> : null}
        </div>
      </div>
    );
  }

  return (
    <div data-keep style={{ marginBottom: 14, padding: "14px 4px 12px", borderBottom: `1px solid ${d.rule}`, borderTop: d.id === "travel_minimal" ? "none" : `1px solid ${d.rule}` }}>
      <div style={{ display: "flex", alignItems: "center" }}>{code(sector[0], "left")}{path}{code(sector[1], "right")}</div>
      {facts.length ? (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
          {facts.map(([k, v]) => <Fact key={k} d={d} label={k} value={v} />)}
        </div>
      ) : null}
    </div>
  );
}

function Fact({ d, label, value }: { d: TravelDesign; label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 8.5, letterSpacing: 1.1, textTransform: "uppercase", color: d.muted }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function SideField({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 8.5, letterSpacing: 1.3, textTransform: "uppercase", opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: big ? 14 : 11.5, fontWeight: 700, marginTop: 2, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}

/* ── Particulars ─────────────────────────────────────────────────────── */

function Particulars({ d, docNo, date, partyName, meta }: {
  d: TravelDesign; docNo: string; date: string; partyName: string; meta: { label: string; value: string }[];
}) {
  const boxed = d.id === "travel_classic" || d.id === "travel_emerald";
  return (
    <div data-keep style={{ marginBottom: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 10, marginBottom: meta.length ? 10 : 0 }}>
        <Card d={d} label="Bill To" value={partyName || "—"} strong boxed={boxed} />
        <Card d={d} label="Invoice No" value={docNo} boxed={boxed} />
        <Card d={d} label="Date" value={date} boxed={boxed} />
      </div>
      {meta.length ? <MetaGrid d={d} meta={meta} /> : null}
    </div>
  );
}

function Card({ d, label, value, strong, boxed }: { d: TravelDesign; label: string; value: string; strong?: boolean; boxed: boolean }) {
  const style: CSSProperties = boxed
    ? { border: `1px solid ${d.rule}`, padding: "7px 10px", borderRadius: d.id === "travel_emerald" ? 4 : 0 }
    : { background: d.tint, padding: "8px 11px", borderRadius: d.id === "travel_minimal" ? 0 : 8 };
  return (
    <div className="tvx-fill" style={style}>
      <div style={{ fontSize: 8.5, letterSpacing: 1.2, textTransform: "uppercase", color: d.muted }}>{label}</div>
      <div style={{ fontSize: strong ? 14 : 12, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function MetaGrid({ d, meta }: { d: TravelDesign; meta: { label: string; value: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: "8px 14px", padding: "8px 2px", borderTop: `1px solid ${d.rule}`, borderBottom: `1px solid ${d.rule}` }}>
      {meta.map((m) => <Fact key={m.label} d={d} label={m.label} value={m.value} />)}
    </div>
  );
}

/* ── Passenger / line grid ───────────────────────────────────────────── */

function Grid({ d, columns, rows }: { d: TravelDesign; columns: TravelColumn[]; rows: Record<string, unknown>[] }) {
  const template = columns.map((c) => (typeof c.width === "number" ? `${c.width}px` : c.width || "minmax(0,1fr)")).join(" ");
  const filledHead = d.grid === "zebra" || (d.grid === "rows" && d.header === "band");
  const align = (c: TravelColumn) => c.align || "left";

  const head: CSSProperties = {
    display: "grid", gridTemplateColumns: template, gap: 0,
    background: filledHead ? d.accent : d.grid === "open" ? "transparent" : d.tint,
    color: filledHead ? d.onAccent : d.grid === "open" ? d.muted : d.ink,
    borderRadius: d.grid === "pills" ? 999 : 0,
    borderBottom: d.grid === "open" ? `1.5px solid ${d.ink}` : d.grid === "ruled" ? `1px solid ${d.rule}` : "none",
    border: d.grid === "ruled" ? `1px solid ${d.rule}` : undefined,
    fontSize: 9.5, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase",
  };

  return (
    <div style={{ marginTop: 2 }}>
      <div className="tvx-fill" style={head}>
        {columns.map((c) => (
          <div key={c.key} style={{ padding: "8px 10px", textAlign: align(c), borderLeft: d.grid === "ruled" ? `1px solid ${d.rule}` : undefined }}>{c.label}</div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: d.grid === "pills" ? 5 : 0, marginTop: d.grid === "pills" ? 6 : 0 }}>
        {rows.map((row, i) => (
          <div
            key={i}
            data-keep
            className="tvx-fill"
            style={{
              display: "grid", gridTemplateColumns: template,
              background: d.grid === "zebra" ? (i % 2 ? d.tint : "transparent") : d.grid === "pills" ? d.tint : "transparent",
              borderRadius: d.grid === "pills" ? 999 : 0,
              borderBottom: d.grid === "ruled" || d.grid === "rows" || d.grid === "open" ? `1px solid ${d.rule}` : "none",
              borderLeft: d.grid === "ruled" ? `1px solid ${d.rule}` : undefined,
              borderRight: d.grid === "ruled" ? `1px solid ${d.rule}` : undefined,
              fontSize: 11.5,
            }}
          >
            {columns.map((c, ci) => (
              <div
                key={c.key}
                style={{
                  padding: "9px 10px", textAlign: align(c), minWidth: 0, wordBreak: "break-word",
                  fontWeight: c.key === "passenger" || c.key === "pilgrim" || c.key === "fare" || c.key === "amount" ? 700 : 500,
                  borderLeft: d.grid === "ruled" && ci > 0 ? `1px solid ${d.rule}` : undefined,
                  color: cellText(c, row) === "—" ? d.muted : d.ink,
                }}
              >
                {cellText(c, row)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Totals ──────────────────────────────────────────────────────────── */

function Totals({ d, text }: { d: TravelDesign; text: string }) {
  const style: CSSProperties =
    d.totals === "bar"
      ? { background: d.accent, color: d.onAccent, borderRadius: d.header === "soft" ? 999 : 4, padding: "10px 16px" }
      : d.totals === "box"
        ? { border: `1.5px solid ${d.accent}`, padding: "9px 14px", borderRadius: d.id === "travel_boarding" ? 8 : 0 }
        : { borderTop: `2px solid ${d.ink}`, padding: "10px 2px 0" };
  return (
    <div data-keep style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
      <div className="tvx-fill" style={{ ...style, minWidth: "62mm", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 24 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase" }}>Total</span>
        <span style={{ fontSize: 18, fontWeight: 800 }}>{text}</span>
      </div>
    </div>
  );
}
