// FILE: lib/emailTemplates.ts
// All FinovaOS email templates — HTML branded emails
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
  <title>FinovaOS</title>
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
        © ${new Date().getFullYear()} FinovaOS · <a href="${BASE_URL}/legal/privacy" style="color:#6366f1;">Privacy Policy</a> · <a href="${BASE_URL}/legal/terms" style="color:#6366f1;">Terms</a>
      </p>
      <p style="font-size:11px;color:#cbd5e1;margin:0;">
        You're receiving this email because you signed up for FinovaOS.<br>
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
      <p>Welcome to FinovaOS! Enter this code to verify your email and activate your account.</p>
      <div class="otp-box">
        <div style="font-size:12px;font-weight:700;color:#64748b;letter-spacing:.1em;margin-bottom:8px;">YOUR VERIFICATION CODE</div>
        <div class="otp-code">${code}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:8px;">Valid for 15 minutes</div>
      </div>
      <p>If you didn't create a FinovaOS account, you can safely ignore this email.</p>
      <div class="divider"></div>
      <p style="font-size:13px;color:#94a3b8;">For security, never share this code with anyone — FinovaOS will never ask for it.</p>
    `, `Your FinovaOS verification code is ${code}`),

  /* ── 2. Welcome Email ── */
  welcome: (user: { name: string; email: string }, plan: string, companyName: string) =>
    baseTemplate(`
      <h1>Welcome to FinovaOS, ${user.name.split(" ")[0]}! 🎉</h1>
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
    `, `Your FinovaOS workspace is ready — let's get started`),

  /* ── 3. Password Reset ── */
  passwordReset: (user: { name: string }, resetUrl: string) =>
    baseTemplate(`
      <h1>Reset your password</h1>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>We received a request to reset your FinovaOS password. Click the button below to set a new password.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${resetUrl}" class="btn">Reset Password →</a>
      </div>
      <p style="font-size:13px;color:#94a3b8;">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
      <div class="divider"></div>
      <p style="font-size:12px;color:#94a3b8;">If the button doesn't work, copy and paste this link:<br>
        <a href="${resetUrl}" style="color:#6366f1;word-break:break-all;">${resetUrl}</a>
      </p>
    `, "Reset your FinovaOS password"),

  /* ── 4. Team Invite ── */
  teamInvite: (inviter: string, companyName: string, role: string, inviteUrl: string) =>
    baseTemplate(`
      <h1>You've been invited to join ${companyName}</h1>
      <p><strong>${inviter}</strong> has invited you to collaborate on <strong>${companyName}</strong>'s FinovaOS workspace as a <span class="tag">${role}</span>.</p>
      <p>FinovaOS is a cloud accounting platform that helps businesses manage invoices, inventory, payroll, and more.</p>
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:24px 0;border:1px solid #e2e8f0;">
        <div style="font-size:13px;color:#64748b;margin-bottom:8px;">YOU'VE BEEN INVITED TO</div>
        <div style="font-size:18px;font-weight:800;color:#0f172a;">${companyName}</div>
        <div style="font-size:13px;color:#4f46e5;font-weight:600;margin-top:4px;">Role: ${role}</div>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${inviteUrl}" class="btn">Accept Invitation →</a>
      </div>
      <p style="font-size:13px;color:#94a3b8;">This invitation expires in 7 days. If you don't know ${inviter}, you can ignore this email.</p>
    `, `${inviter} invited you to join ${companyName} on FinovaOS`),

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
    `, `Your FinovaOS ${plan} plan is now active`),

  /* ── 8. Email Broadcast (admin sends to users) ── */
  broadcast: (subject: string, body: string, _companyName = "FinovaOS") =>
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
      <p style="font-size:13px;color:#94a3b8;">— The FinovaOS Team</p>
    `, "We received your message — FinovaOS"),

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

  /* ── 11. Welcome — Subscription (Country-Aware) ── */
  welcomeSubscription: (name: string, plan: string, features: string[], dashboardUrl: string, country?: string) => {

    /* ── Plan styling ── */
    const planColors: Record<string, { bg: string; accent: string; badge: string; badgeBg: string }> = {
      starter:    { bg: "linear-gradient(135deg,#4338ca,#6366f1)", accent: "#818cf8", badge: "🚀 Starter Plan",      badgeBg: "rgba(99,102,241,.18)" },
      pro:        { bg: "linear-gradient(135deg,#6d28d9,#a78bfa)", accent: "#c4b5fd", badge: "⭐ Professional Plan", badgeBg: "rgba(167,139,250,.18)" },
      enterprise: { bg: "linear-gradient(135deg,#1e1b4b,#4f46e5)", accent: "#e0e7ff", badge: "💎 Enterprise Plan",   badgeBg: "rgba(199,210,254,.12)" },
      custom:     { bg: "linear-gradient(135deg,#064e3b,#059669)", accent: "#6ee7b7", badge: "✦ Custom Plan",        badgeBg: "rgba(52,211,153,.12)" },
    };
    const planKey = plan.toLowerCase().replace("professional","pro");
    const c = planColors[planKey] || planColors.starter;
    const planLabel = planKey === "pro" ? "Professional" : planKey.charAt(0).toUpperCase() + planKey.slice(1);

    /* ── Country config ── */
    const cc = (country || "").toUpperCase();
    type CountryProfile = {
      flag: string; greeting: string; currency: string; taxLabel: string;
      taxTips: string[]; supportNote: string; localTips: string[];
    };
    const GULF = ["AE","SA","QA","KW","BH","OM"];
    const countryProfile = (): CountryProfile => {
      if (cc === "PK") return {
        flag: "🇵🇰",
        greeting: "خوش آمدید! Welcome",
        currency: "PKR",
        taxLabel: "FBR / Tax Compliance",
        taxTips: [
          "Set your base currency to <strong>PKR</strong> in Settings → Company",
          "Enable <strong>SRB / FBR tax</strong> in tax settings for compliant invoices",
          "Add your <strong>NTN number</strong> to your company profile",
        ],
        supportNote: "Support available via WhatsApp & email · Pakistan Standard Time (UTC+5)",
        localTips: [
          "Use <strong>Sales Invoice</strong> to bill customers in PKR",
          "Add your bank accounts (HBL, MCB, UBL, etc.) for reconciliation",
          "Set up <strong>multi-branch</strong> if you have multiple outlets",
          "Use <strong>Expense Tracking</strong> to monitor daily business costs",
        ],
      };
      if (GULF.includes(cc)) return {
        flag: cc === "AE" ? "🇦🇪" : cc === "SA" ? "🇸🇦" : cc === "QA" ? "🇶🇦" : "🌍",
        greeting: "أهلاً وسهلاً! Welcome",
        currency: cc === "AE" ? "AED" : cc === "SA" ? "SAR" : cc === "QA" ? "QAR" : "USD",
        taxLabel: "VAT Compliance (5%)",
        taxTips: [
          `Set your currency to <strong>${cc === "AE" ? "AED" : cc === "SA" ? "SAR" : "local currency"}</strong> in Settings → Company`,
          "Enable <strong>VAT (5%)</strong> in tax settings — required for GCC businesses",
          "Add your <strong>TRN (Tax Registration Number)</strong> to company profile",
        ],
        supportNote: "Support available via email & live chat · Gulf Standard Time (UTC+4)",
        localTips: [
          "Configure <strong>VAT 5%</strong> on all taxable items",
          "Use <strong>multi-currency</strong> for USD / EUR international transactions",
          "Add all bank accounts including local UAE/KSA banks",
          "Enable <strong>Arabic language</strong> on invoices in Settings",
        ],
      };
      if (cc === "IN") return {
        flag: "🇮🇳",
        greeting: "स्वागत है! Welcome",
        currency: "INR",
        taxLabel: "GST Compliance",
        taxTips: [
          "Set your base currency to <strong>INR</strong> in Settings → Company",
          "Configure <strong>GST (CGST / SGST / IGST)</strong> in tax settings",
          "Add your <strong>GSTIN</strong> to company profile for compliant invoices",
        ],
        supportNote: "Support available via email · India Standard Time (UTC+5:30)",
        localTips: [
          "Set up <strong>HSN/SAC codes</strong> on your products and services",
          "Use <strong>Sales Invoice</strong> with GST calculations built in",
          "Connect your bank account for automated reconciliation",
          "Generate <strong>GSTR reports</strong> from the Reports section",
        ],
      };
      if (cc === "GB") return {
        flag: "🇬🇧",
        greeting: "Welcome",
        currency: "GBP",
        taxLabel: "UK VAT & Making Tax Digital",
        taxTips: [
          "Set your base currency to <strong>GBP</strong> in Settings → Company",
          "Enable <strong>VAT (20%)</strong> in tax settings for MTD compliance",
          "Add your <strong>VAT Registration Number</strong> to company profile",
        ],
        supportNote: "Support available via email · GMT / BST timezone",
        localTips: [
          "Set up <strong>UK VAT rates</strong> (Standard 20%, Reduced 5%, Zero-rated)",
          "Use <strong>Making Tax Digital</strong> compatible reports",
          "Connect your UK bank account for automated reconciliation",
          "Add team members and set roles under <strong>Users & Roles</strong>",
        ],
      };
      if (cc === "US" || cc === "CA") return {
        flag: cc === "CA" ? "🇨🇦" : "🇺🇸",
        greeting: "Welcome",
        currency: cc === "CA" ? "CAD" : "USD",
        taxLabel: cc === "CA" ? "CRA / HST / GST" : "US Sales Tax & IRS",
        taxTips: [
          `Set your base currency to <strong>${cc === "CA" ? "CAD" : "USD"}</strong> in Settings → Company`,
          cc === "CA"
            ? "Configure <strong>HST / GST / PST</strong> rates per province in tax settings"
            : "Set up <strong>state sales tax rates</strong> in tax settings",
          "Add your <strong>EIN / Business Number</strong> to company profile",
        ],
        supportNote: "Support available via email & live chat · US/CA timezones",
        localTips: [
          "Use the <strong>Chart of Accounts</strong> aligned with GAAP standards",
          "Connect your bank account for automated reconciliation",
          `Generate <strong>${cc === "CA" ? "CRA-ready" : "IRS-ready"}</strong> financial reports`,
          "Add your team with role-based permissions under <strong>Users & Roles</strong>",
        ],
      };
      /* Default / Global */
      return {
        flag: "🌍",
        greeting: "Welcome",
        currency: "USD",
        taxLabel: "Tax & Compliance",
        taxTips: [
          "Set your base <strong>currency</strong> in Settings → Company",
          "Configure applicable <strong>tax rates</strong> in tax settings",
          "Add your <strong>tax registration number</strong> to company profile",
        ],
        supportNote: "Support available via email & live chat",
        localTips: [
          "Set up your <strong>company profile</strong> in Settings",
          "Add your team under <strong>Users & Roles</strong>",
          "Create your first <strong>Sales Invoice</strong>",
          "Connect your <strong>bank account</strong> for reconciliation",
        ],
      };
    };

    const cp = countryProfile();

    /* ── Feature checklist ── */
    const featureRows = features.map(f => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
          <span style="display:inline-flex;align-items:center;gap:10px;">
            <span style="width:22px;height:22px;border-radius:50%;background:#ede9fe;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="10" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5.5L4.5 9 11 1" stroke="#4f46e5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <span style="font-size:14px;color:#334155;font-weight:500;">${f}</span>
          </span>
        </td>
      </tr>
    `).join("");

    /* ── Tips list helper ── */
    const tipsList = (tips: string[]) => tips.map(t => `
      <li style="padding:6px 0;font-size:13px;color:#475569;line-height:1.7;">${t}</li>
    `).join("");

    return baseTemplate(`
      <!-- Hero banner -->
      <div style="background:${c.bg};padding:40px 40px 36px;text-align:center;margin:-40px -40px 36px;position:relative;">
        <div style="display:inline-block;padding:5px 16px;border-radius:20px;background:${c.badgeBg};border:1px solid rgba(255,255,255,.2);font-size:12px;font-weight:800;color:rgba(255,255,255,.9);letter-spacing:.08em;text-transform:uppercase;margin-bottom:14px;">${c.badge}</div>
        <h1 style="font-size:30px;font-weight:900;color:#ffffff;margin:0 0 10px;line-height:1.2;letter-spacing:-.5px;">
          ${cp.flag} ${cp.greeting}!
        </h1>
        <p style="font-size:15px;color:rgba(255,255,255,.75);margin:0 0 20px;">Your <strong style="color:#fff;">${planLabel} Plan</strong> is active and ready to use.</p>
        <a href="${dashboardUrl}" style="display:inline-block;padding:13px 32px;border-radius:10px;background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.4);color:#ffffff!important;font-weight:800;font-size:14px;text-decoration:none;letter-spacing:.01em;">
          Open My Dashboard →
        </a>
      </div>

      <!-- Greeting -->
      <p style="font-size:16px;color:#1e293b;">Hi <strong>${name}</strong>,</p>
      <p>Thank you for choosing <strong>FinovaOS</strong> — the accounting and business management platform built for growing companies worldwide. Your <span style="color:#4f46e5;font-weight:700;">${planLabel} Plan</span> is now active.</p>

      <!-- Plan features -->
      <div style="background:#f8fafc;border-radius:14px;padding:22px 26px;margin:28px 0;border:1px solid #e2e8f0;">
        <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;margin-bottom:16px;">✦ What's Included in Your Plan</div>
        <table style="width:100%;border-collapse:collapse;">${featureRows}</table>
      </div>

      <!-- Country-specific tax setup -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:20px 24px;margin:24px 0;">
        <div style="font-size:13px;font-weight:800;color:#166534;margin-bottom:12px;">🏛️ ${cp.taxLabel} — Setup for ${cp.flag}</div>
        <ul style="margin:0;padding-left:18px;">
          ${tipsList(cp.taxTips)}
        </ul>
      </div>

      <!-- Getting started tips -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:20px 24px;margin:24px 0;">
        <div style="font-size:13px;font-weight:800;color:#92400e;margin-bottom:12px;">🚀 5 Steps to Get Started</div>
        <ol style="margin:0;padding-left:20px;">
          <li style="padding:5px 0;font-size:13px;color:#78350f;line-height:1.7;">Go to <strong>Settings → Company</strong> — add your logo, address, and set currency to <strong>${cp.currency}</strong></li>
          ${tipsList(cp.localTips)}
        </ol>
      </div>

      <!-- Support info -->
      <div style="background:#f8fafc;border-radius:12px;padding:18px 22px;margin:24px 0;border:1px solid #e2e8f0;display:flex;align-items:center;gap:14px;">
        <div style="font-size:28px;">💬</div>
        <div>
          <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:4px;">Need help getting started?</div>
          <div style="font-size:12px;color:#64748b;">${cp.supportNote}</div>
          <div style="margin-top:8px;">
            <a href="${BASE_URL}/support" style="font-size:12px;color:#4f46e5;font-weight:700;text-decoration:none;">Visit Help Centre →</a>
            &nbsp;&nbsp;
            <a href="mailto:support@finovaos.app" style="font-size:12px;color:#4f46e5;font-weight:700;text-decoration:none;">Email Support →</a>
          </div>
        </div>
      </div>

      <!-- Footer note -->
      <div class="divider"></div>
      <p style="font-size:13px;color:#94a3b8;text-align:center;">
        You subscribed to FinovaOS ${planLabel} Plan.<br>
        Manage your subscription anytime from <a href="${dashboardUrl}/subscriptions" style="color:#6366f1;">Dashboard → Subscription</a>.
      </p>
      <p style="font-size:14px;color:#475569;text-align:center;margin-top:8px;">— The FinovaOS Team ✨</p>
    `, `Welcome to FinovaOS ${planLabel} — Your account is active!`);
  },
};
