import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { getCompanyCommsConfig } from "@/lib/companyCommsConfig";

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
        auth: {
          user: companyConfig.email.user,
          pass: companyConfig.email.pass,
        },
        from: companyConfig.email.from,
        fromName: companyConfig.email.fromName || "FinovaOS",
      };
    }
  }

  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@finovaos.app',
    fromName: "FinovaOS",
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

// Email templates
export const emailTemplates = {
  otp: (user: { name: string; email: string }, code: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .header { background: #4f46e5; color: #fff; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .code { font-size: 28px; letter-spacing: 6px; font-weight: 800; background: #f3f4f6; padding: 14px 18px; border-radius: 10px; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Verify Your Email</h1>
      </div>
      <div class="content">
        <p>Hi ${user.name},</p>
        <p>Use this verification code to continue:</p>
        <div class="code">${code}</div>
        <p style="margin-top:18px;font-size:12px;color:#888">This code expires in 15 minutes.</p>
        <p style="margin-top:22px;font-size:12px;color:#888">If you did not request this, please ignore this email.</p>
      </div>
    </body>
    </html>
  `,
  verification: (user: { name: string; email: string }, link: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .header { background: #4f46e5; color: #fff; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #4f46e5; color: #fff; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Verify Your Email</h1>
      </div>
      <div class="content">
        <p>Hi ${user.name},</p>
        <p>Thank you for signing up! Please verify your email address to activate your account:</p>
        <a href="${link}" class="button">Verify Email</a>
        <p style="margin-top:30px;font-size:12px;color:#888">If you did not sign up, please ignore this email.</p>
      </div>
    </body>
    </html>
  `,
  salesInvoice: (invoice: any, customer: any) => {
    const itemsHtml = invoice.items?.map((item: any) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.item?.name || 'N/A'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.qty}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.rate.toLocaleString()}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.amount.toLocaleString()}</td>
      </tr>
    `).join('') || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #000; color: #fff; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f4f4f4; padding: 10px; border: 1px solid #ddd; text-align: left; }
          .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>US TRADERS</h1>
          <p>SALES INVOICE</p>
        </div>
        <div class="content">
          <p><strong>Invoice No:</strong> ${invoice.invoiceNo}</p>
          <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString()}</p>
          <p><strong>Customer:</strong> ${customer?.name || 'N/A'}</p>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="total">
            <p>Total: ${invoice.total.toLocaleString()}</p>
          </div>
          
          <p style="margin-top: 30px;">Thank you for your business!</p>
        </div>
      </body>
      </html>
    `;
  },

  purchaseOrder: (po: any, supplier: any) => {
  const itemsHtml = po.items?.map((item: any) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">${item.item?.name || "N/A"}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.qty}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">
        ${(item.rate || 0).toLocaleString()}
      </td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">
        ${(item.qty * (item.rate || 0)).toLocaleString()}
      </td>
    </tr>
  `).join("") || "";

  const total = po.items?.reduce(
    (s: number, i: any) => s + i.qty * (i.rate || 0),
    0
  ) || 0;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; color:#333 }
        .header { background:#000;color:#fff;padding:20px;text-align:center }
        table { width:100%; border-collapse:collapse; margin-top:20px }
        th { background:#f4f4f4; padding:10px; border:1px solid #ddd }
        .total { text-align:right; font-size:18px; font-weight:bold; margin-top:20px }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>US TRADERS</h1>
        <p>PURCHASE ORDER</p>
      </div>

      <div style="padding:20px">
        <p><strong>PO No:</strong> ${po.poNo}</p>
        <p><strong>Date:</strong> ${new Date(po.date).toLocaleDateString()}</p>
        <p><strong>Supplier:</strong> ${supplier?.name || "N/A"}</p>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="total">
          Total: ${total.toLocaleString()}
        </div>
      </div>
    </body>
    </html>
  `;
},


  purchaseInvoice: (invoice: any, supplier: any) => {
    const itemsHtml = invoice.items?.map((item: any) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.item?.name || 'N/A'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.qty}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.rate.toLocaleString()}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.amount.toLocaleString()}</td>
      </tr>
    `).join('') || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #000; color: #fff; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f4f4f4; padding: 10px; border: 1px solid #ddd; text-align: left; }
          .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>US TRADERS</h1>
          <p>PURCHASE INVOICE</p>
        </div>
        <div class="content">
          <p><strong>Invoice No:</strong> ${invoice.invoiceNo}</p>
          <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString()}</p>
          <p><strong>Supplier:</strong> ${supplier?.name || 'N/A'}</p>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="total">
            <p>Total: ${invoice.total.toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  report: (title: string, content: string, _reportType: string) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #000; color: #fff; padding: 20px; text-align: center; }
          .content { padding: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>US TRADERS</h1>
          <p>${title}</p>
        </div>
        <div class="content">
          ${content}
        </div>
      </body>
      </html>
    `;
  },
};

// Send email function
// - No companyId  → uses Resend (platform emails: welcome, OTP, billing) for best inbox delivery
// - With companyId → uses company SMTP (their own email for invoices, POs)
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

  // ── SMTP path (company emails with companyId, or Resend not configured) ──
  const { transport, config } = await getTransporter(options.companyId);
  if (!transport) {
    return { success: false, error: 'Email not configured.' };
  }

  try {
    const fromEmail = config.from || config.auth.user || 'noreply@finovaos.app';
    const fromName = config.fromName || "FinovaOS";

    const info = await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toStr,
      subject: options.subject,
      html: options.html,
      ...(options.text ? { text: options.text } : {}),
      attachments: options.attachments,
      headers: {
        'List-Unsubscribe': `<https://finovaos.app/unsubscribe>`,
      },
    });

    prisma.emailLog.create({ data: { to: toStr, subject: options.subject, status: 'sent' } }).catch(() => {});
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Email send error:', error);
    prisma.emailLog.create({ data: { to: toStr, subject: options.subject, status: 'failed', error: error.message } }).catch(() => {});
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

// Test email configuration
export async function testEmailConfig(companyId?: string): Promise<{ success: boolean; message: string }> {
  const { transport } = await getTransporter(companyId);
  
  if (!transport) {
    return {
      success: false,
      message: 'Email not configured for this company',
    };
  }

  try {
    await transport.verify();
    return {
      success: true,
      message: 'Email configuration is valid',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Email configuration test failed',
    };
  }
}
