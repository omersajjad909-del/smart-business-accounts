"use client";

/**
 * Import a sector's timetable from a flight-data provider.
 *
 * Nothing is saved until the operator has looked at it. Provider data is wrong
 * often enough — a codeshare listed as its own flight, a seasonal service that
 * stopped, an arrival time missing entirely — that writing a screenful of rows
 * straight into the schedule would put times onto quotes nobody ever checked,
 * which is the thing this whole area of the app exists to stop.
 */

import { useState } from "react";

import { AIRPORTS } from "@/lib/travel/flightSearch";
import { Field, GhostButton, PrimaryButton, T, flightCss, inputStyle } from "./ui";

type Flight = {
  airline: string;
  airlineIata: string;
  flightNo: string;
  from: string;
  to: string;
  departAt: string;
  arriveAt: string;
  days: number[];
  aircraft: string;
};

const airportCodes = AIRPORTS.map((a) => a.code);

export function ScheduleImport() {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ from: "", to: "", date: today });
  /* Empty means daily, which is what most of these are. The provider cannot
     tell us, so this is the operator's call and it is asked for rather than
     assumed. */
  const [days, setDays] = useState("");
  const [flights, setFlights] = useState<Flight[] | null>(null);
  const [keep, setKeep] = useState<Record<string, boolean>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [open, setOpen] = useState(false);

  const cell = { ...inputStyle, padding: "9px 11px", fontSize: 13 };

  async function fetchFlights() {
    setBusy(true);
    setError("");
    setSaved("");
    setFlights(null);
    try {
      const response = await fetch("/api/travel/schedules/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: form.from.toUpperCase(),
          to: form.to.toUpperCase(),
          date: form.date,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Could not reach the provider");
      const rows: Flight[] = Array.isArray(body.flights) ? body.flights : [];
      setFlights(rows);
      setWarnings(Array.isArray(body.warnings) ? body.warnings : []);
      // Everything is kept by default; the operator unticks what they do not
      // recognise, which is the quicker way round for a list that is mostly right.
      setKeep(Object.fromEntries(rows.map((row) => [row.flightNo + row.departAt, true])));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Could not reach the provider");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!flights) return;
    const chosen = flights.filter((row) => keep[row.flightNo + row.departAt]);
    if (!chosen.length) { setError("Nothing is ticked to save."); return; }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/travel/schedules/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: form.from.toUpperCase(),
          to: form.to.toUpperCase(),
          date: form.date,
          save: true,
          flights: chosen.map((row) => ({
            ...row,
            days: days
              .split(/[^0-9]+/)
              .map((n) => Number(n))
              .filter((n) => n >= 1 && n <= 7),
          })),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Could not save");
      const created = Array.isArray(body.created) ? body.created.length : 0;
      const skipped = Array.isArray(body.skipped) ? body.skipped.length : 0;
      setSaved(`${created} saved${skipped ? `, ${skipped} already in your timetable` : ""}.`);
      setFlights(null);
      // The list below is loaded once on mount and has no way to be told; a
      // reload is blunt but it is the honest way to show what was just written.
      setTimeout(() => window.location.reload(), 1200);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  function patch(index: number, changes: Partial<Flight>) {
    setFlights((prev) => (prev ? prev.map((row, i) => (i === index ? { ...row, ...changes } : row)) : prev));
  }

  const ready = form.from.length === 3 && form.to.length === 3 && form.from !== form.to && Boolean(form.date);

  return (
    <section
      style={{
        background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
        padding: 16, marginBottom: 16, display: "grid", gap: open ? 14 : 0,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: flightCss }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>📡 Import a sector from a provider</div>
          <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
            One call per sector, saved here for good — searches afterwards cost nothing.
          </div>
        </div>
        <GhostButton onClick={() => setOpen((o) => !o)}>{open ? "Close" : "Open"}</GhostButton>
      </div>

      {open ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr)) auto", gap: 12, alignItems: "end" }}>
            <Field label="From (IATA)" required>
              <input
                list="import-airports" value={form.from} className="fl-in"
                onChange={(e) => setForm({ ...form, from: e.target.value.toUpperCase().slice(0, 3) })}
                placeholder="SKT" style={cell}
              />
            </Field>
            <Field label="To (IATA)" required>
              <input
                list="import-airports" value={form.to} className="fl-in"
                onChange={(e) => setForm({ ...form, to: e.target.value.toUpperCase().slice(0, 3) })}
                placeholder="LHE" style={cell}
              />
            </Field>
            <Field label="Sample Date" required hint="A day the sector actually operates">
              <input type="date" value={form.date} className="fl-in"
                onChange={(e) => setForm({ ...form, date: e.target.value })} style={cell} />
            </Field>
            <PrimaryButton onClick={fetchFlights} disabled={!ready || busy}>
              {busy ? "Asking…" : "Fetch flights"}
            </PrimaryButton>
          </div>
          <datalist id="import-airports">
            {airportCodes.map((code) => <option key={code} value={code} />)}
          </datalist>

          {error ? (
            <div style={{ border: "1px solid rgba(248,113,113,.4)", background: "rgba(248,113,113,.1)", color: "#f87171", borderRadius: 11, padding: "11px 14px", fontSize: 12.5, lineHeight: 1.5 }}>
              {error}
            </div>
          ) : null}

          {saved ? (
            <div style={{ border: "1px solid rgba(52,211,153,.4)", background: "rgba(52,211,153,.1)", color: "#34d399", borderRadius: 11, padding: "11px 14px", fontSize: 12.5 }}>
              {saved} Refreshing…
            </div>
          ) : null}

          {warnings.length ? (
            <ul style={{ margin: 0, paddingLeft: 17, display: "grid", gap: 5 }}>
              {warnings.map((note) => (
                <li key={note} style={{ fontSize: 11.5, color: "#f4c25b", lineHeight: 1.5 }}>{note}</li>
              ))}
            </ul>
          ) : null}

          {flights?.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 12.5, color: T.muted }}>
                {flights.length} flight{flights.length === 1 ? "" : "s"} came back. Untick anything you do not recognise,
                and fill any arrival time the provider left blank — then save.
              </div>

              {flights.map((row, index) => {
                const id = row.flightNo + row.departAt;
                return (
                  <div
                    key={id}
                    style={{
                      display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto auto", gap: 12,
                      alignItems: "center", border: `1px solid ${T.border}`, borderRadius: 11,
                      padding: 11, background: T.panel,
                    }}
                  >
                    <input
                      type="checkbox" checked={Boolean(keep[id])}
                      onChange={(e) => setKeep({ ...keep, [id]: e.target.checked })}
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>
                        {row.flightNo} <span style={{ color: T.muted, fontWeight: 500 }}>· {row.airline || row.airlineIata}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: T.muted }}>
                        {row.from} → {row.to}{row.aircraft ? ` · ${row.aircraft}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: 3 }}>
                      <span style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>Departs</span>
                      <input value={row.departAt} onChange={(e) => patch(index, { departAt: e.target.value })}
                        style={{ ...cell, width: 82, textAlign: "center" }} className="fl-in" />
                    </div>
                    <div style={{ display: "grid", gap: 3 }}>
                      <span style={{ fontSize: 10, color: row.arriveAt ? T.muted : "#f4c25b", textTransform: "uppercase", letterSpacing: ".05em" }}>
                        Arrives{row.arriveAt ? "" : " *"}
                      </span>
                      <input value={row.arriveAt} placeholder="--:--"
                        onChange={(e) => patch(index, { arriveAt: e.target.value })}
                        style={{ ...cell, width: 82, textAlign: "center", borderColor: row.arriveAt ? T.border : "rgba(244,194,91,.5)" }}
                        className="fl-in" />
                    </div>
                  </div>
                );
              })}

              <div
                style={{
                  display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap",
                  borderTop: `1px solid ${T.border}`, paddingTop: 12,
                }}
              >
                <div style={{ flex: "0 1 240px" }}>
                  <Field label="Operating days" hint="Empty = daily. Otherwise 1=Mon … 7=Sun, e.g. 1,3,5">
                    <input
                      value={days} onChange={(e) => setDays(e.target.value)}
                      placeholder="Daily" style={cell} className="fl-in"
                    />
                  </Field>
                </div>
                <div style={{ flex: 1 }} />
                <GhostButton onClick={() => setFlights(null)}>Discard</GhostButton>
                <PrimaryButton onClick={save} disabled={busy}>
                  {busy ? "Saving…" : "Save ticked flights"}
                </PrimaryButton>
              </div>
            </div>
          ) : null}

          {flights?.length === 0 ? (
            <div style={{ fontSize: 12.5, color: T.muted }}>
              Nothing came back for that sector and date. Try a day the route actually operates, or add the flight by hand below.
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
