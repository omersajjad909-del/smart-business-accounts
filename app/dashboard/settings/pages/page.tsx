"use client";

/**
 * Settings → Pages.
 *
 * Every page this company's plan gives it, in one list, with a switch each.
 * Turning one off takes it out of the sidebar; it does not cancel anything and
 * it is not a downgrade — the page comes back the moment the switch goes on.
 *
 * Deliberately not a registry feature itself. There is no id by which this
 * screen could be hidden, so no sequence of switches can leave a company with
 * no way back to it.
 */

import { useEffect, useMemo, useState } from "react";
import { useResponsive } from "@/hooks/useResponsive";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

type Page = {
  id: string;
  label: string;
  route: string;
  section: string;
  description: string;
  hideable: boolean;
};

export default function PagePrefsPage() {
  const { isMobile } = useResponsive();
  const [pages, setPages] = useState<Page[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/company/page-prefs", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) { setError(d.error); return; }
        setPages(Array.isArray(d.pages) ? d.pages : []);
        const off = new Set<string>(Array.isArray(d.hidden) ? d.hidden : []);
        setHidden(off);
        setSaved(new Set(off));
        setCanEdit(Boolean(d.canEdit));
      })
      .catch(() => setError("Could not load your pages."))
      .finally(() => setLoading(false));
  }, []);

  /* Grouped the way the sidebar groups them, so the list on screen reads like
     the thing it is editing rather than an alphabetical inventory. */
  const sections = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matched = term
      ? pages.filter((p) => p.label.toLowerCase().includes(term) || p.section.toLowerCase().includes(term))
      : pages;
    const by = new Map<string, Page[]>();
    for (const p of matched) {
      const list = by.get(p.section) || [];
      list.push(p);
      by.set(p.section, list);
    }
    return [...by.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [pages, search]);

  const dirty = useMemo(
    () => hidden.size !== saved.size || [...hidden].some((id) => !saved.has(id)),
    [hidden, saved],
  );

  const toggle = (id: string) => {
    if (!canEdit) return;
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setNote("");
  };

  const setSection = (list: Page[], on: boolean) => {
    if (!canEdit) return;
    setHidden((prev) => {
      const next = new Set(prev);
      for (const p of list) {
        if (!p.hideable) continue;
        if (on) next.delete(p.id); else next.add(p.id);
      }
      return next;
    });
    setNote("");
  };

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/company/page-prefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: [...hidden] }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Could not save.");
      setSaved(new Set(body.hidden ?? [...hidden]));
      setNote("Saved. The sidebar updates on your next page load.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const shownCount = pages.length - hidden.size;

  return (
    <div style={{ fontFamily: ff, color: "var(--ink-solid, #fff)", padding: isMobile ? "16px 12px 80px" : "24px 28px 80px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Pages</h1>
          <p style={{ fontSize: 13.5, color: "rgba(var(--ink),.45)", margin: 0, maxWidth: 620, lineHeight: 1.6 }}>
            Everything your plan includes. Switch off what this business does not use and it leaves the
            sidebar — nothing is cancelled, and it comes back the moment you switch it on again.
          </p>
        </div>
        <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#22c55e" }}>{shownCount}</div>
          <div style={{ fontSize: 11.5, color: "rgba(var(--ink),.35)" }}>of {pages.length} shown</div>
        </div>
      </div>

      {!canEdit && !loading && (
        <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.28)", color: "rgba(var(--ink),.7)", fontSize: 12.5 }}>
          Only an admin can change this — one sidebar is shared by everyone in the company.
        </div>
      )}
      {error && (
        <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", color: "#fca5a5", fontSize: 12.5 }}>
          {error}
        </div>
      )}
      {note && (
        <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.28)", color: "#86efac", fontSize: 12.5 }}>
          {note}
        </div>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Find a page…"
        style={{
          width: "100%", marginTop: 18, padding: "10px 13px", borderRadius: 10,
          background: bg, border: `1px solid ${border}`, color: "#fff",
          fontSize: 13.5, fontFamily: ff, boxSizing: "border-box", outline: "none",
        }}
      />

      {loading ? (
        <div style={{ marginTop: 24, color: "rgba(var(--ink),.3)", fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {sections.map(([section, list]) => {
            const off = list.filter((p) => hidden.has(p.id)).length;
            return (
              <div key={section} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "12px 12px" : "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800 }}>
                    {section}
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(var(--ink),.35)", marginLeft: 8 }}>
                      {list.length - off} of {list.length} on
                    </span>
                  </div>
                  {canEdit && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setSection(list, true)} style={miniBtn}>All on</button>
                      <button onClick={() => setSection(list, false)} style={miniBtn}>All off</button>
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: 8 }}>
                  {list.map((p) => {
                    const on = !hidden.has(p.id);
                    return (
                      <label
                        key={p.id}
                        title={p.hideable ? p.route : "This one stays — it is how you get back here"}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "9px 11px",
                          borderRadius: 10, border: `1px solid ${on ? "rgba(34,197,94,.25)" : border}`,
                          background: on ? "rgba(34,197,94,.06)" : "rgba(var(--ink),.02)",
                          cursor: canEdit && p.hideable ? "pointer" : "default",
                          opacity: p.hideable ? 1 : .55,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={!canEdit || !p.hideable}
                          onChange={() => toggle(p.id)}
                        />
                        <span style={{ minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: on ? "#fff" : "rgba(var(--ink),.45)" }}>
                            {p.label}
                          </span>
                          {p.description && (
                            <span style={{ display: "block", fontSize: 11, color: "rgba(var(--ink),.3)", marginTop: 1 }}>
                              {p.description}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {sections.length === 0 && (
            <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 36, textAlign: "center", color: "rgba(var(--ink),.28)", fontSize: 13 }}>
              Nothing matches “{search}”.
            </div>
          )}
        </div>
      )}

      {/* Held against the bottom of the screen: the list is long enough that a
          save button at its foot is a scroll away from most of the switches. */}
      {canEdit && dirty && (
        <div style={{
          position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 12, padding: "11px 16px",
          borderRadius: 14, background: "rgba(10,13,32,.95)", border: `1px solid ${border}`,
          backdropFilter: "blur(10px)", boxShadow: "0 12px 40px rgba(0,0,0,.45)", zIndex: 50,
        }}>
          <span style={{ fontSize: 12.5, color: "rgba(var(--ink),.6)", whiteSpace: "nowrap" }}>
            {hidden.size} page{hidden.size === 1 ? "" : "s"} switched off
          </span>
          <button onClick={() => setHidden(new Set(saved))} disabled={saving} style={miniBtn}>Undo</button>
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: "8px 18px", borderRadius: 10, border: "none",
              background: saving ? "rgba(34,197,94,.45)" : "#22c55e",
              color: "#04120a", fontSize: 13, fontWeight: 800, fontFamily: ff,
              cursor: saving ? "not-allowed" : "pointer", whiteSpace: "nowrap",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

const miniBtn: React.CSSProperties = {
  padding: "5px 11px", borderRadius: 8, background: "rgba(var(--ink),.05)",
  border: `1px solid ${border}`, color: "rgba(var(--ink),.6)",
  fontSize: 11.5, fontWeight: 700, fontFamily: ff, cursor: "pointer", whiteSpace: "nowrap",
};
