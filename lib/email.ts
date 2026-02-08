import nodemailer from 'nodemailer';

// Email configuration from environment variables
const getEmailConfig = () => {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  };
};

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!transporter) {
    const config = getEmailConfig();
    if (!config.auth.user || !config.auth.pass) {
      console.warn('⚠️ Email not configured. Set SMTP_USER and SMTP_PASS in .env');
      return null;
    }
    transporter = nodemailer.createTransport(config);
  }
  return transporter;
};

// Email templates
export const emailTemplates = {
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
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: string | Buffer }>;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const transport = getTransporter();
  
  if (!transport) {
    return {
      success: false,
      error: 'Email not configured. Please set SMTP_USER and SMTP_PASS in .env file.',
    };
  }

  try {
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@ustraders.com';
    
    const info = await transport.sendMail({
      from: `"US Traders" <${fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('❌ Email send error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

// Test email configuration
export async function testEmailConfig(): Promise<{ success: boolean; message: string }> {
  const transport = getTransporter();
  
  if (!transport) {
    return {
      success: false,
      message: 'Email not configured. Set SMTP_USER and SMTP_PASS in .env',
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
