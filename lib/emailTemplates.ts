// FILE: lib/emailTemplates.ts
// Billing & subscription email templates for FinovaOS
// Usage: import { emailTemplates } from "@/lib/emailTemplates"

export const emailTemplates = {
  /**
   * Welcome email for new subscription
   */
  welcomeSubscription: (
    userName: string,
    planCode: string,
    features: string[],
    dashboardUrl: string,
    country: string = "GLOBAL"
  ): string => {
    const planInfo = getPlanInfo(planCode, country);
    const brandColor = "#2563EB";
    const accentColor = "#1E40AF";
    const lightBg = "#F8FAFC";
    const borderColor = "#E2E8F0";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to FinovaOS</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1E293B;
            background-color: #F1F5F9;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.07);
        }
        .header {
            background: linear-gradient(135deg, ${brandColor} 0%, ${accentColor} 100%);
            padding: 40px 20px;
            text-align: center;
            color: white;
        }
        .header-logo { font-size: 28px; font-weight: 800; margin-bottom: 10px; letter-spacing: -1px; }
        .header-subtitle { font-size: 14px; opacity: 0.9; }
        .content { padding: 40px; }
        .greeting { font-size: 22px; font-weight: 700; margin-bottom: 20px; color: #0F172A; }
        .intro-text { font-size: 15px; color: #475569; margin-bottom: 30px; line-height: 1.8; }
        .plan-card {
            background: ${lightBg};
            border: 2px solid ${borderColor};
            border-radius: 8px;
            padding: 24px;
            margin: 30px 0;
        }
        .plan-name { font-size: 18px; font-weight: 700; color: ${accentColor}; margin-bottom: 8px; }
        .plan-price { font-size: 32px; font-weight: 800; color: ${brandColor}; margin-bottom: 4px; }
        .plan-billing { font-size: 13px; color: #64748B; margin-bottom: 20px; }
        .features-title {
            font-size: 14px; font-weight: 700; color: #0F172A;
            margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .features-list { list-style: none; }
        .features-list li {
            font-size: 14px; color: #475569; margin-bottom: 10px;
            padding-left: 24px; position: relative;
        }
        .features-list li:before {
            content: "✓"; position: absolute; left: 0;
            color: ${brandColor}; font-weight: 800;
        }
        .cta-section { text-align: center; margin: 40px 0; }
        .cta-button {
            display: inline-block; background: ${brandColor}; color: white;
            padding: 14px 48px; border-radius: 8px; text-decoration: none;
            font-weight: 600; font-size: 15px;
        }
        .next-steps {
            background: ${lightBg}; border-left: 4px solid ${brandColor};
            border-radius: 6px; padding: 20px; margin: 30px 0;
        }
        .next-steps-title { font-weight: 700; color: #0F172A; margin-bottom: 12px; font-size: 14px; }
        .next-steps-list { list-style: none; counter-reset: item; }
        .next-steps-list li {
            font-size: 14px; color: #475569; margin-bottom: 8px;
            counter-increment: item; padding-left: 28px; position: relative;
        }
        .next-steps-list li:before {
            content: counter(item); position: absolute; left: 0; top: -2px;
            background: ${brandColor}; color: white; width: 20px; height: 20px;
            border-radius: 50%; display: flex; align-items: center;
            justify-content: center; font-size: 12px; font-weight: 700;
        }
        .support-section {
            background: white; border: 1px solid ${borderColor};
            border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;
        }
        .support-title { font-weight: 700; color: #0F172A; margin-bottom: 8px; font-size: 14px; }
        .support-text { font-size: 14px; color: #64748B; margin-bottom: 12px; }
        .support-link { color: ${brandColor}; text-decoration: none; font-weight: 600; }
        .divider { height: 1px; background: ${borderColor}; margin: 30px 0; }
        .footer {
            background: #F8FAFC; padding: 30px 40px; text-align: center;
            border-top: 1px solid ${borderColor};
        }
        .footer-text { font-size: 12px; color: #64748B; margin-bottom: 16px; }
        .footer-links { font-size: 12px; margin-bottom: 16px; }
        .footer-links a { color: ${brandColor}; text-decoration: none; margin: 0 8px; }
        .social-links { margin-top: 16px; }
        .social-links a {
            display: inline-block; width: 32px; height: 32px; margin: 0 6px;
            background: ${lightBg}; border-radius: 50%; text-decoration: none;
            color: ${brandColor}; font-weight: 700; line-height: 32px;
            text-align: center; font-size: 14px;
        }
        @media (max-width: 600px) {
            .container { border-radius: 0; }
            .content { padding: 24px; }
            .greeting { font-size: 18px; }
            .plan-price { font-size: 24px; }
            .header { padding: 30px 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-logo">✦ FinovaOS</div>
            <div class="header-subtitle">AI-Powered Accounting Platform</div>
        </div>
        <div class="content">
            <div class="greeting">Welcome to FinovaOS, ${userName}! 🎉</div>
            <div class="intro-text">
                Your ${planInfo.displayName} plan is now active. You're all set to start managing your
                business finances with intelligence and ease.
            </div>
            <div class="plan-card">
                <div class="plan-name">${planInfo.displayName} Plan</div>
                <div class="plan-price">${planInfo.priceDisplay}</div>
                <div class="plan-billing">${planInfo.billingText}</div>
                <div class="features-title">What's Included:</div>
                <ul class="features-list">
                    ${features.map(f => `<li>${f}</li>`).join("")}
                </ul>
            </div>
            <div class="cta-section">
                <a href="${dashboardUrl}" class="cta-button">Go to Dashboard →</a>
            </div>
            <div class="next-steps">
                <div class="next-steps-title">Next Steps:</div>
                <ol class="next-steps-list">
                    <li>Log in to your FinovaOS dashboard</li>
                    <li>Connect your bank accounts (optional)</li>
                    <li>Import your first invoice or transaction</li>
                    <li>Explore AI features for business insights</li>
                </ol>
            </div>
            <div class="support-section">
                <div class="support-title">🚀 Pro Tips:</div>
                <div class="support-text">
                    • Use our AI Chat for instant accounting help<br>
                    • Set up bank sync for automated reconciliation<br>
                    • Create custom reports for your business needs
                </div>
            </div>
            <div class="divider"></div>
            <div class="support-section">
                <div class="support-title">Need Help?</div>
                <div class="support-text">Our support team is here to help you get the most out of FinovaOS.</div>
                <a href="https://finovaos.app/support" class="support-link">Visit Help Center →</a>
            </div>
        </div>
        <div class="footer">
            <div class="footer-text">You're receiving this because you just subscribed to FinovaOS.</div>
            <div class="footer-links">
                <a href="https://finovaos.app/privacy">Privacy Policy</a>
                <a href="https://finovaos.app/terms">Terms of Service</a>
                <a href="https://finovaos.app/contact">Contact Us</a>
            </div>
            <div class="social-links">
                <a href="https://linkedin.com/company/finova-forge">in</a>
                <a href="https://twitter.com/finovoas">𝕏</a>
                <a href="https://facebook.com/finovoas">f</a>
            </div>
            <div class="footer-text" style="margin-top:16px;">
                © ${new Date().getFullYear()} Finova Forge. All rights reserved.<br>
                Faisalabad, Pakistan | <a href="https://finovaos.app" style="color:${brandColor};">finovaos.app</a>
            </div>
        </div>
    </div>
</body>
</html>`;
  },

  /**
   * Payment confirmation email — sent on successful charge
   */
  paymentConfirmation: (
    userName: string,
    planCode: string,
    amount: number,
    currency: string,
    nextBillingDate: string,
    invoiceUrl: string,
    dashboardUrl: string
  ): string => {
    const planInfo = getPlanInfo(planCode);
    const brandColor = "#2563EB";
    const accentColor = "#1E40AF";
    const successColor = "#10B981";
    const lightBg = "#F8FAFC";
    const borderColor = "#E2E8F0";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Received - FinovaOS</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; color: #1E293B; background-color: #F1F5F9;
        }
        .container {
            max-width: 600px; margin: 0 auto; background: white;
            border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);
        }
        .header {
            background: linear-gradient(135deg, ${successColor} 0%, #059669 100%);
            padding: 40px 20px; text-align: center; color: white;
        }
        .header-icon { font-size: 48px; margin-bottom: 12px; }
        .header-title { font-size: 24px; font-weight: 700; }
        .content { padding: 40px; }
        .greeting { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: #0F172A; }
        .invoice-box {
            background: ${lightBg}; border: 2px solid ${borderColor};
            border-radius: 8px; padding: 24px; margin: 30px 0;
        }
        .invoice-row {
            display: flex; justify-content: space-between;
            margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid ${borderColor};
        }
        .invoice-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .invoice-label { font-size: 14px; color: #64748B; }
        .invoice-value { font-weight: 600; color: #0F172A; }
        .invoice-total {
            background: white; padding: 16px; border-radius: 6px;
            display: flex; justify-content: space-between; margin-top: 12px;
        }
        .total-label { font-size: 16px; font-weight: 700; color: #0F172A; }
        .total-amount { font-size: 24px; font-weight: 800; color: ${successColor}; }
        .status-badge {
            display: inline-block; background: ${successColor}; color: white;
            padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 20px 0;
        }
        .button-group { text-align: center; margin: 30px 0; }
        .button {
            display: inline-block; padding: 12px 32px; margin: 0 8px;
            border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;
        }
        .button-primary { background: ${brandColor}; color: white; }
        .button-secondary { background: ${lightBg}; color: ${brandColor}; border: 2px solid ${borderColor}; }
        .footer {
            background: ${lightBg}; padding: 30px 40px; text-align: center;
            border-top: 1px solid ${borderColor};
        }
        .footer-text { font-size: 12px; color: #64748B; }
        @media (max-width: 600px) {
            .content { padding: 24px; }
            .button { display: block; margin: 8px 0; width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-icon">✓</div>
            <div class="header-title">Payment Received</div>
        </div>
        <div class="content">
            <div class="greeting">Thank you, ${userName}!</div>
            <p style="font-size:15px;color:#475569;margin-bottom:20px;">
                Your payment has been successfully processed. Your ${planInfo.displayName} plan is active and ready to use.
            </p>
            <div class="status-badge">✓ Payment Confirmed</div>
            <div class="invoice-box">
                <div class="invoice-row">
                    <span class="invoice-label">Plan</span>
                    <span class="invoice-value">${planInfo.displayName}</span>
                </div>
                <div class="invoice-row">
                    <span class="invoice-label">Amount</span>
                    <span class="invoice-value">${currency} ${amount.toFixed(2)}</span>
                </div>
                <div class="invoice-row">
                    <span class="invoice-label">Payment Date</span>
                    <span class="invoice-value">${new Date().toLocaleDateString("en-GB")}</span>
                </div>
                <div class="invoice-row">
                    <span class="invoice-label">Next Billing</span>
                    <span class="invoice-value">${nextBillingDate}</span>
                </div>
                <div class="invoice-total">
                    <span class="total-label">Total Paid</span>
                    <span class="total-amount">${currency} ${amount.toFixed(2)}</span>
                </div>
            </div>
            <div class="button-group">
                <a href="${dashboardUrl}" class="button button-primary">Go to Dashboard</a>
                <a href="${invoiceUrl}" class="button button-secondary">Download Invoice</a>
            </div>
            <p style="font-size:14px;color:#64748B;margin-top:20px;">
                Your subscription will automatically renew on <strong>${nextBillingDate}</strong>.
                You can manage your subscription anytime from your account dashboard.
            </p>
        </div>
        <div class="footer">
            <div class="footer-text">
                Questions? <a href="https://finovaos.app/support" style="color:${brandColor};">Contact our support team</a>.
            </div>
            <div class="footer-text" style="margin-top:12px;">
                © ${new Date().getFullYear()} Finova Forge | <a href="https://finovaos.app" style="color:${brandColor};">finovaos.app</a>
            </div>
        </div>
    </div>
</body>
</html>`;
  },

  /**
   * Payment failed email — sent when charge fails
   */
  paymentFailed: (
    userName: string,
    planCode: string,
    amount: number,
    currency: string,
    retryDate: string,
    updatePaymentUrl: string
  ): string => {
    const planInfo = getPlanInfo(planCode);
    const warningColor = "#DC2626";
    const lightBg = "#F8FAFC";
    const borderColor = "#E2E8F0";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Failed - Action Required</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; color: #1E293B; background-color: #F1F5F9;
        }
        .container {
            max-width: 600px; margin: 0 auto; background: white;
            border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);
        }
        .header {
            background: linear-gradient(135deg, ${warningColor} 0%, #991B1B 100%);
            padding: 40px 20px; text-align: center; color: white;
        }
        .header-icon { font-size: 48px; margin-bottom: 12px; }
        .header-title { font-size: 24px; font-weight: 700; }
        .content { padding: 40px; }
        .greeting { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: #0F172A; }
        .alert-box {
            background: #FEE2E2; border-left: 4px solid ${warningColor};
            border-radius: 6px; padding: 20px; margin: 20px 0;
        }
        .alert-title { font-weight: 700; color: ${warningColor}; margin-bottom: 8px; }
        .alert-text { font-size: 14px; color: #7F1D1D; }
        .info-box {
            background: ${lightBg}; border: 1px solid ${borderColor};
            border-radius: 8px; padding: 20px; margin: 20px 0;
        }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
        .info-row:last-child { margin-bottom: 0; }
        .info-label { color: #64748B; font-size: 14px; }
        .info-value { font-weight: 600; color: #0F172A; }
        .cta-button {
            display: block; background: ${warningColor}; color: white;
            padding: 14px 32px; border-radius: 8px; text-decoration: none;
            font-weight: 600; text-align: center; margin: 30px 0;
        }
        .footer {
            background: ${lightBg}; padding: 30px 40px; text-align: center;
            border-top: 1px solid ${borderColor};
        }
        .footer-text { font-size: 12px; color: #64748B; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-icon">⚠</div>
            <div class="header-title">Payment Failed</div>
        </div>
        <div class="content">
            <div class="greeting">Hi ${userName},</div>
            <div class="alert-box">
                <div class="alert-title">Action Required</div>
                <div class="alert-text">
                    We couldn't process your payment. Please update your billing information to avoid service interruption.
                </div>
            </div>
            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">Plan</span>
                    <span class="info-value">${planInfo.displayName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Amount</span>
                    <span class="info-value">${currency} ${amount.toFixed(2)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Retry Date</span>
                    <span class="info-value">${retryDate}</span>
                </div>
            </div>
            <a href="${updatePaymentUrl}" class="cta-button">Update Payment Method →</a>
            <p style="font-size:14px;color:#64748B;">
                <strong>What happens next?</strong><br>
                We'll automatically retry your payment on ${retryDate}. If you update your payment method before then, we'll charge you immediately.
            </p>
            <p style="font-size:14px;color:#64748B;margin-top:16px;">
                If this issue persists, please <a href="https://finovaos.app/support" style="color:${warningColor};font-weight:600;">contact our support team</a>.
            </p>
        </div>
        <div class="footer">
            <div class="footer-text">
                © ${new Date().getFullYear()} Finova Forge | <a href="https://finovaos.app" style="color:${warningColor};">finovaos.app</a>
            </div>
        </div>
    </div>
</body>
</html>`;
  },

  /**
   * Plan upgraded email
   */
  planUpgraded: (
    userName: string,
    oldPlan: string,
    newPlan: string,
    newFeatures: string[],
    dashboardUrl: string
  ): string => {
    const oldPlanInfo = getPlanInfo(oldPlan);
    const newPlanInfo = getPlanInfo(newPlan);
    const brandColor = "#2563EB";
    const successColor = "#10B981";
    const lightBg = "#F8FAFC";
    const borderColor = "#E2E8F0";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Plan Upgraded - FinovaOS</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; color: #1E293B; background-color: #F1F5F9;
        }
        .container {
            max-width: 600px; margin: 0 auto; background: white;
            border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);
        }
        .header {
            background: linear-gradient(135deg, ${successColor} 0%, #059669 100%);
            padding: 40px 20px; text-align: center; color: white;
        }
        .header-icon { font-size: 48px; margin-bottom: 12px; }
        .header-title { font-size: 24px; font-weight: 700; }
        .content { padding: 40px; }
        .greeting { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: #0F172A; }
        .upgrade-badge {
            display: inline-block; background: ${successColor}; color: white;
            padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 20px 0;
        }
        .plan-comparison { background: ${lightBg}; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .comparison-row {
            display: flex; justify-content: space-between;
            padding: 12px 0; border-bottom: 1px solid ${borderColor};
        }
        .comparison-row:last-child { border-bottom: none; }
        .plan-label { color: #64748B; font-size: 14px; }
        .old-plan { color: #94A3B8; text-decoration: line-through; }
        .new-plan { color: ${successColor}; font-weight: 700; }
        .new-features {
            background: ${lightBg}; border-left: 4px solid ${successColor};
            border-radius: 6px; padding: 20px; margin: 20px 0;
        }
        .features-title { font-weight: 700; color: #0F172A; margin-bottom: 12px; }
        .features-list { list-style: none; }
        .features-list li {
            font-size: 14px; color: #475569; margin-bottom: 8px;
            padding-left: 20px; position: relative;
        }
        .features-list li:before { content: "→"; position: absolute; left: 0; color: ${successColor}; font-weight: 700; }
        .cta-button {
            display: block; background: ${brandColor}; color: white;
            padding: 14px 32px; border-radius: 8px; text-decoration: none;
            font-weight: 600; text-align: center; margin: 30px 0;
        }
        .footer {
            background: ${lightBg}; padding: 30px 40px; text-align: center;
            border-top: 1px solid ${borderColor};
        }
        .footer-text { font-size: 12px; color: #64748B; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-icon">🎉</div>
            <div class="header-title">Plan Upgraded!</div>
        </div>
        <div class="content">
            <div class="greeting">Welcome to ${newPlanInfo.displayName}, ${userName}!</div>
            <div class="upgrade-badge">✓ Upgrade Successful</div>
            <div class="plan-comparison">
                <div class="comparison-row">
                    <span class="plan-label">Previous Plan</span>
                    <span class="old-plan">${oldPlanInfo.displayName}</span>
                </div>
                <div class="comparison-row">
                    <span class="plan-label">New Plan</span>
                    <span class="new-plan">${newPlanInfo.displayName}</span>
                </div>
            </div>
            <div class="new-features">
                <div class="features-title">New Capabilities Unlocked:</div>
                <ul class="features-list">
                    ${newFeatures.map(f => `<li>${f}</li>`).join("")}
                </ul>
            </div>
            <a href="${dashboardUrl}" class="cta-button">Explore New Features →</a>
            <p style="font-size:14px;color:#64748B;">
                Your upgrade is effective immediately. Enjoy the enhanced capabilities!
            </p>
        </div>
        <div class="footer">
            <div class="footer-text">
                © ${new Date().getFullYear()} Finova Forge | <a href="https://finovaos.app" style="color:${brandColor};">finovaos.app</a>
            </div>
        </div>
    </div>
</body>
</html>`;
  },
};

function getPlanInfo(planCode: string, _country: string = "GLOBAL"): {
  displayName: string;
  priceDisplay: string;
  billingText: string;
} {
  const plan = String(planCode || "STARTER").toUpperCase();
  const planMap: Record<string, { name: string; price: string; billing: string }> = {
    STARTER:      { name: "Starter",      price: "$49",   billing: "/month (billed monthly)" },
    PROFESSIONAL: { name: "Professional", price: "$99",   billing: "/month (billed monthly)" },
    PRO:          { name: "Professional", price: "$99",   billing: "/month (billed monthly)" },
    ENTERPRISE:   { name: "Enterprise",   price: "Custom", billing: "Contact sales" },
    CUSTOM:       { name: "Custom Plan",  price: "Custom", billing: "Based on requirements" },
  };
  const info = planMap[plan] || planMap.STARTER;
  return { displayName: info.name, priceDisplay: info.price, billingText: info.billing };
}
