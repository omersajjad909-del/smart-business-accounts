import { sendEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.finovaos.app";

function fmtSlot(start: Date, end: Date): string {
  const date = start.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const t = (d: Date) =>
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} — ${t(start)} to ${t(end)}`;
}

function businessLabel(type: string): string {
  const labels: Record<string, string> = {
    trading: "Trading Business",
    wholesale: "Wholesale",
    distribution: "Distribution",
    import_company: "Import / Export",
    export_company: "Import / Export",
    travel: "Travel Agency",
  };
  return labels[type] || "Live";
}

function renderShell(inner: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f6fa;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111827">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6fa;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,.08)">
        <tr><td style="padding:28px 32px 8px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff">
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;font-weight:700">FinovaOS</div>
          <div style="font-size:22px;font-weight:800;margin-top:4px">Live Demo</div>
        </td></tr>
        <tr><td style="padding:24px 32px 28px">${inner}</td></tr>
        <tr><td style="padding:18px 32px 26px;background:#fafafa;border-top:1px solid #eef0f4;font-size:12px;color:#6b7280;line-height:1.7">
          Need help? Reply to this email or WhatsApp us at <strong>+92 304 7653693</strong>.<br/>
          FinovaOS — Cloud accounting for growing businesses.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendBookingConfirmation(booking: {
  id: string;
  name: string;
  email: string;
  businessType: string;
  slotStart: Date;
  slotEnd: Date;
  accessToken: string;
}) {
  const label = businessLabel(booking.businessType);
  const startLink = `${APP_URL}/demo/start?token=${booking.accessToken}`;
  const slot = fmtSlot(booking.slotStart, booking.slotEnd);

  const inner = `
    <p style="font-size:15px;line-height:1.7;margin:0 0 12px">Hi ${booking.name.split(" ")[0] || "there"},</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 20px">
      Your <strong>${label}</strong> demo is booked. Here are the details:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:22px">
      <tr><td style="padding:16px 18px">
        <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;font-weight:700;margin-bottom:4px">When</div>
        <div style="font-size:15px;font-weight:700;color:#111827">${slot}</div>
      </td></tr>
      <tr><td style="padding:0 18px 16px">
        <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;font-weight:700;margin-bottom:4px">Duration</div>
        <div style="font-size:14px;color:#111827">30 minutes</div>
      </td></tr>
    </table>

    <p style="font-size:14px;line-height:1.7;margin:0 0 18px;color:#374151">
      When your time comes, click the button below and you'll be dropped straight into a real FinovaOS workspace pre-loaded with sample data. No sign-up needed.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px">
      <tr><td style="border-radius:10px;background:linear-gradient(135deg,#4f46e5,#7c3aed)">
        <a href="${startLink}" style="display:inline-block;padding:13px 28px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px">
          Open Demo Workspace →
        </a>
      </td></tr>
    </table>

    <div style="padding:14px 16px;background:#eff6ff;border:1px solid #dbeafe;border-radius:10px;font-size:13px;color:#1e40af;line-height:1.7;margin-bottom:18px">
      <strong>Save this link.</strong> Same link works from any device. It only becomes active at your booked time.
    </div>

    <div style="font-size:12px;color:#6b7280;line-height:1.6;word-break:break-all">
      Direct link: <a href="${startLink}" style="color:#4f46e5">${startLink}</a>
    </div>
  `;

  return sendEmail({
    to: booking.email,
    subject: `Your FinovaOS ${label} demo — ${slot}`,
    html: renderShell(inner),
  });
}

export async function sendBookingReminder(booking: {
  name: string;
  email: string;
  businessType: string;
  slotStart: Date;
  slotEnd: Date;
  accessToken: string;
}) {
  const label = businessLabel(booking.businessType);
  const startLink = `${APP_URL}/demo/start?token=${booking.accessToken}`;
  const slot = fmtSlot(booking.slotStart, booking.slotEnd);
  const minutesAway = Math.max(
    1,
    Math.round((booking.slotStart.getTime() - Date.now()) / 60000)
  );

  const inner = `
    <p style="font-size:15px;line-height:1.7;margin:0 0 12px">Hi ${booking.name.split(" ")[0] || "there"},</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 20px">
      Quick reminder — your <strong>${label}</strong> demo starts in about <strong>${minutesAway} minutes</strong>.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:22px">
      <tr><td style="padding:14px 18px">
        <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;font-weight:700;margin-bottom:4px">Slot</div>
        <div style="font-size:14px;font-weight:700;color:#111827">${slot}</div>
      </td></tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
      <tr><td style="border-radius:10px;background:linear-gradient(135deg,#4f46e5,#7c3aed)">
        <a href="${startLink}" style="display:inline-block;padding:13px 28px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px">
          Open Demo Workspace →
        </a>
      </td></tr>
    </table>

    <div style="font-size:12px;color:#6b7280;line-height:1.7">
      Direct link: <a href="${startLink}" style="color:#4f46e5;word-break:break-all">${startLink}</a>
    </div>
  `;

  return sendEmail({
    to: booking.email,
    subject: `Reminder: your FinovaOS ${label} demo starts soon`,
    html: renderShell(inner),
  });
}
