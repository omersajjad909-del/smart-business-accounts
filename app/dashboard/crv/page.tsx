"use client";
import { confirmToast } from "@/lib/toast-feedback";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "react-hot-toast";

// ─── Design tokens ────────────────────────────────────────────────────────────
const ff     = "'Outfit','Inter',sans-serif";
const accent = "#22c55e";

type Account = { id: string; name: string; phone?: string | null; partyType?: string | null };
type BankAcc  = { id: string; rawId: string; name: string };
type Voucher  = { id: string; voucherNo: string; date: string; narration: string; accountName: string; accountId: string; amount: number; paymentMode: string; paymentAccountId: string };

function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function CRVPage() {
  const today = new Date().toISOString().slice(0, 10);
  const user  = getCurrentUser();

  const [customers,    setCustomers]    = useState<Account[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAcc[]>([]);
  const [vouchers,     setVouchers]     = useState<Voucher[]>([]);
  const [showList,     setShowList]     = useState(false);
  const [editing,      setEditing]      = useState<Voucher | null>(null);
  const [saved,        setSaved]        = useState<any>(null);

  const [accountId,    setAccountId]    = useState("");
  const [bankId,       setBankId]       = useState("");
  const [amount,       setAmount]       = useState("");
  const [date,         setDate]         = useState(today);
  const [narration,    setNarration]    = useState("");
  const [selName,      setSelName]      = useState("");
  const [selPhone,     setSelPhone]     = useState("");
  const [company,      setCompany]      = useState<any>(null);
  const [saving,       setSaving]       = useState(false);

  const h = (json = false): Record<string, string> => ({
    "x-user-role":  user?.role      || "",
    "x-user-id":    user?.id        || "",
    "x-company-id": user?.companyId || "",
    ...(json ? { "Content-Type": "application/json" } : {}),
  });

  useEffect(() => {
    loadAll();
    fetch("/api/me/company", { headers: h() }).then(r => r.ok ? r.json() : null).then(d => d && setCompany(d)).catch(() => {});
  }, []);

  async function loadAll() {
    const [vRes, aRes, bRes] = await Promise.all([
      fetch("/api/crv",           { headers: h() }),
      fetch("/api/accounts",      { headers: h() }),
      fetch("/api/bank-accounts", { headers: h() }),
    ]);
    const [vData, aData, bData] = await Promise.all([vRes.json(), aRes.json(), bRes.json()]);
    if (Array.isArray(vData)) setVouchers(vData);
    if (Array.isArray(aData)) setCustomers(aData.filter((a: Account) => a.partyType === "CUSTOMER"));
    if (Array.isArray(bData)) setBankAccounts(bData.map((b: any) => ({ id: `BANK-${b.id}`, rawId: b.id, name: b.accountName || `${b.bankName} - ${b.accountNo}` })));
  }

  async function saveCRV() {
    if (!accountId) { toast.error("Customer select karein"); return; }
    const n = Number(amount);
    if (!n || n <= 0) { toast.error("Valid amount enter karein"); return; }
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const rawBankId = bankAccounts.find(b => b.id === bankId)?.rawId || null;
      const body: any = { accountId, bankAccountId: rawBankId || null, paymentMode: bankId ? "BANK" : "CASH", amount, date, narration };
      if (editing) body.id = editing.id;
      const res  = await fetch("/api/crv", { method, headers: h(true), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error || "Save failed"); return; }
      setSaved(data);
      toast.success(editing ? "CRV updated!" : "CRV saved!");
      resetForm();
      setEditing(null);
      await loadAll();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  function resetForm() {
    setAccountId(""); setBankId(""); setAmount(""); setNarration(""); setSelName(""); setSelPhone(""); setDate(today);
  }

  function startEdit(v: Voucher) {
    setEditing(v); setAccountId(v.accountId); setBankId(v.paymentAccountId || "");
    setAmount(v.amount.toString()); setDate(v.date.slice(0,10)); setNarration(v.narration);
    setShowList(false); setSaved(null);
  }

  async function deleteVoucher(id: string) {
    if (!await confirmToast("Delete this CRV?")) return;
    const res = await fetch(`/api/crv?id=${id}`, { method: "DELETE", headers: h() });
    if (res.ok) { toast.success("Deleted!"); await loadAll(); } else toast.error("Delete failed");
  }

  const panel: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, fontFamily: ff };
  const inp:   React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: ff, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const lbl:   React.CSSProperties = { fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <>
      <style>{`
        @media print { body * { visibility:hidden!important; } .print-area,.print-area * { visibility:visible!important; } .print-area { position:fixed; inset:0; } @page { margin:8mm 10mm; } }
        @media screen { .print-area { display:none; } }
      `}</style>

      <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1000 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: accent }}>Cash Receipt Voucher (CRV)</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>Record payments received from customers</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowList(v => !v)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 18px", fontFamily: ff, fontSize: 13, color: "var(--text-muted)", cursor: "pointer" }}>
              {showList ? "Hide List" : "View List"}
            </button>
            <button onClick={() => { resetForm(); setEditing(null); setSaved(null); }} style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontFamily: ff, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              + New CRV
            </button>
          </div>
        </div>

        {/* List */}
        {showList && (
          <div style={{ ...panel, padding: 0, overflow: "hidden", marginBottom: 24 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Voucher No","Date","Received From","Amount","Mode","Narration","Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, textAlign: h === "Amount" ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vouchers.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No CRVs found</td></tr>
                ) : vouchers.map((v, idx) => (
                  <tr key={v.id} style={{ borderBottom: idx < vouchers.length - 1 ? "1px solid var(--border)" : "none" }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.03)"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: accent, fontSize: 13 }}>{v.voucherNo}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)" }}>{v.date?.slice(0,10)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>{v.accountName}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, textAlign: "right" }}>{fmt(v.amount)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>{v.paymentMode}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>{v.narration}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "var(--text-muted)", cursor: "pointer", fontFamily: ff }} onClick={() => startEdit(v)}>Edit</button>
                        <button style={{ background: "transparent", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "#f87171", cursor: "pointer", fontFamily: ff }} onClick={() => deleteVoucher(v.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Form */}
        {!saved && (
          <div style={panel}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: accent }}>{editing ? "Edit CRV" : "New CRV"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Received From (Customer) *</label>
                <select style={inp} value={accountId} onChange={e => {
                  setAccountId(e.target.value);
                  const acc = customers.find(a => a.id === e.target.value);
                  setSelName(acc?.name || ""); setSelPhone(acc?.phone || "");
                }}>
                  <option value="">— Select Customer —</option>
                  {customers.map(a => <option key={a.id} value={a.id}>{a.name}{a.phone ? ` (${a.phone})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Payment Method</label>
                <select style={inp} value={bankId} onChange={e => setBankId(e.target.value)}>
                  <option value="">Cash</option>
                  {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Amount *</label>
                <input type="number" style={inp} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" />
              </div>
              <div>
                <label style={lbl}>Date *</label>
                <input type="date" style={inp} value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Narration</label>
              <textarea style={{ ...inp, height: 72, resize: "vertical" }} value={narration} onChange={e => setNarration(e.target.value)} placeholder="Receipt description…" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveCRV} disabled={saving} style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : editing ? "Update CRV" : "Save CRV"}
              </button>
              {editing && (
                <button onClick={() => { resetForm(); setEditing(null); }} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 20px", fontFamily: ff, fontSize: 14, color: "var(--text-muted)", cursor: "pointer" }}>Cancel</button>
              )}
            </div>
          </div>
        )}

        {/* After Save */}
        {saved && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ ...panel, display: "flex", gap: 10 }}>
              <button onClick={() => window.print()} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Print Voucher</button>
              {selPhone && (
                <button onClick={() => {
                  const ph = selPhone.replace(/\D/g,""); const fp = ph.startsWith("0") ? "92"+ph.slice(1) : ph;
                  const msg = `*CRV - RECEIPT ADVICE*\nVoucher No: ${saved.voucherNo}\nReceived From: ${selName}\nAmount: ${fmt(Number(amount))}/-\nDate: ${date}\nNarration: ${narration||"N/A"}`;
                  window.open(`https://wa.me/${fp}?text=${encodeURIComponent(msg)}`,"_blank");
                }} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>WhatsApp</button>
              )}
              <button onClick={() => { setSaved(null); resetForm(); }} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 20px", fontFamily: ff, fontSize: 14, color: "var(--text-muted)", cursor: "pointer" }}>New CRV</button>
            </div>
            <div style={{ ...panel, background: "#fff", color: "#111", padding: 40 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #111", paddingBottom: 16, marginBottom: 28 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 900 }}>{company?.name || "COMPANY NAME"}</div>
                  <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginTop: 3 }}>{company?.country || ""} Operations</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, textDecoration: "underline", marginBottom: 6 }}>Receipt Voucher</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>No: {saved.voucherNo}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Date: {date}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 32 }}>
                {[["Received From", selName || saved.accountName], ["Amount", `${company?.baseCurrency || "PKR"} ${fmt(Number(amount))}/-`], ["Description", narration || "Payment received."]].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", gap: 16, borderBottom: "1px solid #e0e0e0", paddingBottom: 10, alignItems: "flex-end" }}>
                    <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", width: 140, flexShrink: 0 }}>{l}:</span>
                    <span style={{ fontSize: l === "Amount" ? 20 : 16, fontWeight: 700, flex: 1, borderBottom: "2px solid #111", paddingBottom: 2, paddingLeft: 4 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 40 }}>
                <div style={{ background: "#f5f5f5", border: "3px solid #111", padding: "12px 20px", minWidth: 180 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", borderBottom: "1px solid #111", marginBottom: 6 }}>Net Amount Received</div>
                  <div style={{ fontSize: 26, fontWeight: 900 }}>{fmt(Number(amount))}</div>
                </div>
                <div style={{ display: "flex", gap: 48 }}>
                  {["Payer Sign","Accountant"].map(l => (
                    <div key={l} style={{ borderTop: "2px solid #111", paddingTop: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase", textAlign: "center", width: 110 }}>{l}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {saved && (
        <div className="print-area" style={{ fontFamily: "'Outfit','Arial',sans-serif", color: "#000", background: "#fff", padding: "8mm 10mm", fontSize: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "3px solid #000", paddingBottom: 12, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{company?.name || "COMPANY NAME"}</div>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, textTransform: "uppercase" }}>{company?.country || ""} Operations</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 17, fontWeight: 900, textDecoration: "underline" }}>RECEIPT VOUCHER</div>
              <div style={{ fontWeight: 700 }}>No: {saved.voucherNo}</div>
              <div style={{ fontWeight: 700 }}>Date: {date}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
            {[["Received From", selName || saved.accountName], [`Amount (${company?.baseCurrency||"PKR"})`, `${fmt(Number(amount))}/-`], ["Description", narration || "Payment received."]].map(([l,v]) => (
              <div key={l} style={{ display: "flex", gap: 12, borderBottom: "1px solid #ddd", paddingBottom: 8, alignItems: "flex-end" }}>
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", width: 120, flexShrink: 0 }}>{l}:</span>
                <span style={{ fontWeight: 700, flex: 1, borderBottom: "1.5px solid #111", paddingLeft: 4 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 36 }}>
            <div style={{ background: "#f0f0f0", border: "2px solid #000", padding: "10px 16px" }}>
              <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", borderBottom: "1px solid #000", marginBottom: 4 }}>Net Amount Received</div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{fmt(Number(amount))}</div>
            </div>
            <div style={{ display: "flex", gap: 40 }}>
              {["Payer Sign","Accountant"].map(l => (
                <div key={l} style={{ borderTop: "2px solid #000", paddingTop: 4, fontSize: 9, fontWeight: 700, textTransform: "uppercase", textAlign: "center", width: 100 }}>{l}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
