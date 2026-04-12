"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

// ─── Design tokens ────────────────────────────────────────────────────────────
const ff     = "'Outfit','Inter',sans-serif";
const accent = "#22c55e";

type Voucher = {
  id: string; voucherNo: string; date: string;
  narration: string; accountName: string; accountId: string;
  amount: number; paymentMode: string; paymentAccountId: string;
};

function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function CRVPage() {
  const user    = getCurrentUser();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [company,  setCompany]  = useState<any>(null);

  const h = (): Record<string, string> => ({
    "x-user-role":  user?.role      || "",
    "x-user-id":    user?.id        || "",
    "x-company-id": user?.companyId || "",
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/crv", { headers: h() }).then(r => r.json()),
      fetch("/api/me/company", { headers: h() }).then(r => r.ok ? r.json() : null),
    ]).then(([vData, co]) => {
      if (Array.isArray(vData)) setVouchers(vData);
      if (co) setCompany(co);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function printCRV(v: Voucher) {
    const w = window.open("", "_blank");
    if (!w) return;
    const co  = company?.name || "COMPANY NAME";
    const cur = company?.baseCurrency || "PKR";
    w.document.open(); w.document.close();
    w.document.documentElement.innerHTML = `
      <html><head><title>CRV - ${v.voucherNo}</title>
      <style>
        body{font-family:'Arial',sans-serif;padding:30px;max-width:580px;margin:0 auto;color:#111}
        .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #111;padding-bottom:14px;margin-bottom:24px}
        .co{font-size:22px;font-weight:900}.sub{font-size:10px;color:#555;text-transform:uppercase;letter-spacing:2px}
        .rh{font-size:16px;font-weight:900;text-decoration:underline;text-align:right}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th{background:#f3f4f6;border:1px solid #999;padding:8px 10px;font-size:11px;text-transform:uppercase}
        td{border:1px solid #ccc;padding:8px 10px;font-size:13px}
        .dr{color:#1d4ed8;font-weight:700}.cr{color:#dc2626;font-weight:700}
        .narr{margin-top:16px;padding:12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:12px}
        .sigs{display:flex;justify-content:space-between;margin-top:48px;padding:0 10px}
        .sig{border-top:2px solid #111;padding-top:4px;font-size:9px;font-weight:700;text-transform:uppercase;text-align:center;width:110px}
        .footer{margin-top:24px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:8px}
        @media print{body{padding:8mm 10mm}}
      </style></head><body>
      <div class="hdr">
        <div><div class="co">${co}</div><div class="sub">Internal Voucher — Accounting Copy</div></div>
        <div>
          <div class="rh">CASH RECEIPT VOUCHER</div>
          <div style="font-size:12px;font-weight:700;text-align:right">CRV No: ${v.voucherNo}</div>
          <div style="font-size:12px;font-weight:700;text-align:right">Date: ${v.date.slice(0,10)}</div>
        </div>
      </div>
      <table>
        <thead><tr><th style="text-align:left">Account</th><th>Dr / Cr</th><th style="text-align:right">Amount (${cur})</th></tr></thead>
        <tbody>
          <tr><td>Cash / Bank Account</td><td style="text-align:center" class="dr">Dr</td><td style="text-align:right" class="dr">${fmt(v.amount)}</td></tr>
          <tr><td>${v.accountName} (Customer)</td><td style="text-align:center" class="cr">Cr</td><td style="text-align:right" class="cr">${fmt(v.amount)}</td></tr>
        </tbody>
        <tfoot><tr><td colspan="2" style="text-align:right;font-weight:700;border-top:2px solid #111">Total</td><td style="text-align:right;font-weight:700;border-top:2px solid #111">${fmt(v.amount)}</td></tr></tfoot>
      </table>
      <div class="narr"><strong>Narration:</strong> ${v.narration || `Payment received from ${v.accountName}`}</div>
      <div class="sigs"><div class="sig">Prepared By</div><div class="sig">Reviewed By</div><div class="sig">Approved By</div></div>
      <div class="footer">Auto-generated CRV — Powered by FinovaOS — ${new Date().toLocaleString()}</div>
      <script>window.print();</script></body></html>`;
  }

  const panel: React.CSSProperties = { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, fontFamily: ff };

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: accent }}>CRV Vouchers</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>Cash Receipt Vouchers — auto-generated from Payment Receipts</p>
        </div>
        <a href="/dashboard/payment-receipts"
          style={{ background: accent, color: "#fff", borderRadius: 8, padding: "9px 20px", fontFamily: ff, fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none" }}>
          + New Receipt → Go to Payment Receipts
        </a>
      </div>

      {/* Info banner */}
      <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "11px 16px", marginBottom: 20, fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: accent, fontSize: 16 }}>ℹ</span>
        <span>CRV vouchers are automatically created when you record a payment in <strong style={{ color: "var(--text-primary)" }}>Payment Receipts</strong>. No manual entry needed here.</span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ ...panel, textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading…</div>
      ) : (
        <div style={{ ...panel, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["CRV No","Date","Received From","Amount","Mode","Narration","Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, textAlign: h === "Amount" ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vouchers.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                  No CRV vouchers yet. Record a payment in <a href="/dashboard/payment-receipts" style={{ color: accent }}>Payment Receipts</a> to auto-generate one.
                </td></tr>
              ) : vouchers.map((v, idx) => (
                <tr key={v.id} style={{ borderBottom: idx < vouchers.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: accent, fontSize: 13 }}>{v.voucherNo}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)" }}>{v.date?.slice(0,10)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>{v.accountName}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, textAlign: "right", color: accent }}>{fmt(v.amount)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>{v.paymentMode}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>{v.narration || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <button onClick={() => printCRV(v)}
                      style={{ background: "transparent", border: `1px solid ${accent}55`, borderRadius: 6, padding: "4px 14px", fontSize: 12, color: accent, cursor: "pointer", fontFamily: ff }}>
                      Print CRV
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
