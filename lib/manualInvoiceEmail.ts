import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { buildBillingInvoicePdfData } from "@/lib/billingInvoice";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://usefinova.app";

/**
 * PKR is quoted in whole rupees; everything else keeps cents. Matches the
 * customer's own billing page, so the figure in the email and the figure on
 * screen are written the same way.
 */
function money(amount: number, currency: string) {
  const digits = currency.toUpperCase() === "PKR" ? 0 : 2;
  return `${currency.toUpperCase()} ${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function fmtDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

/**
 * Emails a manually-issued invoice to the customer, with the PDF attached.
 *
 * An offline deal has no gateway behind it, so nothing was ever sent — the
 * customer paid by bank transfer and got no receipt unless they thought to go
 * and look at their billing page. This is the receipt.
 *
 * Rendered through `buildBillingInvoicePdfData`, the same builder behind the
 * download button and the admin's copy, so the attachment is byte-for-byte the
 * document they would have fetched themselves.
 *
 * Never throws: an invoice that is written but not emailed is a smaller problem
 * than a grant that fails because a mail server was down. The caller decides
 * what to report.
 */
export async function sendManualInvoiceEmail(params: {
  companyId: string;
  invoiceId: string;
  /** Overrides the recipient lookup — used when the invoice carries its own. */
  toEmail?: string | null;
}): Promise<{ sent: boolean; to?: string; error?: string }> {
  try {
    const recipient =
      params.toEmail ||
      (
        await prisma.userCompany
          .findFirst({
            where: { companyId: params.companyId, user: { role: { in: ["ADMIN", "OWNER"] } } },
            include: { user: { select: { name: true, email: true } } },
          })
          .catch(() => null)
      )?.user?.email ||
      (
        await prisma.user
          .findFirst({
            where: { companies: { some: { companyId: params.companyId } }, active: true },
            orderBy: { createdAt: "asc" },
            select: { email: true },
          })
          .catch(() => null)
      )?.email;

    if (!recipient) return { sent: false, error: "No email address on file for this company" };

    const built = await buildBillingInvoicePdfData(params.companyId, `inv_${params.invoiceId}`);
    if (!built) return { sent: false, error: "Invoice could not be rendered" };

    const d = built.pdfData;
    const currency = String(d.currency || "USD");
    const rows: string[] = [
      `<tr><td style="padding:8px 0;color:#374151;">${d.items[0]?.name || "Subscription"}</td>
        <td style="padding:8px 0;text-align:right;color:#111;">${money(d.subtotal, currency)}</td></tr>`,
    ];
    if (d.discount > 0) {
      rows.push(
        `<tr><td style="padding:8px 0;color:#047857;">Discount</td>
          <td style="padding:8px 0;text-align:right;color:#047857;">− ${money(d.discount, currency)}</td></tr>`,
      );
    }
    if (d.tax > 0) {
      rows.push(
        `<tr><td style="padding:8px 0;color:#374151;">Tax</td>
          <td style="padding:8px 0;text-align:right;color:#111;">${money(d.tax, currency)}</td></tr>`,
      );
    }

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;">
        <h2 style="margin:0 0 4px;color:#0f766e;">Invoice ${built.invoiceNumber}</h2>
        <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">${d.invoiceDate}</p>

        <p style="font-size:14px;">Hi ${d.customerName || "there"},</p>
        <p style="font-size:14px;line-height:1.6;">
          Thank you — your payment has been received and your FinovaOS subscription is active.
          Your invoice is attached, and a copy is always available on your billing page.
        </p>

        <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
          ${rows.join("")}
          <tr><td colspan="2" style="border-top:1px solid #e5e7eb;padding:0;"></td></tr>
          <tr>
            <td style="padding:10px 0;font-weight:bold;">Total paid</td>
            <td style="padding:10px 0;text-align:right;font-weight:bold;color:#0f766e;font-size:16px;">
              ${money(d.total, currency)}
            </td>
          </tr>
        </table>

        <p style="margin:20px 0;">
          <a href="${APP_URL}/dashboard/billing"
             style="display:inline-block;background:#0f766e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">
            View billing
          </a>
        </p>

        <p style="font-size:12px;color:#6b7280;line-height:1.6;margin-top:24px;">
          ${d.notes || ""}
        </p>
        <p style="font-size:12px;color:#9ca3af;">FinovaOS · Finova Forge</p>
      </div>
    `;

    const pdf = await generateInvoicePdf(d).catch(() => null);

    const result = await sendEmail({
      to: recipient,
      subject: `Your FinovaOS invoice ${built.invoiceNumber} — ${money(d.total, currency)}`,
      html,
      // No companyId on purpose: this is a platform invoice from FinovaOS, so
      // it must go out on the platform sender, not the customer's own SMTP.
      ...(pdf ? { attachments: [{ filename: `invoice-${built.invoiceNumber}.pdf`, content: pdf }] } : {}),
    });

    if (!result.success) return { sent: false, to: recipient, error: result.error };
    return { sent: true, to: recipient };
  } catch (err: any) {
    console.error("[manualInvoiceEmail] send failed:", err);
    return { sent: false, error: err?.message || "Failed to send invoice email" };
  }
}
