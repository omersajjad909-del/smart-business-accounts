// FILE: lib/emailTemplates.ts
// All Finova email templates — HTML branded emails
// Usage: import { emailTemplates } from "@/lib/emailTemplates"

import { getAppUrl, getMarketingUrl } from "@/lib/domains";

const BASE_URL = getMarketingUrl();
const APP_URL = getAppUrl();

const STYLES = `
  body { margin:0; padding:0; background:#f1f5f9; font-family:'Segoe UI',Arial,sans-serif; }
  .wrapper { max-width:600px; margin:0 auto; background:#ffffff; }
  .header { background:linear-gradient(135deg,#080c1e,#0c0f2e); padding:32px 40px; text-align:center; }
  .logo { font-size:24px; font-weight:800; color:#ffffff; letter-spacing:-0.5px; }
  .logo span { color:#818cf8; }
  .body { padding:40px; color:#1e293b; }
  .footer { background:#f8fafc; padding:24px 40px; text-align:center; border-top:1px solid #e2e8f0; }
  .btn { display:inline-block; padding:14px 32px; border-radius:10px; background:linear-gradient(135deg,#4f46e5,#7c3aed); color:#ffffff!important; font-weight:700; font-size:15px; text-decoration:none; }
  .otp-box { background:#f1f5f9; border:2px dashed #6366f1; border-radius:12px; padding:20px; text-align:center; margin:24px 0; }
  .otp-code { font-size:40px; font-weight:900; letter-spacing:12px; color:#4f46e5; font-family:monospace; }
  h1 { font-size:24px; font-weight:800; color:#0f172a; margin:0 0 12px; }
  p { font-size:15px; line-height:1.7; color:#475569; margin:0 0 16px; }
  .highlight { color:#4f46e5; font-weight:700; }
  .divider { height:1px; background:#e2e8f0; margin:24px 0; }
  .feature-row { display:flex; gap:12px; margin-bottom:12px; align-items:flex-start; }
  .feature-icon { font-size:18px; margin-top:2px; }
  .tag { display:inline-block; padding:3px 10px; border-radius:20px; background:#ede9fe; color:#4f46e5; font-size:12px; font-weight:700; }
`;

function baseTemplate(content: string, preheader = "") {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Finova</title>
  <style>${STYLES}</style>
</head>
<body>
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:#f1f5f9;">${preheader}</div>` : ""}
  <div class="wrapper">
    <div class="header">
      <div class="logo">Fin<span>ova</span></div>
      <div style="font-size:12px;color:rgba(255,255,255,.4);margin-top:4px;letter-spacing:.06em;">GLOBAL ACCOUNTING PLATFORM</div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p style="font-size:12px;color:#94a3b8;margin:0 0 8px;">
        © ${new Date().getFullYear()} Finova · <a href="${BASE_URL}/legal/privacy" style="color:#6366f1;">Privacy Policy</a> · <a href="${BASE_URL}/legal/terms" style="color:#6366f1;">Terms</a>
      </p>
      <p style="font-size:11px;color:#cbd5e1;margin:0;">
        You're receiving this email because you signed up for Finova.<br>
        <a href="${BASE_URL}/unsubscribe" style="color:#94a3b8;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export const emailTemplates = {

  /* ── 1. OTP Verification ── */
  otp: (user: { name: string; email: string }, code: string) =>
    baseTemplate(`
      <h1>Verify your email address</h1>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Welcome to Finova! Enter this code to verify your email and activate your account.</p>
      <div class="otp-box">
        <div style="font-size:12px;font-weight:700;color:#64748b;letter-spacing:.1em;margin-bottom:8px;">YOUR VERIFICATION CODE</div>
        <div class="otp-code">${code}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:8px;">Valid for 15 minutes</div>
      </div>
      <p>If you didn't create a Finova account, you can safely ignore this email.</p>
      <div class="divider"></div>
      <p style="font-size:13px;color:#94a3b8;">For security, never share this code with anyone — Finova will never ask for it.</p>
    `, `Your Finova verification code is ${code}`),

  /* ── 2. Welcome Email ── */
  welcome: (user: { name: string; email: string }, plan: string, companyName: string) =>
    baseTemplate(`
      <h1>Welcome to Finova, ${user.name.split(" ")[0]}! 🎉</h1>
      <p>Your <strong>${companyName}</strong> workspace is ready. You're on the <span class="tag">${plan.toUpperCase()}</span> plan.</p>
      <p>Here's what you can do right now:</p>
      <div style="margin:20px 0;">
        <div class="feature-row"><span class="feature-icon">📊</span><div><strong>Set up your Chart of Accounts</strong><br><span style="font-size:13px;color:#64748b;">Go to Accounting → Chart of Accounts to configure your ledger.</span></div></div>
        <div class="feature-row"><span class="feature-icon">🧾</span><div><strong>Create your first invoice</strong><br><span style="font-size:13px;color:#64748b;">Go to Sales → New Invoice and send a professional invoice in minutes.</span></div></div>
        <div class="feature-row"><span class="feature-icon">👥</span><div><strong>Invite your team</strong><br><span style="font-size:13px;color:#64748b;">Go to Settings → Team Members to add your accountant or colleagues.</span></div></div>
        <div class="feature-row"><span class="feature-icon">🏦</span><div><strong>Connect your bank</strong><br><span style="font-size:13px;color:#64748b;">Go to Banking → Add Bank Account for auto-reconciliation.</span></div></div>
      </div>
      <div class="divider"></div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${APP_URL}/dashboard" class="btn">Go to Dashboard →</a>
      </div>
      <p style="font-size:13px;color:#94a3b8;text-align:center;">Need help? Reply to this email or visit our <a href="${BASE_URL}/help" style="color:#6366f1;">Help Centre</a>.</p>
    `, `Your Finova workspace is ready — let's get started`),

  /* ── 3. Password Reset ── */
  passwordReset: (user: { name: string }, resetUrl: string) =>
    baseTemplate(`
      <h1>Reset your password</h1>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>We received a request to reset your Finova password. Click the button below to set a new password.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${resetUrl}" class="btn">Reset Password →</a>
      </div>
      <p style="font-size:13px;color:#94a3b8;">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
      <div class="divider"></div>
      <p style="font-size:12px;color:#94a3b8;">If the button doesn't work, copy and paste this link:<br>
        <a href="${resetUrl}" style="color:#6366f1;word-break:break-all;">${resetUrl}</a>
      </p>
    `, "Reset your Finova password"),

  /* ── 4. Team Invite ── */
  teamInvite: (inviter: string, companyName: string, role: string, inviteUrl: string) =>
    baseTemplate(`
      <h1>You've been invited to join ${companyName}</h1>
      <p><strong>${inviter}</strong> has invited you to collaborate on <strong>${companyName}</strong>'s Finova workspace as a <span class="tag">${role}</span>.</p>
      <p>Finova is a cloud accounting platform that helps businesses manage invoices, inventory, payroll, and more.</p>
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:24px 0;border:1px solid #e2e8f0;">
        <div style="font-size:13px;color:#64748b;margin-bottom:8px;">YOU'VE BEEN INVITED TO</div>
        <div style="font-size:18px;font-weight:800;color:#0f172a;">${companyName}</div>
        <div style="font-size:13px;color:#4f46e5;font-weight:600;margin-top:4px;">Role: ${role}</div>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${inviteUrl}" class="btn">Accept Invitation →</a>
      </div>
      <p style="font-size:13px;color:#94a3b8;">This invitation expires in 7 days. If you don't know ${inviter}, you can ignore this email.</p>
    `, `${inviter} invited you to join ${companyName} on Finova`),

  /* ── 5. Invoice Sent (to customer) ── */
  invoiceSent: (customerName: string, invoiceNo: string, amount: string, dueDate: string, companyName: string, viewUrl: string) =>
    baseTemplate(`
      <h1>Invoice from ${companyName}</h1>
      <p>Dear <strong>${customerName}</strong>,</p>
      <p>Please find your invoice below. You can view and download it using the button below.</p>
      <div style="background:#f8fafc;border-radius:12px;padding:24px;margin:24px 0;border:1px solid #e2e8f0;">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
          <span style="font-size:13px;color:#64748b;">Invoice Number</span>
          <span style="font-size:13px;font-weight:700;color:#0f172a;">${invoiceNo}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
          <span style="font-size:13px;color:#64748b;">Amount Due</span>
          <span style="font-size:20px;font-weight:800;color:#4f46e5;">${amount}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:13px;color:#64748b;">Due Date</span>
          <span style="font-size:13px;font-weight:700;color:#ef4444;">${dueDate}</span>
        </div>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${viewUrl}" class="btn">View Invoice →</a>
      </div>
      <p style="font-size:13px;color:#94a3b8;">For questions about this invoice, please contact <strong>${companyName}</strong> directly.</p>
    `, `Invoice ${invoiceNo} from ${companyName} — ${amount} due ${dueDate}`),

  /* ── 6. Payment Reminder ── */
  paymentReminder: (customerName: string, invoiceNo: string, amount: string, dueDate: string, daysOverdue: number, companyName: string, viewUrl: string) =>
    baseTemplate(`
      <h1>Payment reminder${daysOverdue > 0 ? " — overdue" : ""}</h1>
      <p>Dear <strong>${customerName}</strong>,</p>
      <p>${daysOverdue > 0
        ? `This is a reminder that invoice <strong>${invoiceNo}</strong> from <strong>${companyName}</strong> is <strong style="color:#ef4444;">${daysOverdue} days overdue</strong>.`
        : `This is a friendly reminder that invoice <strong>${invoiceNo}</strong> from <strong>${companyName}</strong> is due on <strong>${dueDate}</strong>.`
      }</p>
      <div style="background:${daysOverdue > 0 ? "#fef2f2" : "#f8fafc"};border-radius:12px;padding:20px;margin:24px 0;border:1px solid ${daysOverdue > 0 ? "#fecaca" : "#e2e8f0"};">
        <div style="font-size:13px;color:#64748b;margin-bottom:6px;">AMOUNT DUE</div>
        <div style="font-size:28px;font-weight:900;color:${daysOverdue > 0 ? "#ef4444" : "#4f46e5"};">${amount}</div>
        <div style="font-size:13px;color:#64748b;margin-top:4px;">Invoice ${invoiceNo} · Due ${dueDate}</div>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${viewUrl}" class="btn">View & Pay Invoice →</a>
      </div>
    `, `Payment reminder — Invoice ${invoiceNo} — ${amount}`),

  /* ── 7. Subscription Activated ── */
  subscriptionActivated: (user: { name: string }, plan: string, amount: string, nextBilling: string) =>
    baseTemplate(`
      <h1>Your ${plan} plan is active ✅</h1>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Your payment was successful and your <strong>${plan}</strong> plan is now active. Here's your billing summary:</p>
      <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:24px 0;border:1px solid #bbf7d0;">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="font-size:13px;color:#64748b;">Plan</span>
          <span style="font-size:13px;font-weight:700;color:#0f172a;">${plan}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="font-size:13px;color:#64748b;">Amount Paid</span>
          <span style="font-size:13px;font-weight:700;color:#16a34a;">${amount}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:13px;color:#64748b;">Next Billing</span>
          <span style="font-size:13px;font-weight:700;color:#0f172a;">${nextBilling}</span>
        </div>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${APP_URL}/dashboard" class="btn">Go to Dashboard →</a>
      </div>
    `, `Your Finova ${plan} plan is now active`),

  /* ── 8. Email Broadcast (admin sends to users) ── */
  broadcast: (subject: string, body: string, _companyName = "Finova") =>
    baseTemplate(`
      <h1>${subject}</h1>
      <div style="white-space:pre-wrap;font-size:15px;line-height:1.75;color:#475569;">${body}</div>
      <div class="divider"></div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${APP_URL}/dashboard" class="btn">Go to Dashboard →</a>
      </div>
    `, subject),

  /* ── 9. Contact Form Confirmation ── */
  contactConfirmation: (name: string, subject: string) =>
    baseTemplate(`
      <h1>We got your message ✅</h1>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Thanks for reaching out! We've received your message about <strong>"${subject}"</strong> and will get back to you within 24 hours.</p>
      <p>In the meantime, you might find answers in our <a href="${BASE_URL}/help" style="color:#6366f1;">Help Centre</a>.</p>
      <div class="divider"></div>
      <p style="font-size:13px;color:#94a3b8;">— The Finova Team</p>
    `, "We received your message — Finova"),

  /* ── 10. Payslip Notification ── */
  payslip: (employeeName: string, month: string, netSalary: string, viewUrl: string) =>
    baseTemplate(`
      <h1>Your payslip for ${month} is ready</h1>
      <p>Hi <strong>${employeeName}</strong>,</p>
      <p>Your salary for <strong>${month}</strong> has been processed. Here's a summary:</p>
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:24px 0;border:1px solid #e2e8f0;">
        <div style="font-size:13px;color:#64748b;margin-bottom:6px;">NET SALARY</div>
        <div style="font-size:32px;font-weight:900;color:#4f46e5;">${netSalary}</div>
        <div style="font-size:13px;color:#64748b;margin-top:4px;">${month}</div>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${viewUrl}" class="btn">View & Download Payslip →</a>
      </div>
    `, `Your payslip for ${month} is ready`),

  /* ── 11. Welcome — Subscription ── */
  welcomeSubscription: (name: string, plan: string, features: string[], dashboardUrl: string) => {
    const planColors: Record<string, { bg: string; accent: string; badge: string }> = {
      starter:    { bg: "linear-gradient(135deg,#4f46e5,#6366f1)", accent: "#818cf8", badge: "🚀 Starter Plan" },
      pro:        { bg: "linear-gradient(135deg,#7c3aed,#a78bfa)", accent: "#a78bfa", badge: "⭐ Professional Plan" },
      enterprise: { bg: "linear-gradient(135deg,#1e1b4b,#4f46e5)", accent: "#c4b5fd", badge: "💎 Enterprise Plan" },
      custom:     { bg: "linear-gradient(135deg,#065f46,#059669)", accent: "#34d399", badge: "✦ Custom Plan" },
    };
    const key = plan.toLowerCase().replace("professional","pro");
    const c = planColors[key] || planColors.starter;
    const featureRows = features.map(f => `
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;">
          <span style="display:inline-flex;align-items:center;gap:10px;">
            <span style="width:22px;height:22px;border-radius:50%;background:#ede9fe;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="10" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5.5L4.5 9 11 1" stroke="#4f46e5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <span style="font-size:14px;color:#334155;font-weight:500;">${f}</span>
          </span>
        </td>
      </tr>
    `).join("");

    return baseTemplate(`
      <!-- Hero -->
      <div style="background:${c.bg};padding:36px 40px;text-align:center;margin:-40px -40px 32px;">
        <div style="font-size:13px;font-weight:800;color:rgba(255,255,255,.7);letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;">${c.badge}</div>
        <h1 style="font-size:28px;font-weight:900;color:#ffffff;margin:0 0 10px;line-height:1.2;">Welcome to Finova! 🎉</h1>
        <p style="font-size:15px;color:rgba(255,255,255,.75);margin:0;">Your subscription is active and ready to use.</p>
      </div>

      <p>Hi <strong>${name}</strong>,</p>
      <p>We're thrilled to have you on board! Your <span style="color:${c.accent};font-weight:700;">${plan.charAt(0).toUpperCase()+plan.slice(1).toLowerCase().replace("pro","Professional")}</span> plan is now active. Here's everything included:</p>

      <!-- Features -->
      <div style="background:#f8fafc;border-radius:14px;padding:20px 24px;margin:24px 0;border:1px solid #e2e8f0;">
        <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px;">What's included in your plan</div>
        <table style="width:100%;border-collapse:collapse;">${featureRows}</table>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:32px 0;">
        <a href="${dashboardUrl}" style="display:inline-block;padding:15px 36px;border-radius:12px;background:${c.bg};color:#ffffff!important;font-weight:800;font-size:15px;text-decoration:none;letter-spacing:-.01em;">
          Go to Your Dashboard →
        </a>
      </div>

      <!-- Tips -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:18px 22px;margin:24px 0;">
        <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:8px;">💡 Quick Tips to Get Started</div>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:#78350f;line-height:1.9;">
          <li>Set up your company profile in <strong>Settings</strong></li>
          <li>Add your team members under <strong>Users & Roles</strong></li>
          <li>Create your first sales invoice in <strong>Sales Invoice</strong></li>
          <li>Connect your bank account for reconciliation</li>
        </ul>
      </div>

      <div class="divider"></div>
      <p style="font-size:13px;color:#94a3b8;">Questions? Reply to this email or visit our <a href="${BASE_URL}/support" style="color:#6366f1;">Help Centre</a>. We're always here.</p>
      <p style="font-size:13px;color:#94a3b8;">— The Finova Team ✨</p>
    `, `Welcome to Finova — Your ${plan} plan is active!`);
  },
};
