"use client";
import { confirmToast } from "@/lib/toast-feedback";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

// ─── Design tokens ────────────────────────────────────────────────────────────
const ff     = "'Outfit','Inter',sans-serif";
const accent = "#22c55e";

interface Payroll {
  id: string; employeeId: string; monthYear: string;
  baseSalary: number; allowances: number; deductions: number;
  deductionReason?: string; additionalCash: number; netSalary: number;
  paymentStatus: string;
  employee: { firstName: string; lastName: string; employeeId: string };
}

function fmt(n: number) { return n.toLocaleString("en-PK"); }

export default function PayrollPage() {
  const user = getCurrentUser();

  const [payroll,       setPayroll]       = useState<Payroll[]>([]);
  const [employees,     setEmployees]     = useState<any[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [showPreview,   setShowPreview]   = useState(false);
  const [detectedAdv,   setDetectedAdv]   = useState(0);
  const [monthYear,     setMonthYear]     = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  });
  const [form, setForm] = useState({
    employeeId: "", monthYear: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; })(),
    baseSalary: 0, allowances: 0, deductions: 0, deductionReason: "", additionalCash: 0,
  });

  const h = (json = false): Record<string, string> => ({
    "x-user-role":  user?.role || "",
    "x-user-id":    user?.id   || "",
    ...(json ? { "Content-Type": "application/json" } : {}),
  });

  useEffect(() => { fetchEmployees(); fetchPayroll(); setForm(p => ({ ...p, monthYear })); }, [monthYear]);

  useEffect(() => {
    if (form.employeeId && form.monthYear) calculateAutoDeductions();
    else setDetectedAdv(0);
  }, [form.employeeId, form.monthYear, form.baseSalary]);

  async function calculateAutoDeductions() {
    try {
      const [advRes, attRes] = await Promise.all([
        fetch(`/api/advance?employeeId=${form.employeeId}&status=PENDING&monthYear=${form.monthYear}`),
        fetch(`/api/attendance?employeeId=${form.employeeId}&month=${form.monthYear}`),
      ]);
      const [advData, attData] = await Promise.all([advRes.json(), attRes.json()]);
      const advTotal = Array.isArray(advData) ? advData.reduce((s: number, a: any) => s + a.amount, 0) : 0;
      const absents  = Array.isArray(attData)  ? attData.filter((r: any) => r.status === "ABSENT").length : 0;
      setDetectedAdv(advTotal);

      let prevDeduction = 0;
      try {
        const [yr, mo] = form.monthYear.split("-").map(Number);
        let py = yr, pm = mo - 1; if (pm === 0) { pm = 12; py--; }
        const prevStr = `${py}-${String(pm).padStart(2,"0")}`;
        const prevRes  = await fetch(`/api/payroll?employeeId=${form.employeeId}&monthYear=${prevStr}`, { cache: "no-store" });
        const prevData = await prevRes.json();
        if (Array.isArray(prevData) && prevData.length > 0) {
          const rec = prevData[0];
          const prevNet = rec.baseSalary + (rec.allowances || 0) - (rec.deductions || 0);
          const prevBal = prevNet - (rec.additionalCash || 0);
          if (prevBal < 0) prevDeduction = Math.abs(prevBal);
        }
      } catch {}

      const perDay = form.baseSalary > 0 ? form.baseSalary / 30 : 0;
      const absentDed = Math.round(absents * perDay);
      const total = advTotal + absentDed + prevDeduction;

      const parts: string[] = [];
      if (prevDeduction > 0) parts.push(`Prev Bal: ${prevDeduction}`);
      if (absents > 0) parts.push(`${absents} Absent`);
      if (advTotal > 0) parts.push("Advance");

      if (total > 0) setForm(p => ({ ...p, deductions: total, deductionReason: parts.join(", ") }));
    } catch {}
  }

  async function fetchEmployees() {
    try { const r = await fetch("/api/employees"); const d = await r.json(); setEmployees(Array.isArray(d) ? d : []); }
    catch { setEmployees([]); }
  }

  async function fetchPayroll() {
    setLoading(true);
    try { const r = await fetch(`/api/payroll?monthYear=${monthYear}`, { cache: "no-store" }); const d = await r.json(); setPayroll(Array.isArray(d) ? d : []); }
    catch { setPayroll([]); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return toast.error("Login required");
    setLoading(true);
    const res = await fetch(editingId ? `/api/payroll?id=${editingId}` : "/api/payroll", {
      method: editingId ? "PUT" : "POST", headers: h(true), body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success(editingId ? "Record updated!" : "Payroll saved!");
      setEditingId(null);
      setForm({ employeeId: "", monthYear, baseSalary: 0, allowances: 0, deductions: 0, deductionReason: "", additionalCash: 0 });
    } else { const d = await res.json(); toast.error(d.error || "Failed"); }
    await fetchPayroll(); setLoading(false);
  }

  function handleEdit(p: Payroll) {
    setEditingId(p.id);
    setForm({ employeeId: p.employeeId, monthYear: p.monthYear, baseSalary: p.baseSalary, allowances: p.allowances, deductions: p.deductions, deductionReason: p.deductionReason || "", additionalCash: p.additionalCash || 0 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this payroll record?") || !user) return;
    await fetch(`/api/payroll?id=${id}`, { method: "DELETE", headers: h() });
    await fetchPayroll();
  }

  function handlePrintPayslip(p: Payroll) {
    const w = window.open("", "_blank");
    if (!w) return toast.error("Allow popups to print");
    const pay  = p.baseSalary + p.allowances - p.deductions;
    const next = pay - (p.additionalCash || 0);
    w.document.open();
    w.document.close();
    w.document.documentElement.innerHTML = `<html><head><title>Payslip - ${p.employee.firstName}</title>
    <style>body{font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;border:1px solid #ccc}
    .row{display:flex;justify-content:space-between;margin-bottom:10px;border-bottom:1px dashed #eee;padding-bottom:5px}
    .label{font-weight:bold;color:#555}.amt{font-family:monospace}
    .footer{margin-top:40px;text-align:center;font-size:.8em;color:#888}
    @media print{body{border:none}}</style></head><body>
    <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #333;padding-bottom:10px">
    <h1>Payslip</h1><p>Period: ${p.monthYear}</p></div>
    <div class="row"><span class="label">Employee ID:</span><span>${p.employee.employeeId}</span></div>
    <div class="row"><span class="label">Employee Name:</span><span>${p.employee.firstName} ${p.employee.lastName}</span></div>
    <div class="row"><span class="label">Basic Salary:</span><span class="amt">${fmt(p.baseSalary)}</span></div>
    <div class="row"><span class="label">Allowances:</span><span class="amt">${fmt(p.allowances)}</span></div>
    <div class="row"><span class="label">Deductions:</span><span class="amt" style="color:red">-${fmt(p.deductions)}</span></div>
    ${p.deductionReason ? `<div class="row"><span class="label">Deduction Reason:</span><span>${p.deductionReason}</span></div>` : ""}
    <div class="row" style="font-weight:bold"><span class="label">Net Pay:</span><span class="amt">${fmt(pay)}</span></div>
    ${p.additionalCash > 0 ? `<div class="row"><span class="label">Cash Paid:</span><span class="amt">-${fmt(p.additionalCash)}</span></div>` : ""}
    <div class="row" style="font-weight:bold;${next < 0 ? "color:red" : ""}"><span class="label">Balance:</span><span class="amt">${fmt(next)}</span></div>
    <div class="footer"><p>System Generated Payslip</p></div>
    <div style="margin-top:32px;border-top:1px solid #eee;padding-top:8px;text-align:center;font-size:10px;color:#aaa">Powered by FinovaOS</div>
    <script>window.print();</script></body></html>`;
  }

  const totalBasic   = payroll.reduce((s, p) => s + p.baseSalary, 0);
  const totalDed     = payroll.reduce((s, p) => s + p.deductions, 0);
  const totalPaid    = payroll.reduce((s, p) => s + (p.additionalCash || 0), 0);
  const totalNeg     = payroll.reduce((s, p) => { const b = p.baseSalary + p.allowances - p.deductions - (p.additionalCash||0); return b < 0 ? s + b : s; }, 0);

  const panel: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, fontFamily: ff };
  const inp:   React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const lbl:   React.CSSProperties = { fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: accent }}>Payroll</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>Manage employee salaries, deductions, and payslips</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="month" value={monthYear} onChange={e => setMonthYear(e.target.value)}
            style={{ ...inp, width: "auto", padding: "8px 14px", fontWeight: 700, color: accent, borderColor: `${accent}44` }} />
          <button onClick={() => setShowPreview(true)}
            style={{ background: "rgba(255,255,255,0.07)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 16px", fontFamily: ff, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Preview
          </button>
          <button onClick={() => window.print()}
            style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontFamily: ff, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Print
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ ...panel, marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: accent, marginBottom: 18 }}>
          {editingId ? "Edit Payroll Record" : "New Payroll Entry"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 14, marginBottom: 14, alignItems: "end" }}>
          <div>
            <label style={lbl}>Employee *</label>
            <select style={inp} required value={form.employeeId}
              onChange={e => {
                const emp = employees.find(x => x.id === e.target.value);
                setForm(f => ({ ...f, employeeId: e.target.value, baseSalary: emp?.salary || 0 }));
              }}>
              <option value="">— Select Employee —</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.employeeId} — {e.firstName} {e.lastName}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Month *</label>
            <input type="month" style={inp} value={form.monthYear} onChange={e => setForm(f => ({ ...f, monthYear: e.target.value }))} required />
          </div>
          <div>
            <label style={lbl}>Basic Salary *</label>
            <input type="number" style={inp} placeholder="0" value={form.baseSalary}
              onChange={e => setForm(f => ({ ...f, baseSalary: +e.target.value || 0 }))} required />
          </div>
          <div>
            <label style={lbl}>Allowances</label>
            <input type="number" style={inp} placeholder="0" value={form.allowances}
              onChange={e => setForm(f => ({ ...f, allowances: +e.target.value || 0 }))} />
          </div>
          <button type="submit" disabled={loading}
            style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, whiteSpace: "nowrap" }}>
            {loading ? "Saving…" : editingId ? "Update" : "Save"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div>
            <label style={lbl}>Deductions {detectedAdv > 0 && <span style={{ color: "#f87171", marginLeft: 4 }}>(Auto: {fmt(detectedAdv)})</span>}</label>
            <input type="number" style={{ ...inp, borderColor: form.deductions > 0 ? "rgba(248,113,113,0.4)" : undefined }} placeholder="0"
              value={form.deductions} onChange={e => setForm(f => ({ ...f, deductions: +e.target.value || 0 }))} />
          </div>
          <div>
            <label style={lbl}>Deduction Reason</label>
            <input style={inp} placeholder="e.g. Advance, Absent" value={form.deductionReason}
              onChange={e => setForm(f => ({ ...f, deductionReason: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>Additional Cash (Manual Paid Out)</label>
            <input type="number" style={{ ...inp, borderColor: form.additionalCash > 0 ? "rgba(99,102,241,0.4)" : undefined }} placeholder="0"
              value={form.additionalCash} onChange={e => setForm(f => ({ ...f, additionalCash: +e.target.value || 0 }))} />
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Reduces net balance; negative balance carries forward</div>
          </div>
        </div>
      </form>

      {/* Table */}
      {loading ? (
        <div style={{ ...panel, textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading…</div>
      ) : (
        <div style={{ ...panel, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Emp ID","Name","Basic","Deductions","Reason","Pay","Paid","Next Month","Actions"].map((h) => (
                  <th key={h} style={{ padding: "12px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, textAlign: ["Basic","Deductions","Pay","Paid","Next Month"].includes(h) ? "right" : "left", background: h === "Next Month" ? "rgba(248,113,113,0.06)" : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payroll.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No payroll records for this month. Add your first entry!</td></tr>
              ) : payroll.map((p, idx) => {
                const pay  = p.baseSalary + p.allowances - p.deductions;
                const next = pay - (p.additionalCash || 0);
                return (
                  <tr key={p.id} style={{ borderBottom: idx < payroll.length - 1 ? "1px solid var(--border)" : "none" }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.03)"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: accent }}>{p.employee.employeeId}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{p.employee.firstName} {p.employee.lastName}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, textAlign: "right" }}>{fmt(p.baseSalary)}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, textAlign: "right", color: p.deductions > 0 ? "#f87171" : "var(--text-muted)" }}>
                      {p.deductions > 0 ? `-${fmt(p.deductions)}` : "—"}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)" }}>{p.deductionReason || "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, textAlign: "right", color: "#e2e8f0" }}>{fmt(pay)}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, textAlign: "right", color: "#818cf8" }}>{p.additionalCash > 0 ? fmt(p.additionalCash) : "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, textAlign: "right", background: "rgba(248,113,113,0.04)", color: next < 0 ? "#f87171" : "#22c55e" }}>
                      {next < 0 ? (
                        <span style={{ background: "rgba(248,113,113,0.15)", padding: "3px 8px", borderRadius: 6, fontSize: 11 }}>{fmt(next)}</span>
                      ) : fmt(next)}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handlePrintPayslip(p)} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "var(--text-muted)", cursor: "pointer", fontFamily: ff }}>Slip</button>
                        <button onClick={() => handleEdit(p)} style={{ background: "transparent", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#818cf8", cursor: "pointer", fontFamily: ff }}>Edit</button>
                        <button onClick={() => handleDelete(p.id)} style={{ background: "transparent", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#f87171", cursor: "pointer", fontFamily: ff }}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {payroll.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                  <td colSpan={2} style={{ padding: "12px 14px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Totals</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, textAlign: "right" }}>{fmt(totalBasic)}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, textAlign: "right", color: "#f87171" }}>-{fmt(totalDed)}</td>
                  <td></td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, textAlign: "right" }}>{fmt(totalBasic - totalDed)}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, textAlign: "right", color: "#818cf8" }}>{fmt(totalPaid)}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, textAlign: "right", color: totalNeg < 0 ? "#f87171" : "#22c55e" }}>{fmt(totalNeg)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto", padding: "24px 16px" }}>
          <div style={{ display: "flex", width: "100%", maxWidth: 820, justifyContent: "space-between", marginBottom: 16, alignItems: "center" }}>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: ff }}>Print Preview — {monthYear}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => window.print()} style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontFamily: ff, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Print Now</button>
              <button onClick={() => setShowPreview(false)} style={{ background: "#f87171", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontFamily: ff, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Close</button>
            </div>
          </div>

          {/* Paper */}
          <div style={{ background: "#fff", width: "100%", maxWidth: 820, minHeight: "297mm", padding: "20mm", borderRadius: 4, color: "#111", fontFamily: "Georgia, serif", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ textAlign: "center", marginBottom: 32, borderBottom: "2px solid #111", paddingBottom: 16 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", letterSpacing: 2, margin: 0 }}>Payroll Report</h1>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "#555" }}>Month: <strong>{monthYear}</strong></p>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  {["ID","Employee Name","Basic","Deductions","Reason","Pay","Paid","Next Month"].map(h => (
                    <th key={h} style={{ border: "2px solid #111", padding: "8px 10px", textAlign: ["Basic","Deductions","Pay","Paid","Next Month"].includes(h) ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payroll.map(p => {
                  const pay  = p.baseSalary + p.allowances - p.deductions;
                  const next = pay - (p.additionalCash || 0);
                  return (
                    <tr key={p.id}>
                      <td style={{ border: "1px solid #999", padding: "7px 10px" }}>{p.employee.employeeId}</td>
                      <td style={{ border: "1px solid #999", padding: "7px 10px" }}>{p.employee.firstName} {p.employee.lastName}</td>
                      <td style={{ border: "1px solid #999", padding: "7px 10px", textAlign: "right" }}>{fmt(p.baseSalary)}</td>
                      <td style={{ border: "1px solid #999", padding: "7px 10px", textAlign: "right", color: "#dc2626", fontWeight: 700 }}>{p.deductions > 0 ? `-${fmt(p.deductions)}` : "—"}</td>
                      <td style={{ border: "1px solid #999", padding: "7px 10px" }}>{p.deductionReason || "—"}</td>
                      <td style={{ border: "1px solid #999", padding: "7px 10px", textAlign: "right", fontWeight: 700 }}>{fmt(pay)}</td>
                      <td style={{ border: "1px solid #999", padding: "7px 10px", textAlign: "right", color: "#2563eb" }}>{p.additionalCash > 0 ? fmt(p.additionalCash) : "—"}</td>
                      <td style={{ border: "1px solid #999", padding: "7px 10px", textAlign: "right", fontWeight: 700, color: next < 0 ? "#dc2626" : "#16a34a", background: next < 0 ? "#fef2f2" : "transparent" }}>{fmt(next)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f3f4f6", fontWeight: 700 }}>
                  <td colSpan={2} style={{ border: "1px solid #999", padding: "8px 10px", textAlign: "right" }}>TOTALS:</td>
                  <td style={{ border: "1px solid #999", padding: "8px 10px", textAlign: "right" }}>{fmt(totalBasic)}</td>
                  <td style={{ border: "1px solid #999", padding: "8px 10px", textAlign: "right", color: "#dc2626" }}>-{fmt(totalDed)}</td>
                  <td style={{ border: "1px solid #999", padding: "8px 10px" }}></td>
                  <td style={{ border: "1px solid #999", padding: "8px 10px", textAlign: "right" }}>{fmt(totalBasic - totalDed)}</td>
                  <td style={{ border: "1px solid #999", padding: "8px 10px", textAlign: "right", color: "#2563eb" }}>{fmt(totalPaid)}</td>
                  <td style={{ border: "1px solid #999", padding: "8px 10px", textAlign: "right", color: totalNeg < 0 ? "#dc2626" : "#16a34a" }}>{fmt(totalNeg)}</td>
                </tr>
              </tfoot>
            </table>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 80, padding: "0 20px" }}>
              <div style={{ borderTop: "2px solid #111", width: 140, textAlign: "center", paddingTop: 8, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Prepared By</div>
              <div style={{ borderTop: "2px solid #111", width: 140, textAlign: "center", paddingTop: 8, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Approved By</div>
            </div>
            <div style={{ marginTop: 40, textAlign: "center", fontSize: 10, color: "#999" }}>
              System Generated Report — {new Date().toLocaleString()} — Powered by FinovaOS
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
