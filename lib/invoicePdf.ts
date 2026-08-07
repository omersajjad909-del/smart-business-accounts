import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  items: Array<{ name: string; qty: number; rate: number; amount: number; unit?: string }>;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  currency: string;
  notes?: string;
  status?: string;
}

const PRIMARY_BLUE = "#4F46E5";
const PRIMARY_BLUE_RGB: [number, number, number] = [79, 70, 229];
const DARK_RGB: [number, number, number] = [15, 23, 42];
const MUTED_RGB: [number, number, number] = [100, 116, 139];
const LIGHT_GRAY_RGB: [number, number, number] = [241, 245, 249];
const WHITE_RGB: [number, number, number] = [255, 255, 255];

function fmt(n: number, currency = "USD"): string {
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Generate an invoice PDF as a Node.js Buffer. */
export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;

  // ── Header background ────────────────────────────────────────────────────────
  doc.setFillColor(...DARK_RGB);
  doc.rect(0, 0, pageW, 38, "F");

  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...WHITE_RGB);
  doc.text(data.companyName, margin, 17);

  // INVOICE badge (top-right)
  const badgeW = 30;
  const badgeX = pageW - margin - badgeW;
  doc.setFillColor(...PRIMARY_BLUE_RGB);
  doc.roundedRect(badgeX, 8, badgeW, 10, 2, 2, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE_RGB);
  doc.text("INVOICE", badgeX + badgeW / 2, 14.5, { align: "center" });

  // Company sub-info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // slate-300
  const companyMeta: string[] = [];
  if (data.companyAddress) companyMeta.push(data.companyAddress);
  if (data.companyPhone) companyMeta.push(data.companyPhone);
  if (data.companyEmail) companyMeta.push(data.companyEmail);
  if (companyMeta.length) {
    doc.text(companyMeta.join("  ·  "), margin, 26);
  }

  // ── Divider ──────────────────────────────────────────────────────────────────
  let y = 44;
  doc.setDrawColor(...PRIMARY_BLUE_RGB);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // ── Two-column: Invoice meta (left) / Customer info (right) ─────────────────
  const colMidX = pageW / 2 + 4;

  // Left column labels
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED_RGB);
  doc.text("INVOICE NO", margin, y);
  doc.text("INVOICE DATE", margin, y + 7);
  if (data.dueDate) doc.text("DUE DATE", margin, y + 14);

  // Left column values
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...DARK_RGB);
  doc.text(data.invoiceNumber, margin + 30, y);
  doc.text(data.invoiceDate, margin + 30, y + 7);
  if (data.dueDate) doc.text(data.dueDate, margin + 30, y + 14);

  // Status badge if PAID
  if (data.status === "PAID") {
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.roundedRect(margin, y + 18, 18, 7, 2, 2, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE_RGB);
    doc.text("PAID", margin + 9, y + 23, { align: "center" });
  }

  // Right column — customer info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED_RGB);
  doc.text("BILL TO", colMidX, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK_RGB);
  doc.text(data.customerName, colMidX, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED_RGB);
  let custY = y + 13;
  if (data.customerAddress) {
    const lines = doc.splitTextToSize(data.customerAddress, contentW / 2 - 4);
    doc.text(lines, colMidX, custY);
    custY += lines.length * 4.5;
  }
  if (data.customerPhone) {
    doc.text(data.customerPhone, colMidX, custY);
    custY += 5;
  }

  y += 32;

  // ── Horizontal rule ──────────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // ── Items table ──────────────────────────────────────────────────────────────
  const tableRows = data.items.map((item) => [
    item.name,
    String(item.qty),
    item.unit || "—",
    fmtNum(item.rate),
    fmtNum(item.amount),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Description", "Qty", "Unit", "Rate", "Amount"]],
    body: tableRows,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8.5,
      cellPadding: 4,
      textColor: DARK_RGB,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: DARK_RGB,
      textColor: WHITE_RGB,
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "center", cellWidth: 18 },
      2: { halign: "center", cellWidth: 22 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 30 },
    },
    alternateRowStyles: { fillColor: LIGHT_GRAY_RGB },
    didParseCell: (hookData) => {
      if (hookData.section === "head") {
        if (hookData.column.index >= 3) {
          hookData.cell.styles.halign = "right";
        }
      }
    },
  });

  // Move y past the table
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Totals block ─────────────────────────────────────────────────────────────
  const totalsX = pageW - margin - 75;
  const totalsW = 75;

  // Background pill
  doc.setFillColor(...LIGHT_GRAY_RGB);
  doc.roundedRect(totalsX, y, totalsW, data.tax || data.discount ? 34 : 22, 3, 3, "F");

  let totY = y + 7;

  if (data.discount && data.discount > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_RGB);
    doc.text("Subtotal", totalsX + 4, totY);
    doc.text(fmt(data.subtotal, data.currency), totalsX + totalsW - 4, totY, { align: "right" });
    totY += 6;

    doc.text("Discount", totalsX + 4, totY);
    doc.text(`- ${fmt(data.discount, data.currency)}`, totalsX + totalsW - 4, totY, { align: "right" });
    totY += 6;
  }

  if (data.tax && data.tax > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_RGB);
    if (!data.discount) {
      doc.text("Subtotal", totalsX + 4, totY);
      doc.text(fmt(data.subtotal, data.currency), totalsX + totalsW - 4, totY, { align: "right" });
      totY += 6;
    }
    doc.text("Tax", totalsX + 4, totY);
    doc.text(fmt(data.tax, data.currency), totalsX + totalsW - 4, totY, { align: "right" });
    totY += 6;
  }

  // Total row
  doc.setFillColor(...PRIMARY_BLUE_RGB);
  doc.roundedRect(totalsX, totY - 1, totalsW, 10, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...WHITE_RGB);
  doc.text("TOTAL", totalsX + 4, totY + 5.5);
  doc.text(fmt(data.total, data.currency), totalsX + totalsW - 4, totY + 5.5, { align: "right" });

  y = totY + 14;

  // ── Notes ────────────────────────────────────────────────────────────────────
  if (data.notes) {
    if (y > pageH - 40) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED_RGB);
    doc.text("NOTES", margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK_RGB);
    const noteLines = doc.splitTextToSize(data.notes, contentW);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5;
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const footerY = pageH - 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED_RGB);
  doc.text("Generated by FinovaOS", margin, footerY);
  doc.text(`Invoice ${data.invoiceNumber}`, pageW - margin, footerY, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY - 3, pageW - margin, footerY - 3);

  return Buffer.from(doc.output("arraybuffer"));
}
