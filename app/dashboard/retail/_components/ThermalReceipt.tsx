"use client";

export type ReceiptData = {
  receiptNo: string;
  fbrInvoice: string;
  soldAt: string;
  items: { id: string; name: string; price: number; qty: number; category: string; sku: string }[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmt: number;
  rounding: number;
  total: number;
  totalQty: number;
  payMethod: string;
  tendered: number;
  change: number;
  cashierName: string;
  loyaltyEarned: number;
  loyaltyRedeemed: number;
  loyaltyTotal: number;
};

export type CompanyInfo = {
  name: string;
  address?: string;
  phone?: string;
  ntn?: string;
};

export function generateFBRInvoice(receiptNo: string, date: Date): string {
  const yr = String(date.getFullYear()).slice(2);
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const dy = String(date.getDate()).padStart(2, "0");
  const hash = receiptNo.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const c1 = A[hash % 26];
  const c2 = A[(hash * 7) % 26];
  const seq = receiptNo.replace(/[^0-9]/g, "").padStart(8, "0");
  return `${yr}${mo}${dy}${c1}${c2}3S${seq}`;
}

function Divider({ dashed = true }: { dashed?: boolean }) {
  return <div style={{ borderTop: dashed ? "1px dashed #999" : "2px solid #000", margin: "8px 0" }} />;
}

function Row({ label, value, bold, large }: { label: string; value: string | number; bold?: boolean; large?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: large ? 14 : 11, fontWeight: bold ? 800 : 400, marginBottom: 2 }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

function SimpleBarcode({ value }: { value: string }) {
  let s = value.split("").reduce((a, c) => a + c.charCodeAt(0), 1);
  const bars: number[] = [];
  for (let i = 0; i < 90; i++) {
    s = Math.abs((s * 1664525 + 1013904223) & 0x7fffffff);
    bars.push(1 + (s % 3));
  }
  const totalW = bars.reduce((a, b) => a + b, 0);
  let x = 0;
  return (
    <svg width="100%" height="50" viewBox={`0 0 ${totalW} 50`} style={{ display: "block", marginTop: 6 }} preserveAspectRatio="none">
      {bars.map((w, i) => {
        const rx = x; x += w;
        return i % 2 === 0 ? <rect key={i} x={rx} y={0} width={w} height={50} fill="#000" /> : null;
      })}
    </svg>
  );
}

export function ThermalReceipt({ receipt, company }: { receipt: ReceiptData; company: CompanyInfo }) {
  const taxable = receipt.subtotal - receipt.discount;
  const mrpAmt = Math.max(0, taxable - receipt.taxAmt);
  const nonMrpAmt = receipt.taxAmt > 0 ? taxable : 0;
  const dt = new Date(receipt.soldAt);
  const dateStr = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  // Strip any "POS-000" style prefix — show just the numeric part e.g. "3"
  const txNo = receipt.receiptNo.replace(/^[A-Za-z]+-0*/g, "") || receipt.receiptNo;

  return (
    <div style={{ width: 300, fontFamily: "'Courier New',Courier,monospace", fontSize: 11, color: "#000", background: "#fff", padding: "14px 12px", lineHeight: 1.5 }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: ".04em" }}>{company.name.toUpperCase()}</div>
        {company.address && <div style={{ fontSize: 10 }}>{company.address}</div>}
        {company.phone && <div style={{ fontSize: 10 }}>Ph: {company.phone}</div>}
      </div>

      <Divider />

      {/* FBR Info */}
      <Row label="FBR Invoice #:" value={receipt.fbrInvoice} />
      {company.ntn && <Row label="NTN #" value={company.ntn} />}
      <Row label="Transaction No.:" value={txNo} />
      <Row label="Transaction Date:" value={`${dateStr} ${timeStr}`} />
      <Row label="Cashier:" value={receipt.cashierName} />
      <Row label="POS:" value="FSD-POS-SAL-01" />

      <Divider />
      <div style={{ textAlign: "center", fontWeight: 800, fontSize: 12, marginBottom: 4 }}>Original Receipt</div>
      <Divider />

      {/* Column Headers */}
      <div style={{ display: "flex", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
        <span style={{ flex: 1 }}>Product Description</span>
        <span style={{ width: 30, textAlign: "right" }}>Qty</span>
        <span style={{ width: 50, textAlign: "right" }}>Price</span>
        <span style={{ width: 30, textAlign: "right" }}>Disc</span>
        <span style={{ width: 52, textAlign: "right" }}>Total</span>
      </div>
      <Divider dashed />

      {/* Items */}
      {receipt.items.map((item, idx) => (
        <div key={item.id || idx} style={{ marginBottom: 5 }}>
          <div style={{ fontWeight: 700, fontSize: 11 }}>{item.name}</div>
          <div style={{ display: "flex", fontSize: 10, color: "#333" }}>
            <span style={{ flex: 1 }} />
            <span style={{ width: 30, textAlign: "right" }}>{item.qty}.00</span>
            <span style={{ width: 50, textAlign: "right" }}>{item.price.toLocaleString()}</span>
            <span style={{ width: 30, textAlign: "right" }}>0.00</span>
            <span style={{ width: 52, textAlign: "right", fontWeight: 700 }}>Rs{(item.qty * item.price).toLocaleString()}</span>
          </div>
        </div>
      ))}

      <Divider />

      {/* Totals */}
      <Row label="Total Items/Qty:" value={`${receipt.items.length}/${receipt.totalQty}`} />
      {receipt.discount > 0 && <Row label="Discount:" value={`Rs${receipt.discount.toLocaleString()}`} />}
      <Row label="Rounding:" value={`Rs${receipt.rounding.toFixed(2)}`} />
      <div style={{ borderTop: "2px solid #000", marginTop: 4, paddingTop: 4 }}>
        <Row label="Invoice Value:" value={`Rs${Math.round(receipt.total).toLocaleString()}`} bold large />
      </div>

      <Divider />

      {/* Tax Breakup */}
      <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 4 }}>Sale Tax Breakup</div>
      <div style={{ display: "flex", fontSize: 10, fontWeight: 700, marginBottom: 3 }}>
        <span style={{ width: 40 }} />
        <span style={{ flex: 1, textAlign: "right" }}>Amt</span>
        <span style={{ width: 55, textAlign: "right" }}>Tax Rate</span>
        <span style={{ width: 55, textAlign: "right" }}>Inl. Amt</span>
      </div>
      <div style={{ display: "flex", fontSize: 10 }}>
        <span style={{ width: 40 }}>MRP</span>
        <span style={{ flex: 1, textAlign: "right" }}>Rs{mrpAmt.toLocaleString()}</span>
        <span style={{ width: 55, textAlign: "right" }}>0%</span>
        <span style={{ width: 55, textAlign: "right" }}>Rs{mrpAmt.toLocaleString()}</span>
      </div>
      {receipt.taxAmt > 0 && (
        <div style={{ display: "flex", fontSize: 10 }}>
          <span style={{ width: 40 }}>NON MRP</span>
          <span style={{ flex: 1, textAlign: "right" }}>Rs{nonMrpAmt.toLocaleString()}</span>
          <span style={{ width: 55, textAlign: "right" }}>{receipt.taxRate}%</span>
          <span style={{ width: 55, textAlign: "right" }}>Rs{receipt.taxAmt.toLocaleString()}</span>
        </div>
      )}

      <Divider />

      {/* Payments */}
      <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 4 }}>Payments</div>
      <Row label={receipt.payMethod.toUpperCase()} value={`Rs${Math.round(receipt.total).toLocaleString()}`} bold />
      {receipt.payMethod === "cash" && receipt.tendered > 0 && (
        <Row label="Change Due" value={`Rs${receipt.change.toLocaleString()}`} />
      )}

      <Divider />

      {/* Loyalty — only when a loyalty customer was attached to the sale */}
      {(receipt.loyaltyEarned > 0 || (receipt.loyaltyRedeemed ?? 0) > 0 || receipt.loyaltyTotal > 0) && (
        <>
          <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 4 }}>Loyalty Information</div>
          <Row label="Points Earned:" value={receipt.loyaltyEarned.toFixed(2)} />
          <Row label="Redeemed Points:" value={(receipt.loyaltyRedeemed ?? 0).toFixed(2)} />
          <Row label="Available Points:" value={(receipt.loyaltyTotal - (receipt.loyaltyRedeemed ?? 0)).toFixed(2)} />
          <Divider />
        </>
      )}

      {/* Barcode */}
      <SimpleBarcode value={receipt.fbrInvoice} />
      <div style={{ textAlign: "center", fontSize: 10, marginTop: 2, letterSpacing: ".1em" }}>{receipt.fbrInvoice}</div>

      <Divider />

      {/* Footer */}
      <div style={{ textAlign: "center", fontSize: 10, color: "#444", lineHeight: 1.6 }}>
        <div>For return &amp; exchange policy details,</div>
        <div>visit: www.finovaos.app/return-policies</div>
        <div style={{ marginTop: 4, color: "#999" }}>Powered by FinovaOS</div>
      </div>
    </div>
  );
}
