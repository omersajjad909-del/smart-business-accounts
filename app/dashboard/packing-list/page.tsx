"use client";
import { useEffect, useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const FONT = "'Outfit','Inter',sans-serif";
const ACCENT = "#10b981";

interface PackItem { marks: string; description: string; hsCode: string; packages: number; pkgType: string; netWeight: number; grossWeight: number; cbm: number; }
function newItem(): PackItem { return { marks: "", description: "", hsCode: "", packages: 1, pkgType: "Carton", netWeight: 0, grossWeight: 0, cbm: 0 }; }

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: "rgba(148,163,184,0.12)", color: "#94a3b8" },
  PREPARED:  { bg: "rgba(14,165,233,0.12)",  color: "#38bdf8" },
  VERIFIED:  { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24" },
  SHIPPED:   { bg: "rgba(16,185,129,0.12)",  color: "#34d399" },
};

export default function PackingListPage() {
  const { records, loading, create, update, remove } = useBusinessRecords("packing_list");
  const [commercialInvoices, setCommercialInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const [form, setForm] = useState({
    commercialInvoiceId: "",
    plNo: "", date: new Date().toISOString().slice(0,10),
    exporter: "", importer: "", ciNo: "", blNo: "",
    vessel: "", portOfLoading: "", portOfDischarge: "",
    finalDestination: "", status: "DRAFT", notes: "",
  });
  const [items, setItems] = useState<PackItem[]>([newItem()]);

  const totals = useMemo(() => items.reduce((acc, it) => ({
    packages: acc.packages + it.packages,
    netWeight: acc.netWeight + it.netWeight,
    grossWeight: acc.grossWeight + it.grossWeight,
    cbm: acc.cbm + it.cbm,
  }), { packages: 0, netWeight: 0, grossWeight: 0, cbm: 0 }), [items]);

  const enriched = useMemo(() => records.map(r => ({
    ...r, d: typeof r.data === "string" ? JSON.parse(r.data || "{}") : (r.data || {}),
  })), [records]);

  useEffect(() => {
    fetch("/api/business-records?category=commercial_invoice")
      .then((r) => r.json())
      .then((data) => setCommercialInvoices(Array.isArray(data) ? data : []))
      .catch(() => setCommercialInvoices([]));
  }, []);

  const filtered = useMemo(() => {
    let list = enriched;
    if (filterStatus !== "ALL") list = list.filter(r => r.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.title?.toLowerCase().includes(q) || r.d.importer?.toLowerCase().includes(q) || r.d.ciNo?.toLowerCase().includes(q));
    }
    return list;
  }, [enriched, filterStatus, search]);

  const kpis = useMemo(() => ({
    total: enriched.length,
    draft: enriched.filter(r => r.status === "DRAFT").length,
    shipped: enriched.filter(r => r.status === "SHIPPED").length,
    totalPkg: enriched.reduce((s, r) => s + (r.d.totals?.packages || 0), 0),
  }), [enriched]);

  const openNew = () => {
    const n = String(Date.now()).slice(-6);
    setForm(f => ({ ...f, commercialInvoiceId: "", plNo: `PL-${n}`, status: "DRAFT" }));
    setItems([newItem()]);
    setEditing(null);
    setModal(true);
  };

  const openEdit = (r: typeof enriched[0]) => {
    const d = r.d;
    setForm({ commercialInvoiceId: d.commercialInvoiceId || "", plNo: r.title||"", date: r.date?.slice(0,10)||new Date().toISOString().slice(0,10), exporter: d.exporter||"", importer: d.importer||"", ciNo: d.ciNo||"", blNo: d.blNo||"", vessel: d.vessel||"", portOfLoading: d.portOfLoading||"", portOfDischarge: d.portOfDischarge||"", finalDestination: d.finalDestination||"", status: r.status||"DRAFT", notes: d.notes||"" });
    setItems(d.items?.length ? d.items : [newItem()]);
    setEditing(r.id);
    setModal(true);
  };

  const handleSave = async () => {
    const data = { ...form, items, totals };
    if (editing) await update(editing, { title: form.plNo, status: form.status, amount: totals.grossWeight, date: form.date, data });
    else await create({ title: form.plNo, status: form.status, amount: totals.grossWeight, date: form.date, data });
    setModal(false);
  };

  const sf = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));
  const fillFromCommercialInvoice = (recordId: string) => {
    const record = commercialInvoices.find((row) => row.id === recordId);
    const d = record?.data || {};
    if (!record) return;
    setForm((prev) => ({
      ...prev,
      commercialInvoiceId: record.id,
      ciNo: record.title || prev.ciNo,
      exporter: d.exporter || prev.exporter,
      importer: d.importer || prev.importer,
      blNo: d.blNo || prev.blNo,
      portOfLoading: d.portOfLoading || prev.portOfLoading,
      portOfDischarge: d.portOfDischarge || prev.portOfDischarge,
      finalDestination: d.countryOfDestination || prev.finalDestination,
      date: String(record.date || prev.date).slice(0, 10),
    }));
    if (Array.isArray(d.lines) && d.lines.length) {
      setItems(d.lines.map((line: any, index: number) => ({
        marks: `CTN-${index + 1}`,
        description: line.description || "",
        hsCode: line.hsCode || "",
        packages: 1,
        pkgType: "Carton",
        netWeight: 0,
        grossWeight: 0,
        cbm: 0,
      })));
    }
  };
  const si = (i: number, k: keyof PackItem, v: string | number) => setItems(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const printRecord = (r: typeof enriched[0]) => {
    const win = window.open("", "_blank", "width=1100,height=900");
    if (!win) return;
    const d = r.d;
    const itemsHtml = (d.items || []).map((item: PackItem) => `
      <tr><td>${item.marks || "-"}</td><td>${item.description || "-"}</td><td>${item.hsCode || "-"}</td><td style="text-align:right">${item.packages || 0}</td><td>${item.pkgType || "-"}</td><td style="text-align:right">${Number(item.netWeight || 0).toFixed(2)}</td><td style="text-align:right">${Number(item.grossWeight || 0).toFixed(2)}</td><td style="text-align:right">${Number(item.cbm || 0).toFixed(3)}</td></tr>
    `).join("");
    win.document.write(`<!doctype html><html><head><title>${r.title}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #d1d5db;padding:8px;font-size:12px;text-align:left}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}</style></head><body><h1>Packing List</h1><div><b>PL No:</b> ${r.title}</div><div><b>Date:</b> ${String(r.date||"").replace(/(\d{4})-(\d{2})-(\d{2})/,"$3-$2-$1")}</div><div class="grid"><div><b>Exporter:</b> ${d.exporter || "-"}</div><div><b>Importer:</b> ${d.importer || "-"}</div><div><b>CI No:</b> ${d.ciNo || "-"}</div><div><b>BL / AWB:</b> ${d.blNo || "-"}</div><div><b>Port of Loading:</b> ${d.portOfLoading || "-"}</div><div><b>Port of Discharge:</b> ${d.portOfDischarge || "-"}</div></div><table><thead><tr><th>Marks</th><th>Description</th><th>HS Code</th><th>Pkgs</th><th>Type</th><th>Net Wt</th><th>Gross Wt</th><th>CBM</th></tr></thead><tbody>${itemsHtml}</tbody></table><div style="margin-top:40px;border-top:1px solid #e5e7eb;padding-top:8px;text-align:center;font-size:10px;color:#aaa;letter-spacing:.04em">Powered by FinovaOS</div></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const th: React.CSSProperties = { padding: "11px 14px", textAlign: "left", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, borderBottom: "1px solid var(--border)", fontWeight: 600, whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text-primary)" };
  const inp = (extra?: React.CSSProperties): React.CSSProperties => ({ background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text-primary)", fontSize: 13, fontFamily: FONT, outline: "none", width: "100%", boxSizing: "border-box", ...extra });
  const lbl: React.CSSProperties = { fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 5 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", padding: "32px 28px", fontFamily: FONT, color: "var(--text-primary)" }}>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.5 }}>Packing List</h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Export packing details — marks, weights, CBM per shipment</p>
        </div>
        <button onClick={openNew} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
          + New Packing List
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Lists", value: kpis.total, color: ACCENT },
          { label: "Draft", value: kpis.draft, color: "#94a3b8" },
          { label: "Shipped", value: kpis.shipped, color: "#34d399" },
          { label: "Total Packages", value: kpis.totalPkg.toLocaleString(), color: "#a5b4fc" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 3, background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 3 }}>
          {["ALL","DRAFT","PREPARED","VERIFIED","SHIPPED"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{ background: filterStatus === s ? ACCENT : "transparent", color: filterStatus === s ? "#fff" : "var(--text-muted)", border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>{s === "ALL" ? "All" : s.charAt(0)+s.slice(1).toLowerCase()}</button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search PL No, importer, CI No…" style={{ flex: 1, minWidth: 200, ...inp() }} />
      </div>

      {/* Table */}
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
        : filtered.length === 0 ? <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>No packing lists yet.</div>
        : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              {["PL No","Exporter","Importer","CI No","Port Loading → Discharge","Packages","Gross Wt (kg)","CBM","Status","Actions"].map(h => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((r, i) => {
                const ss = STATUS_STYLE[r.status] || STATUS_STYLE.DRAFT;
                const t = r.d.totals || {};
                return (
                  <tr key={r.id} style={{ background: i % 2 === 1 ? "rgba(255,255,255,0.013)" : "transparent" }}>
                    <td style={{ ...td, fontWeight: 700, color: "#34d399" }}>{r.title}</td>
                    <td style={td}>{r.d.exporter || "—"}</td>
                    <td style={td}>{r.d.importer || "—"}</td>
                    <td style={{ ...td, fontSize: 12, color: "var(--text-muted)" }}>{r.d.ciNo || "—"}</td>
                    <td style={{ ...td, fontSize: 12, color: "var(--text-muted)" }}>{r.d.portOfLoading||"—"} → {r.d.portOfDischarge||"—"}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{t.packages?.toLocaleString() || "—"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{t.grossWeight?.toLocaleString() || "—"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{t.cbm?.toFixed(2) || "—"}</td>
                    <td style={td}><span style={{ ...ss, display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{r.status}</span></td>
                    <td style={td}><div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(r)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>Edit</button>
                      <button onClick={() => printRecord(r)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#34d399", cursor: "pointer" }}>Print</button>
                      <button onClick={() => remove(r.id)} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: 15 }}>×</button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }}
          onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 18, width: "100%", maxWidth: 900, padding: "28px 32px", fontFamily: FONT, marginTop: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{editing ? "Edit Packing List" : "New Packing List"}</h2>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>

            {/* Header fields */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
              <div><label style={lbl}>Commercial Invoice</label>
                <select value={form.commercialInvoiceId} onChange={e => fillFromCommercialInvoice(e.target.value)} style={inp()}>
                  <option value="">Select commercial invoice</option>
                  {commercialInvoices.map((record) => <option key={record.id} value={record.id}>{record.title} - {record.data?.importer || "Importer"}</option>)}
                </select>
              </div>
              <div><label style={lbl}>PL No</label><input value={form.plNo} onChange={e => sf("plNo", e.target.value)} style={inp()} /></div>
              <div><label style={lbl}>Date</label><input type="date" value={form.date} onChange={e => sf("date", e.target.value)} style={inp()} /></div>
              <div><label style={lbl}>Status</label>
                <select value={form.status} onChange={e => sf("status", e.target.value)} style={inp()}>
                  {["DRAFT","PREPARED","VERIFIED","SHIPPED"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div><label style={lbl}>Exporter</label><input value={form.exporter} onChange={e => sf("exporter", e.target.value)} style={inp()} /></div>
              <div><label style={lbl}>Importer</label><input value={form.importer} onChange={e => sf("importer", e.target.value)} style={inp()} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
              <div><label style={lbl}>CI No</label><input value={form.ciNo} onChange={e => sf("ciNo", e.target.value)} style={inp()} /></div>
              <div><label style={lbl}>BL / AWB No</label><input value={form.blNo} onChange={e => sf("blNo", e.target.value)} style={inp()} /></div>
              <div><label style={lbl}>Port of Loading</label><input value={form.portOfLoading} onChange={e => sf("portOfLoading", e.target.value)} style={inp()} /></div>
              <div><label style={lbl}>Port of Discharge</label><input value={form.portOfDischarge} onChange={e => sf("portOfDischarge", e.target.value)} style={inp()} /></div>
            </div>

            {/* Packing table */}
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>Packing Details</div>
            <div style={{ background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 10, overflow: "auto", marginBottom: 20 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Marks & Nos","Description","HS Code","Pkgs","Type","Net Wt (kg)","Gross Wt (kg)","CBM",""].map(h => (
                    <th key={h} style={{ padding: "9px 10px", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "5px 6px", width: 90 }}><input value={it.marks} onChange={e => si(i, "marks", e.target.value)} style={{ ...inp(), fontSize: 12 }} /></td>
                      <td style={{ padding: "5px 6px" }}><input value={it.description} onChange={e => si(i, "description", e.target.value)} style={inp()} /></td>
                      <td style={{ padding: "5px 6px", width: 100 }}><input value={it.hsCode} onChange={e => si(i, "hsCode", e.target.value)} style={{ ...inp(), fontSize: 12 }} /></td>
                      <td style={{ padding: "5px 6px", width: 60 }}><input type="number" value={it.packages} onChange={e => si(i, "packages", Number(e.target.value))} min={1} style={{ ...inp(), textAlign: "right" }} /></td>
                      <td style={{ padding: "5px 6px", width: 90 }}><input value={it.pkgType} onChange={e => si(i, "pkgType", e.target.value)} placeholder="Carton" style={inp()} /></td>
                      <td style={{ padding: "5px 6px", width: 80 }}><input type="number" value={it.netWeight} onChange={e => si(i, "netWeight", Number(e.target.value))} min={0} step={0.01} style={{ ...inp(), textAlign: "right" }} /></td>
                      <td style={{ padding: "5px 6px", width: 90 }}><input type="number" value={it.grossWeight} onChange={e => si(i, "grossWeight", Number(e.target.value))} min={0} step={0.01} style={{ ...inp(), textAlign: "right" }} /></td>
                      <td style={{ padding: "5px 6px", width: 80 }}><input type="number" value={it.cbm} onChange={e => si(i, "cbm", Number(e.target.value))} min={0} step={0.001} style={{ ...inp(), textAlign: "right" }} /></td>
                      <td style={{ padding: "5px 6px", width: 28 }}>{items.length > 1 && <button onClick={() => setItems(ls => ls.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16 }}>×</button>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "rgba(16,185,129,0.06)", borderTop: "1px solid var(--border)" }}>
                    <td colSpan={3} style={{ padding: "10px 10px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>TOTALS</td>
                    <td style={{ padding: "10px 6px", textAlign: "right", fontWeight: 800, color: "#34d399" }}>{totals.packages}</td>
                    <td />
                    <td style={{ padding: "10px 6px", textAlign: "right", fontWeight: 700, color: "#34d399" }}>{totals.netWeight.toFixed(2)}</td>
                    <td style={{ padding: "10px 6px", textAlign: "right", fontWeight: 700, color: "#34d399" }}>{totals.grossWeight.toFixed(2)}</td>
                    <td style={{ padding: "10px 6px", textAlign: "right", fontWeight: 700, color: "#34d399" }}>{totals.cbm.toFixed(3)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
              <button onClick={() => setItems(ls => [...ls, newItem()])} style={{ width: "100%", background: "transparent", border: "none", padding: "10px", fontSize: 13, color: ACCENT, cursor: "pointer", fontWeight: 600, fontFamily: FONT }}>
                + Add Row
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Notes</label>
              <textarea value={form.notes} onChange={e => sf("notes", e.target.value)} rows={2} style={{ ...inp(), resize: "none" }} />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setModal(false)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 20px", fontSize: 13, cursor: "pointer", color: "var(--text-muted)", fontFamily: FONT }}>Cancel</button>
              <button onClick={handleSave} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 9, padding: "9px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                {editing ? "Update" : "Create Packing List"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
