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
  customerEmail?: string;
  items: Array<{ name: string; qty: number; rate: number; amount: number; unit?: string }>;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  /** Defaults to the full total when the status is PAID. */
  amountPaid?: number;
  currency: string;
  notes?: string;
  terms?: string;
  status?: string;
}

type RGB = [number, number, number];

const INK: RGB = [15, 23, 42];
const INK_SOFT: RGB = [51, 65, 85];
const INDIGO: RGB = [79, 70, 229];
const INDIGO_PALE: RGB = [199, 210, 254];
const MUTED: RGB = [100, 116, 139];
const FAINT: RGB = [148, 163, 184];
const BORDER: RGB = [226, 232, 240];
const PANEL: RGB = [248, 250, 252];
const WHITE: RGB = [255, 255, 255];
const EMERALD: RGB = [5, 150, 105];
const AMBER: RGB = [217, 119, 6];
const RED: RGB = [220, 38, 38];

function fmtNum(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmt(n: number, currency = "USD"): string {
  return `${currency} ${fmtNum(n)}`;
}

function statusMeta(status?: string): { label: string; color: RGB } | null {
  if (!status || !status.trim()) return null;
  const s = status.toUpperCase();
  if (s === "PAID") return { label: "PAID", color: EMERALD };
  if (s === "REFUNDED") return { label: "REFUNDED", color: MUTED };
  if (s === "PARTIALLY_REFUNDED") return { label: "PART. REFUNDED", color: MUTED };
  if (s === "OVERDUE") return { label: "OVERDUE", color: RED };
  if (s === "OPEN" || s === "UNPAID" || s === "DUE") return { label: "DUE", color: AMBER };
  return { label: s.replace(/_/g, " "), color: MUTED };
}

/** Two-letter monogram for the logo mark. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "*";
  return (parts[0][0] + (parts.length > 1 ? parts[1][0] : "")).toUpperCase();
}

/** Generate an invoice PDF as a Node.js Buffer. */
export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageW - margin * 2;
  const right = pageW - margin;

  // ── Masthead ─────────────────────────────────────────────────────────────────
  // Measure the issuer strap-line first: the band grows a line when it wraps,
  // so the dark area always closes tight under the last line of text.
  const issuerMeta = [data.companyAddress, data.companyPhone, data.companyEmail]
    .filter((v): v is string => Boolean(v && v.trim()))
    .join("   ·   ");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const issuerLines: string[] = issuerMeta
    ? doc.splitTextToSize(issuerMeta, contentW - 62).slice(0, 2)
    : [];

  const bandH = 30 + issuerLines.length * 4;
  doc.setFillColor(...INK);
  doc.rect(0, 0, pageW, bandH, "F");
  doc.setFillColor(...INDIGO);
  doc.rect(0, bandH, pageW, 1.6, "F");

  // Logo monogram
  doc.setFillColor(...INDIGO);
  doc.roundedRect(margin, 9, 12, 12, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...WHITE);
  doc.text(initials(data.companyName), margin + 6, 16.6, { align: "center" });

  // Issuer
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...WHITE);
  doc.text(data.companyName, margin + 16.5, 17);

  if (issuerLines.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...FAINT);
    doc.text(issuerLines, margin + 16.5, 23.5);
  }

  // Wordmark
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.setTextColor(...WHITE);
  doc.text("INVOICE", right, 18, { align: "right", charSpace: 1.4 });
  doc.setFontSize(9);
  doc.setTextColor(...INDIGO_PALE);
  doc.text(data.invoiceNumber, right, 25.5, { align: "right", charSpace: 0.3 });

  // ── Bill-to / invoice details ────────────────────────────────────────────────
  const metaTop = bandH + 14;

  // Details card (right)
  const cardW = 78;
  const cardX = right - cardW;
  const cardPad = 5.5;
  const status = statusMeta(data.status);
  const detailRows: Array<[string, string]> = [
    ["Invoice No", data.invoiceNumber],
    ["Invoice Date", data.invoiceDate],
  ];
  if (data.dueDate && data.dueDate.trim()) detailRows.push(["Due Date", data.dueDate]);

  // Height tracks the real ink: rows are 6.4 apart, and the status pill hangs
  // 2.6 below the baseline it is anchored to.
  const cardTop = metaTop - 5;
  const firstRowY = metaTop + 4;
  const cardH = status
    ? detailRows.length * 6.4 + (firstRowY - cardTop) + 2.6 + cardPad
    : (detailRows.length - 1) * 6.4 + (firstRowY - cardTop) + 1.5 + cardPad;

  doc.setFillColor(...PANEL);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.roundedRect(cardX, cardTop, cardW, cardH, 2.5, 2.5, "FD");

  let rowY = firstRowY;
  for (const [label, value] of detailRows) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), cardX + cardPad, rowY, { charSpace: 0.35 });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(value, cardX + cardW - cardPad, rowY, { align: "right" });
    rowY += 6.4;
  }

  if (status) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    const pillW = doc.getTextWidth(status.label) + 9;
    const pillX = cardX + cardW - cardPad - pillW;
    doc.setFillColor(...status.color);
    doc.roundedRect(pillX, rowY - 4, pillW, 6.6, 3.3, 3.3, "F");
    doc.setTextColor(...WHITE);
    doc.text(status.label, pillX + pillW / 2, rowY + 0.3, { align: "center", charSpace: 0.4 });
  }

  // Bill to (left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(...MUTED);
  doc.text("BILLED TO", margin, metaTop, { charSpace: 0.5 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...INK);
  doc.text(data.customerName, margin, metaTop + 7.5);

  let billY = metaTop + 13.5;
  const billW = contentW - cardW - 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  for (const line of [data.customerAddress, data.customerPhone, data.customerEmail]) {
    if (!line || !line.trim()) continue;
    const wrapped = doc.splitTextToSize(line, billW);
    doc.text(wrapped, margin, billY);
    billY += wrapped.length * 4.6;
  }

  let y = Math.max(billY + 4, cardTop + cardH + 10);

  // ── Line items ───────────────────────────────────────────────────────────────
  const hasUnit = data.items.some((item) => Boolean(item.unit && item.unit.trim()));
  const head = ["#", "DESCRIPTION", "QTY", ...(hasUnit ? ["UNIT"] : []), "RATE", "AMOUNT"];
  const body = data.items.map((item, i) => [
    String(i + 1).padStart(2, "0"),
    item.name,
    String(item.qty),
    ...(hasUnit ? [item.unit || "—"] : []),
    fmtNum(item.rate),
    fmtNum(item.amount),
  ]);

  const amountCol = hasUnit ? 5 : 4;
  const rateCol = amountCol - 1;
  const columnStyles: Record<number, Record<string, unknown>> = {
    // Narrow column: trim the side padding so the two-digit index cannot wrap.
    0: { cellWidth: 12, halign: "center", textColor: FAINT, cellPadding: { top: 4, right: 1.5, bottom: 4, left: 1.5 } },
    1: { cellWidth: "auto", fontStyle: "bold", textColor: INK },
    2: { cellWidth: 16, halign: "center" },
  };
  if (hasUnit) columnStyles[3] = { cellWidth: 18, halign: "center" };
  columnStyles[rateCol] = { cellWidth: 26, halign: "right" };
  columnStyles[amountCol] = { cellWidth: 30, halign: "right", fontStyle: "bold", textColor: INK };

  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    margin: { left: margin, right: margin, top: 22 },
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
      textColor: INK_SOFT,
      valign: "middle",
      lineWidth: 0,
    },
    headStyles: {
      fillColor: INK,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 7.2,
      cellPadding: { top: 3.6, right: 4, bottom: 3.6, left: 4 },
    },
    columnStyles,
    didParseCell: (hook) => {
      if (hook.section !== "head") return;
      const i = hook.column.index;
      hook.cell.styles.halign = i === rateCol || i === amountCol ? "right" : i === 1 ? "left" : "center";
    },
    // Hairline row separators only — no boxed grid, no zebra stripes.
    didDrawCell: (hook) => {
      if (hook.section !== "body") return;
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      const lineY = hook.cell.y + hook.cell.height;
      doc.line(hook.cell.x, lineY, hook.cell.x + hook.cell.width, lineY);
    },
  });

  y = (doc as any).lastAutoTable.finalY + 9;

  // ── Summary + notes ──────────────────────────────────────────────────────────
  const sumW = 78;
  const sumX = right - sumW;
  const noteW = contentW - sumW - 10;

  const summaryRows: Array<[string, string]> = [["Subtotal", fmt(data.subtotal, data.currency)]];
  if (data.discount && data.discount > 0) summaryRows.push(["Discount", `- ${fmt(data.discount, data.currency)}`]);
  if (data.tax && data.tax > 0) summaryRows.push(["Tax", fmt(data.tax, data.currency)]);

  const paid = data.amountPaid ?? (String(data.status).toUpperCase() === "PAID" ? data.total : 0);
  const balance = Math.max(0, data.total - paid);
  const showSettlement = paid > 0;

  const summaryH = summaryRows.length * 6.2 + 4 + 11 + (showSettlement ? 12 : 0);

  const noteBlocks: Array<{ label: string; lines: string[] }> = [];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const noteSources: Array<[string, string | undefined]> = [
    ["NOTES", data.notes],
    ["PAYMENT TERMS", data.terms],
  ];
  for (const [label, text] of noteSources) {
    if (!text || !text.trim()) continue;
    noteBlocks.push({ label, lines: doc.splitTextToSize(text.trim(), noteW - 11) });
  }
  const notesH = noteBlocks.length
    ? noteBlocks.reduce((h, b) => h + 5 + b.lines.length * 4.6 + 4, 0) + 5
    : 0;

  if (y + Math.max(summaryH, notesH) > pageH - 26) {
    doc.addPage();
    y = 22;
  }

  // Notes panel (left)
  if (notesH) {
    doc.setFillColor(...PANEL);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, y, noteW, notesH, 2.5, 2.5, "FD");
    doc.setFillColor(...INDIGO);
    doc.rect(margin, y + 2, 1.4, notesH - 4, "F");

    let noteY = y + 8;
    for (const block of noteBlocks) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(...MUTED);
      doc.text(block.label, margin + 6, noteY, { charSpace: 0.5 });
      noteY += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...INK_SOFT);
      doc.text(block.lines, margin + 6, noteY);
      noteY += block.lines.length * 4.6 + 4;
    }
  }

  // Summary (right)
  let sumY = y + 4;
  for (const [label, value] of summaryRows) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.8);
    doc.setTextColor(...MUTED);
    doc.text(label, sumX, sumY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(value, right, sumY, { align: "right" });
    sumY += 6.2;
  }

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(sumX, sumY - 2, right, sumY - 2);

  doc.setFillColor(...INDIGO);
  doc.roundedRect(sumX, sumY, sumW, 11, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.text("TOTAL", sumX + 5, sumY + 7, { charSpace: 0.5 });
  doc.setFontSize(10);
  doc.text(fmt(data.total, data.currency), right - 5, sumY + 7.2, { align: "right" });
  sumY += 11;

  if (showSettlement) {
    sumY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text("Amount Paid", sumX, sumY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...EMERALD);
    doc.text(fmt(paid, data.currency), right, sumY, { align: "right" });
    sumY += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text("Balance Due", sumX, sumY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(fmt(balance, data.currency), right, sumY, { align: "right" });
  }

  y = Math.max(sumY, y + notesH) + 14;

  // ── Sign-off ─────────────────────────────────────────────────────────────────
  if (y < pageH - 24) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("Thank you for your business.", pageW / 2, y, { align: "center" });
  }

  // ── Footer on every page ─────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  const footerY = pageH - 12;
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.25);
    doc.line(margin, footerY - 5, right, footerY - 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...FAINT);
    const footLeft = [data.companyName, data.companyEmail].filter(Boolean).join("  ·  ");
    doc.text(footLeft, margin, footerY);
    doc.text(`Invoice ${data.invoiceNumber}`, pageW / 2, footerY, { align: "center" });
    doc.text(`Page ${p} of ${pageCount}`, right, footerY, { align: "right" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}
