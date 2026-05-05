import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { getCompanyCommsConfig } from "@/lib/companyCommsConfig";
import { fmtDate } from "@/lib/dateUtils";

// ─── Resend client (platform emails — welcome, OTP, billing) ─────────────────
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

// ─── SMTP config (company-specific emails — invoices, POs) ───────────────────
const getEmailConfig = async (companyId?: string) => {
  if (companyId) {
    const companyConfig = await getCompanyCommsConfig(companyId);
    if (companyConfig.email.enabled && companyConfig.email.user && companyConfig.email.pass) {
      return {
        host: companyConfig.email.host,
        port: companyConfig.email.port,
        secure: companyConfig.email.secure,
        auth: { user: companyConfig.email.user, pass: companyConfig.email.pass },
        from: companyConfig.email.from,
        fromName: companyConfig.email.fromName || "",
      };
    }
  }
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' },
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@finovaos.app',
    fromName: "",
  };
};

let transporter: nodemailer.Transporter | null = null;
let lastConfig: any = null;

const getTransporter = async (companyId?: string) => {
  const config = await getEmailConfig(companyId);
  if (!config.auth.user || !config.auth.pass) {
    console.warn('⚠️ Email not configured. Set SMTP_USER and SMTP_PASS in .env');
    return { transport: null, config };
  }
  const configStr = JSON.stringify(config);
  if (!transporter || lastConfig !== configStr) {
    transporter = nodemailer.createTransport(config);
    lastConfig = configStr;
  }
  return { transport: transporter, config };
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

function n(val: number | null | undefined): string {
  return (val ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Wraps email content in a consistent branded layout */
function emailBase({
  companyName,
  badgeText,
  badgeColor = "#6366f1",
  content,
  showAppFooter = true,
}: {
  companyName: string;
  badgeText: string;
  badgeColor?: string;
  content: string;
  showAppFooter?: boolean;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;color:#1e293b;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;padding:36px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 40px rgba(15,23,42,.10);">

  <!-- HEADER -->
  <tr>
    <td style="background:#0f172a;padding:26px 36px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="vertical-align:middle;">
            <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;line-height:1.2;">${companyName}</div>
          </td>
          <td align="right" style="vertical-align:middle;white-space:nowrap;padding-left:16px;">
            <span style="background:${badgeColor};color:#ffffff;padding:5px 14px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${badgeText}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td style="padding:36px 36px 28px;">
      ${content}
    </td>
  </tr>

  <!-- FOOTER -->
  ${showAppFooter ? `
  <tr>
    <td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0;text-align:center;">
      <div style="font-size:11px;color:#94a3b8;line-height:1.6;">
        Sent via <strong style="color:#6366f1;">FinovaOS</strong> &nbsp;·&nbsp; finovaos.app
      </div>
    </td>
  </tr>` : ""}

</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Renders a 2-column info grid (label / value pairs) */
function infoGrid(rows: [string, string | null | undefined][], cols = 2): string {
  const cells = rows.map(([label, value]) => `
    <td style="padding:10px 14px;background:#f8fafc;border-radius:8px;vertical-align:top;">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:3px;">${label}</div>
      <div style="font-size:13px;font-weight:600;color:#1e293b;">${value || "—"}</div>
    </td>
    <td style="width:8px;"></td>
  `);

  const tableRows: string[] = [];
  for (let i = 0; i < cells.length; i += cols) {
    const rowCells = cells.slice(i, i + cols);
    tableRows.push(`<tr>${rowCells.join("")}<td></td></tr><tr><td colspan="${cols * 2 + 1}" style="height:8px;"></td></tr>`);
  }

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;">${tableRows.join("")}</table>`;
}

/** Renders an items table with header + rows */
function itemsTable(
  items: any[],
  columns: Array<{ label: string; key: string | ((item: any) => string); align?: string }>,
): string {
  if (!items?.length) return "";

  const headers = columns
    .map(c => `<th style="padding:10px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);text-align:${c.align || 'left'};text-transform:uppercase;letter-spacing:0.6px;white-space:nowrap;">${c.label}</th>`)
    .join("");

  const rows = items
    .map((item, i) => {
      const cells = columns.map(c => {
        const val = typeof c.key === "function" ? c.key(item) : (item[c.key] ?? "—");
        return `<td style="padding:10px 12px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9;text-align:${c.align || 'left'};vertical-align:top;">${val}</td>`;
      }).join("");
      return `<tr style="background:${i % 2 === 0 ? '#f8fafc' : '#ffffff'};">${cells}</tr>`;
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin:20px 0;font-size:13px;">
      <thead>
        <tr style="background:#1e293b;">${headers}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/** Total row block (subtotal, discount, freight, total) */
function totalsBlock(subtotal: number, discount = 0, freight = 0, discountType = "flat"): string {
  const discAmt = discountType === "percent" ? (subtotal * discount) / 100 : discount;
  const total = subtotal - discAmt + freight;

  const rows: [string, string][] = [["Subtotal", n(subtotal)]];
  if (discAmt > 0) rows.push(["Discount", `-${n(discAmt)}`]);
  if (freight > 0) rows.push(["Freight / Charges", n(freight)]);

  const subRows = rows
    .map(([label, value]) => `
      <tr>
        <td style="padding:6px 0;font-size:12px;color:#64748b;">${label}</td>
        <td style="padding:6px 0;font-size:12px;color:#64748b;text-align:right;">${value}</td>
      </tr>`)
    .join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:4px;">
      ${subRows}
      <tr><td colspan="2" style="height:8px;border-top:1px solid #e2e8f0;padding-top:8px;"></td></tr>
      <tr>
        <td style="padding:8px 12px;background:#0f172a;border-radius:8px 0 0 8px;font-size:14px;font-weight:700;color:#ffffff;">Total Amount</td>
        <td style="padding:8px 14px;background:#6366f1;border-radius:0 8px 8px 0;font-size:15px;font-weight:800;color:#ffffff;text-align:right;">${n(total)}</td>
      </tr>
    </table>`;
}

/** Simple section heading */
function sectionHeading(text: string): string {
  return `<div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin:24px 0 10px;padding-bottom:6px;border-bottom:1px solid #e2e8f0;">${text}</div>`;
}

/** Big status/amount badge for payment-style emails */
function bigBadge(icon: string, label: string, value: string, color: string): string {
  return `
    <div style="text-align:center;padding:28px 20px;background:${color}10;border:2px solid ${color}30;border-radius:14px;margin:20px 0;">
      <div style="font-size:36px;">${icon}</div>
      <div style="font-size:13px;color:#64748b;margin-top:8px;">${label}</div>
      <div style="font-size:28px;font-weight:800;color:${color};margin-top:4px;">${value}</div>
    </div>`;
}

// ─── Email Templates ──────────────────────────────────────────────────────────

export const emailTemplates = {

  // ── OTP / Verification Code ────────────────────────────────────────────────
  otp: (user: { name: string; email: string }, code: string) =>
    emailBase({
      companyName: "FinovaOS",
      badgeText: "Security Code",
      badgeColor: "#6366f1",
      content: `
        <p style="margin:0 0 6px;font-size:15px;color:#64748b;">Hi <strong style="color:#1e293b;">${user.name}</strong>,</p>
        <p style="margin:0 0 28px;font-size:14px;color:#64748b;">Use the code below to verify your identity. It expires in <strong>15 minutes</strong>.</p>
        <div style="text-align:center;margin:28px 0;">
          <div style="display:inline-block;background:#f1f5f9;border:2px dashed #cbd5e1;border-radius:14px;padding:22px 40px;">
            <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Your One-Time Code</div>
            <div style="font-size:38px;font-weight:900;color:#0f172a;letter-spacing:12px;font-family:monospace;">${code}</div>
          </div>
        </div>
        <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;">If you did not request this code, you can safely ignore this email.</p>
      `,
    }),

  // ── Email Verification Link ────────────────────────────────────────────────
  verification: (user: { name: string; email: string }, link: string) =>
    emailBase({
      companyName: "FinovaOS",
      badgeText: "Verify Email",
      badgeColor: "#6366f1",
      content: `
        <p style="margin:0 0 6px;font-size:15px;color:#64748b;">Hi <strong style="color:#1e293b;">${user.name}</strong>,</p>
        <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Thanks for signing up! Click the button below to verify your email address and activate your account.</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${link}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.3px;">Verify My Email</a>
        </div>
        <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;text-align:center;">This link expires in 24 hours. If you did not create an account, ignore this email.</p>
        <p style="margin:8px 0 0;font-size:11px;color:#cbd5e1;text-align:center;word-break:break-all;">Or copy: ${link}</p>
      `,
    }),

  // ── Welcome Email ──────────────────────────────────────────────────────────
  welcome: (user: { name: string; email: string }, workspaceName = "FinovaOS") =>
    emailBase({
      companyName: "FinovaOS",
      badgeText: "Welcome",
      badgeColor: "#10b981",
      content: `
        <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#0f172a;">Welcome, ${user.name}! 🎉</p>
        <p style="margin:0 0 28px;font-size:14px;color:#64748b;">Your <strong>${workspaceName}</strong> workspace is ready. Here's how to get started:</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${[
            ["1", "Set up your company profile", "Add your business name, currency, and logo."],
            ["2", "Add your chart of accounts", "Import existing accounts or start from our template."],
            ["3", "Create your first invoice", "Start sending professional invoices in minutes."],
            ["4", "Invite your team", "Add accountants and viewers to collaborate."],
          ].map(([num, title, desc]) => `
            <tr>
              <td style="vertical-align:top;padding:0 14px 16px 0;width:36px;">
                <div style="width:32px;height:32px;background:#6366f1;border-radius:50%;text-align:center;line-height:32px;font-size:13px;font-weight:800;color:#ffffff;">${num}</div>
              </td>
              <td style="padding-bottom:16px;vertical-align:top;">
                <div style="font-size:14px;font-weight:700;color:#1e293b;">${title}</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">${desc}</div>
              </td>
            </tr>
          `).join("")}
        </table>
        <div style="text-align:center;margin:20px 0 0;">
          <a href="https://app.finovaos.app/dashboard" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:14px;font-weight:700;">Go to Dashboard →</a>
        </div>
      `,
    }),

  // ── Password Reset ─────────────────────────────────────────────────────────
  passwordReset: (user: { name: string; email: string }, link: string) =>
    emailBase({
      companyName: "FinovaOS",
      badgeText: "Password Reset",
      badgeColor: "#f59e0b",
      content: `
        <p style="margin:0 0 6px;font-size:15px;color:#64748b;">Hi <strong style="color:#1e293b;">${user.name}</strong>,</p>
        <p style="margin:0 0 4px;font-size:14px;color:#64748b;">We received a request to reset your password. Click the button below to choose a new password.</p>
        <p style="margin:0 0 24px;font-size:13px;color:#f59e0b;font-weight:600;">This link expires in 1 hour.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${link}" style="display:inline-block;background:#f59e0b;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:700;">Reset My Password</a>
        </div>
        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:20px 0;">
          <div style="font-size:12px;color:#92400e;font-weight:700;margin-bottom:4px;">⚠️ Security Notice</div>
          <div style="font-size:12px;color:#78350f;">If you didn't request a password reset, someone may have your email. Change your password immediately and contact support.</div>
        </div>
        <p style="margin:0;font-size:11px;color:#cbd5e1;text-align:center;word-break:break-all;">Or copy: ${link}</p>
      `,
    }),

  // ── Sales Invoice ──────────────────────────────────────────────────────────
  salesInvoice: (invoice: any, customer: any, companyName?: string) => {
    const co = companyName || "Sales Invoice";
    const subtotal = invoice.items?.reduce((s: number, i: any) => s + (i.amount ?? i.qty * (i.rate || 0)), 0) || invoice.total || 0;

    const content = `
      <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#0f172a;">Sales Invoice</p>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Dear <strong>${customer?.name || "Customer"}</strong>, please find your invoice details below.</p>
      ${infoGrid([
        ["Invoice No", invoice.invoiceNo],
        ["Date", fmtDate(invoice.date)],
        ["Due Date", invoice.dueDate ? fmtDate(invoice.dueDate) : null],
        ["Payment Method", invoice.paymentMethod || null],
        ["Reference", invoice.reference || null],
        ["Payment Terms", invoice.paymentTerms || null],
      ])}
      ${sectionHeading("Items")}
      ${itemsTable(invoice.items || [], [
        { label: "Item", key: (i: any) => i.item?.name || i.name || "N/A" },
        { label: "Qty", key: (i: any) => String(i.qty), align: "center" },
        { label: "Rate", key: (i: any) => n(i.rate), align: "right" },
        { label: "Amount", key: (i: any) => n(i.amount ?? i.qty * (i.rate || 0)), align: "right" },
      ])}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="width:50%;"></td><td style="width:50%;">
          ${totalsBlock(subtotal, invoice.discount, invoice.freight, invoice.discountType)}
        </td></tr>
      </table>
      ${invoice.notes ? `${sectionHeading("Notes")}<p style="margin:0;font-size:13px;color:#64748b;line-height:1.7;">${invoice.notes}</p>` : ""}
      ${invoice.termsConditions ? `${sectionHeading("Terms & Conditions")}<p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.7;">${invoice.termsConditions}</p>` : ""}
      <p style="margin:28px 0 0;font-size:13px;color:#64748b;text-align:center;">Thank you for your business! 🙏</p>
    `;

    return emailBase({ companyName: co, badgeText: "Sales Invoice", badgeColor: "#6366f1", content });
  },

  // ── Purchase Order ─────────────────────────────────────────────────────────
  purchaseOrder: (po: any, supplier: any, companyName?: string) => {
    const co = companyName || "Purchase Order";
    const subtotal = po.items?.reduce((s: number, i: any) => s + i.qty * (i.rate || 0), 0) || 0;

    const content = `
      <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#0f172a;">Purchase Order</p>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Dear <strong>${supplier?.name || "Supplier"}</strong>, please find our purchase order details below.</p>
      ${infoGrid([
        ["PO Number", po.poNo],
        ["Date", fmtDate(po.date)],
        ["Due Date", po.dueDate ? fmtDate(po.dueDate) : null],
        ["Payment Terms", po.paymentTerms || null],
        ["Status", po.approvalStatus || null],
        ["Reference", po.remarks || null],
      ])}
      ${sectionHeading("Ordered Items")}
      ${itemsTable(po.items || [], [
        { label: "Item", key: (i: any) => i.item?.name || i.name || "N/A" },
        { label: "Qty", key: (i: any) => String(i.qty), align: "center" },
        { label: "Rate", key: (i: any) => n(i.rate), align: "right" },
        { label: "Amount", key: (i: any) => n(i.qty * (i.rate || 0)), align: "right" },
      ])}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="width:50%;"></td><td style="width:50%;">
          ${totalsBlock(subtotal, po.discount, po.freight, po.discountType)}
        </td></tr>
      </table>
      ${po.notes ? `${sectionHeading("Notes")}<p style="margin:0;font-size:13px;color:#64748b;line-height:1.7;">${po.notes}</p>` : ""}
      <p style="margin:28px 0 0;font-size:13px;color:#64748b;text-align:center;">Please confirm receipt of this order. Thank you!</p>
    `;

    return emailBase({ companyName: co, badgeText: "Purchase Order", badgeColor: "#8b5cf6", content });
  },

  // ── Purchase Invoice ───────────────────────────────────────────────────────
  purchaseInvoice: (invoice: any, supplier: any, companyName?: string) => {
    const co = companyName || "Purchase Invoice";
    const subtotal = invoice.items?.reduce((s: number, i: any) => s + (i.amount ?? i.qty * (i.rate || 0)), 0) || invoice.total || 0;

    const content = `
      <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#0f172a;">Purchase Invoice</p>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Dear <strong>${supplier?.name || "Supplier"}</strong>, please find the purchase invoice details below.</p>
      ${infoGrid([
        ["Invoice No", invoice.invoiceNo],
        ["Date", fmtDate(invoice.date)],
        ["Due Date", invoice.dueDate ? fmtDate(invoice.dueDate) : null],
        ["Payment Method", invoice.paymentMethod || null],
        ["Reference", invoice.reference || null],
        ["Payment Terms", invoice.paymentTerms || null],
      ])}
      ${sectionHeading("Items")}
      ${itemsTable(invoice.items || [], [
        { label: "Item", key: (i: any) => i.item?.name || i.name || "N/A" },
        { label: "Qty", key: (i: any) => String(i.qty), align: "center" },
        { label: "Rate", key: (i: any) => n(i.rate), align: "right" },
        { label: "Amount", key: (i: any) => n(i.amount ?? i.qty * (i.rate || 0)), align: "right" },
      ])}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="width:50%;"></td><td style="width:50%;">
          ${totalsBlock(subtotal, invoice.discount, invoice.freight, invoice.discountType)}
        </td></tr>
      </table>
      ${invoice.notes ? `${sectionHeading("Notes")}<p style="margin:0;font-size:13px;color:#64748b;line-height:1.7;">${invoice.notes}</p>` : ""}
    `;

    return emailBase({ companyName: co, badgeText: "Purchase Invoice", badgeColor: "#7c3aed", content });
  },

  // ── Quotation ──────────────────────────────────────────────────────────────
  quotation: (quotation: any, customer: any, companyName?: string) => {
    const co = companyName || "Quotation";
    const subtotal = quotation.items?.reduce((s: number, i: any) => s + (i.amount ?? i.qty * (i.rate || 0)), 0) || quotation.total || 0;

    const content = `
      <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#0f172a;">Quotation</p>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Dear <strong>${customer?.name || quotation.customerName || "Customer"}</strong>, please find our quotation below. We look forward to your confirmation.</p>
      ${infoGrid([
        ["Quotation No", quotation.quotationNo],
        ["Date", fmtDate(quotation.date)],
        ["Valid Until", quotation.validUntil ? fmtDate(quotation.validUntil) : null],
        ["Status", quotation.status || null],
      ])}
      ${sectionHeading("Quoted Items")}
      ${itemsTable(quotation.items || [], [
        { label: "Item", key: (i: any) => i.item?.name || i.name || "N/A" },
        { label: "Qty", key: (i: any) => String(i.qty), align: "center" },
        { label: "Rate", key: (i: any) => n(i.rate), align: "right" },
        { label: "Amount", key: (i: any) => n(i.amount ?? i.qty * (i.rate || 0)), align: "right" },
      ])}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="width:50%;"></td><td style="width:50%;">
          ${totalsBlock(subtotal, 0, quotation.freight || 0)}
        </td></tr>
      </table>
      ${quotation.remarks ? `${sectionHeading("Remarks")}<p style="margin:0;font-size:13px;color:#64748b;line-height:1.7;">${quotation.remarks}</p>` : ""}
      <p style="margin:28px 0 0;font-size:13px;color:#64748b;text-align:center;">To accept this quotation, please reply to this email or contact us directly.</p>
    `;

    return emailBase({ companyName: co, badgeText: "Quotation", badgeColor: "#0891b2", content });
  },

  // ── Delivery Challan ───────────────────────────────────────────────────────
  deliveryChallan: (challan: any, customer: any, companyName?: string) => {
    const co = companyName || "Delivery Challan";

    const content = `
      <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#0f172a;">Delivery Challan</p>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Dear <strong>${customer?.name || "Customer"}</strong>, your goods have been dispatched. Details below.</p>
      ${infoGrid([
        ["Challan No", challan.challanNo],
        ["Date", fmtDate(challan.date)],
        ["Driver", challan.driverName || null],
        ["Vehicle No", challan.vehicleNo || null],
        ["Status", challan.status || null],
        ["Remarks", challan.remarks || null],
      ])}
      ${sectionHeading("Dispatched Items")}
      ${itemsTable(challan.items || [], [
        { label: "Item", key: (i: any) => i.item?.name || i.name || "N/A" },
        { label: "Qty", key: (i: any) => String(i.qty), align: "center" },
        { label: "Rate", key: (i: any) => i.rate ? n(i.rate) : "—", align: "right" },
      ])}
      <p style="margin:28px 0 0;font-size:13px;color:#64748b;text-align:center;">Please confirm receipt of the goods. Thank you!</p>
    `;

    return emailBase({ companyName: co, badgeText: "Delivery Challan", badgeColor: "#0891b2", content });
  },

  // ── Payment Receipt ────────────────────────────────────────────────────────
  paymentReceipt: (receipt: any, party: any, companyName?: string) => {
    const co = companyName || "Payment Receipt";

    const content = `
      <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#0f172a;">Payment Received</p>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">Dear <strong>${party?.name || "Customer"}</strong>, your payment has been received successfully.</p>
      ${bigBadge("✅", "Amount Received", n(receipt.amount), "#10b981")}
      ${infoGrid([
        ["Receipt No", receipt.receiptNo],
        ["Date", fmtDate(receipt.date)],
        ["Payment Mode", receipt.paymentMode || null],
        ["Reference No", receipt.referenceNo || null],
        ["Status", receipt.status || null],
        ["Narration", receipt.narration || null],
      ])}
      <p style="margin:28px 0 0;font-size:13px;color:#64748b;text-align:center;">Thank you for your prompt payment! 🙏</p>
    `;

    return emailBase({ companyName: co, badgeText: "Payment Receipt", badgeColor: "#10b981", content });
  },

  // ── Payment Reminder ───────────────────────────────────────────────────────
  paymentReminder: (invoice: any, customer: any, daysOverdue = 0, companyName?: string) => {
    const co = companyName || "Payment Reminder";
    const isUrgent = daysOverdue >= 30;
    const urgencyColor = daysOverdue >= 30 ? "#ef4444" : daysOverdue >= 7 ? "#f59e0b" : "#6366f1";

    const content = `
      <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#0f172a;">${isUrgent ? "⚠️ Urgent:" : ""} Payment Due</p>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">Dear <strong>${customer?.name || "Customer"}</strong>, this is a friendly reminder that your invoice is overdue.</p>
      ${bigBadge(
        daysOverdue >= 30 ? "🔴" : daysOverdue >= 7 ? "🟡" : "🔵",
        `Outstanding Amount${daysOverdue > 0 ? ` · ${daysOverdue} days overdue` : ""}`,
        n(invoice.total),
        urgencyColor,
      )}
      ${infoGrid([
        ["Invoice No", invoice.invoiceNo],
        ["Invoice Date", fmtDate(invoice.date)],
        ["Due Date", invoice.dueDate ? fmtDate(invoice.dueDate) : null],
        ["Amount", n(invoice.total)],
      ])}
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:20px 0;">
        <div style="font-size:12px;color:#92400e;font-weight:700;margin-bottom:4px;">Action Required</div>
        <div style="font-size:12px;color:#78350f;">Please settle this invoice at your earliest convenience to avoid any disruption to your account. If you have already made a payment, please disregard this notice.</div>
      </div>
      <p style="margin:0;font-size:13px;color:#64748b;text-align:center;">To make a payment or query this invoice, please reply to this email.</p>
    `;

    return emailBase({ companyName: co, badgeText: "Payment Reminder", badgeColor: urgencyColor, content });
  },

  // ── Sale Return ────────────────────────────────────────────────────────────
  saleReturn: (saleReturn: any, customer: any, companyName?: string) => {
    const co = companyName || "Sale Return";
    const subtotal = saleReturn.items?.reduce((s: number, i: any) => s + (i.amount ?? i.qty * (i.rate || 0)), 0) || saleReturn.total || 0;

    const content = `
      <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#0f172a;">Sale Return Confirmation</p>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Dear <strong>${customer?.name || "Customer"}</strong>, your return has been processed successfully.</p>
      ${infoGrid([
        ["Return No", saleReturn.returnNo],
        ["Date", fmtDate(saleReturn.date)],
        ["Original Invoice", saleReturn.invoiceId ? `Ref: ${saleReturn.invoiceId.slice(-8)}` : null],
        ["Refund Amount", n(saleReturn.total)],
        ["Remarks", saleReturn.remarks || null],
      ])}
      ${sectionHeading("Returned Items")}
      ${itemsTable(saleReturn.items || [], [
        { label: "Item", key: (i: any) => i.item?.name || i.name || "N/A" },
        { label: "Qty Returned", key: (i: any) => String(i.qty), align: "center" },
        { label: "Rate", key: (i: any) => n(i.rate), align: "right" },
        { label: "Amount", key: (i: any) => n(i.amount ?? i.qty * (i.rate || 0)), align: "right" },
      ])}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="width:50%;"></td><td style="width:50%;">
          ${totalsBlock(subtotal, saleReturn.discount, saleReturn.freight, saleReturn.discountType)}
        </td></tr>
      </table>
      <p style="margin:28px 0 0;font-size:13px;color:#64748b;text-align:center;">Your refund will be processed as per our return policy. Thank you!</p>
    `;

    return emailBase({ companyName: co, badgeText: "Sale Return", badgeColor: "#f59e0b", content });
  },

  // ── Team Invitation ────────────────────────────────────────────────────────
  teamInvitation: ({
    recipientEmail,
    role,
    companyName,
    inviterName,
    link,
  }: {
    recipientEmail: string;
    role: string;
    companyName: string;
    inviterName?: string;
    link: string;
  }) => {
    const content = `
      <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#0f172a;">You're Invited! 🎉</p>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;">
        ${inviterName ? `<strong>${inviterName}</strong> has invited you to join` : "You've been invited to join"}
        <strong> ${companyName}</strong> on FinovaOS as a <strong>${role}</strong>.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${link}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:700;">Accept Invitation →</a>
      </div>
      ${infoGrid([
        ["Invited Email", recipientEmail],
        ["Role", role],
        ["Workspace", companyName],
        ["Expires In", "7 days"],
      ])}
      <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;text-align:center;">If you were not expecting this invitation, you can safely ignore this email.</p>
      <p style="margin:6px 0 0;font-size:11px;color:#cbd5e1;text-align:center;word-break:break-all;">Or copy: ${link}</p>
    `;

    return emailBase({ companyName: "FinovaOS", badgeText: "Team Invitation", badgeColor: "#6366f1", content });
  },

  // ── Low Stock Alert ────────────────────────────────────────────────────────
  lowStockAlert: (
    items: Array<{ name: string; code: string; currentStock: number; minStock: number; unit: string }>,
    companyName: string,
  ) => {
    const content = `
      <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#0f172a;">⚠️ Low Stock Alert</p>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;">The following <strong>${items.length} item${items.length !== 1 ? "s" : ""}</strong> in your inventory have fallen below their minimum stock threshold.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin:0 0 20px;">
        <thead>
          <tr style="background:#7f1d1d;">
            <th style="padding:10px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);text-align:left;text-transform:uppercase;letter-spacing:0.6px;">Item</th>
            <th style="padding:10px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);text-align:center;text-transform:uppercase;letter-spacing:0.6px;">Current</th>
            <th style="padding:10px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);text-align:center;text-transform:uppercase;letter-spacing:0.6px;">Minimum</th>
            <th style="padding:10px 12px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);text-align:center;text-transform:uppercase;letter-spacing:0.6px;">Shortage</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, i) => `
            <tr style="background:${i % 2 === 0 ? '#fff5f5' : '#ffffff'};">
              <td style="padding:10px 12px;font-size:13px;color:#1e293b;border-bottom:1px solid #f1f5f9;">
                <div style="font-weight:600;">${item.name}</div>
                <div style="font-size:11px;color:#94a3b8;margin-top:1px;">${item.code}</div>
              </td>
              <td style="padding:10px 12px;font-size:13px;color:#ef4444;font-weight:700;text-align:center;border-bottom:1px solid #f1f5f9;">${item.currentStock} ${item.unit}</td>
              <td style="padding:10px 12px;font-size:13px;color:#64748b;text-align:center;border-bottom:1px solid #f1f5f9;">${item.minStock} ${item.unit}</td>
              <td style="padding:10px 12px;font-size:13px;color:#ef4444;font-weight:700;text-align:center;border-bottom:1px solid #f1f5f9;">${item.minStock - item.currentStock} ${item.unit}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div style="text-align:center;">
        <a href="https://app.finovaos.app/dashboard/inventory" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:13px;font-weight:700;">View Inventory →</a>
      </div>
    `;

    return emailBase({ companyName, badgeText: "Low Stock", badgeColor: "#ef4444", content });
  },

  // ── Generic Report ─────────────────────────────────────────────────────────
  report: (title: string, content: string, _reportType: string, companyName?: string) => {
    const co = companyName || "";
    const body = `
      <p style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f172a;">${title}</p>
      <div style="font-size:13px;color:#475569;line-height:1.8;">${content}</div>
    `;
    return emailBase({ companyName: co || "Report", badgeText: _reportType || "Report", badgeColor: "#6366f1", content: body });
  },
};

// ─── Login alert email ────────────────────────────────────────────────────────
export async function sendLoginAlertEmail(opts: {
  to: string;
  name: string;
  ip: string | null;
  city: string | null;
  country: string | null;
  userAgent: string | null;
  time: Date;
}): Promise<void> {
  const device = opts.userAgent
    ? opts.userAgent.includes("Mobile") ? "Mobile" : "Desktop/Laptop"
    : "Unknown Device";
  const browser = (() => {
    const ua = opts.userAgent || "";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return "Browser";
  })();
  const location = [opts.city, opts.country].filter(Boolean).join(", ") || "Unknown location";
  const timeStr = opts.time.toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" });

  const html = emailBase({
    companyName: "FinovaOS Security",
    badgeText: "Login Alert",
    badgeColor: "#f59e0b",
    content: `
      <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;">New Login Detected</p>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;">Hi ${opts.name}, a new login was made to your account.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
        ${[
          ["🕐 Time",     timeStr],
          ["📍 Location", location],
          ["🌐 IP Address", opts.ip || "Unknown"],
          ["💻 Device",   `${device} · ${browser}`],
        ].map(([k, v]) => `
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 0;color:#94a3b8;font-weight:600;width:120px;">${k}</td>
            <td style="padding:10px 0;color:#0f172a;font-weight:700;">${v}</td>
          </tr>
        `).join("")}
      </table>
      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:14px 16px;font-size:13px;color:#92400e;line-height:1.7;">
        <strong>⚠️ Not you?</strong><br/>
        If you did not log in, please change your password immediately and contact your system administrator.
      </div>
    `,
  });

  try {
    await sendEmail({ to: opts.to, subject: `🔐 New Login Alert — ${timeStr}`, html });
  } catch {}
}

// ─── Send email ───────────────────────────────────────────────────────────────
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content: string | Buffer }>;
  companyId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const toStr = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  const toArr = Array.isArray(options.to) ? options.to : [options.to];

  // ── Resend path (platform emails, no companyId) ──────────────────────────
  const resend = getResend();
  if (!options.companyId && resend) {
    try {
      const fromDomain = process.env.RESEND_FROM_DOMAIN || 'finovaos.app';
      const { data, error } = await resend.emails.send({
        from: `FinovaOS <noreply@${fromDomain}>`,
        to: toArr,
        subject: options.subject,
        html: options.html,
        ...(options.text ? { text: options.text } : {}),
        headers: {
          'List-Unsubscribe': `<https://finovaos.app/unsubscribe>`,
          'X-Entity-Ref-ID': Date.now().toString(),
        },
      });
      if (error) throw new Error(error.message);
      prisma.emailLog.create({ data: { to: toStr, subject: options.subject, status: 'sent' } }).catch(() => {});
      return { success: true, messageId: data?.id };
    } catch (error: any) {
      console.error('❌ Resend error:', error);
      prisma.emailLog.create({ data: { to: toStr, subject: options.subject, status: 'failed', error: error.message } }).catch(() => {});
      return { success: false, error: error.message };
    }
  }

  // ── SMTP path (company emails) ────────────────────────────────────────────
  const { transport, config } = await getTransporter(options.companyId);
  if (!transport) {
    return { success: false, error: 'Email not configured.' };
  }

  try {
    const fromEmail = config.from || config.auth.user || 'noreply@finovaos.app';
    let fromName = config.fromName && config.fromName !== "FinovaOS" ? config.fromName : "";
    if (!fromName && options.companyId) {
      const co = await prisma.company.findUnique({ where: { id: options.companyId }, select: { name: true } }).catch(() => null);
      fromName = co?.name || "FinovaOS";
    }
    if (!fromName) fromName = "FinovaOS";

    const info = await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toStr,
      subject: options.subject,
      html: options.html,
      ...(options.text ? { text: options.text } : {}),
      attachments: options.attachments,
      headers: { 'List-Unsubscribe': `<https://finovaos.app/unsubscribe>` },
    });

    prisma.emailLog.create({ data: { to: toStr, subject: options.subject, status: 'sent' } }).catch(() => {});
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Email send error:', error);
    prisma.emailLog.create({ data: { to: toStr, subject: options.subject, status: 'failed', error: error.message } }).catch(() => {});
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

// ─── Test email configuration ─────────────────────────────────────────────────
export async function testEmailConfig(companyId?: string): Promise<{ success: boolean; message: string }> {
  const { transport } = await getTransporter(companyId);
  if (!transport) {
    return { success: false, message: 'Email not configured for this company' };
  }
  try {
    await transport.verify();
    return { success: true, message: 'Email configuration is valid' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Email configuration test failed' };
  }
}
