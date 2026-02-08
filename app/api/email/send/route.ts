import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailTemplates } from "@/lib/email";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.VIEW_REPORTS,
      companyId
    );

    if (!allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await req.json();
    const { type, invoiceId, to, subject, message } = body;

    if (!type || !to) {
      return NextResponse.json(
        { error: 'Type and recipient email are required' },
        { status: 400 }
      );
    }

    let html = '';
    let emailSubject = subject || '';

    // Handle different email types
    if (type === 'sales-invoice' && invoiceId) {
      const invoice = await prisma.salesInvoice.findFirst({
        where: { id: invoiceId, companyId },
        include: {
          customer: true,
          items: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!invoice) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }

      html = emailTemplates.salesInvoice(invoice, invoice.customer);
      emailSubject = subject || `Sales Invoice ${invoice.invoiceNo} - US Traders`;
    } else if (type === 'purchase-invoice' && invoiceId) {
      const invoice = await prisma.purchaseInvoice.findFirst({
        where: { id: invoiceId, companyId },
        include: {
          supplier: true,
          items: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!invoice) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }

      html = emailTemplates.purchaseInvoice(invoice, invoice.supplier);
      emailSubject = subject || `Purchase Invoice ${invoice.invoiceNo} - US Traders`;
    } else if (type === "purchase-order" && invoiceId) {

  const po = await prisma.purchaseOrder.findFirst({
    where: { id: invoiceId, companyId },
    include: {
      supplier: true,
      items: {
        include: { item: true },
      },
    },
  });

  if (!po) {
    return NextResponse.json(
      { error: "Purchase Order not found" },
      { status: 404 }
    );
  }

  html = emailTemplates.purchaseOrder(po, po.supplier);
  emailSubject = subject || `Purchase Order ${po.poNo} - US Traders`;

    } else if (type === 'custom' && message) {
      html = emailTemplates.report(subject || 'Message from US Traders', message, 'custom');
      emailSubject = subject || 'Message from US Traders';
    } else {
      return NextResponse.json(
        { error: 'Invalid email type or missing data' },
        { status: 400 }
      );
    }

    const recipients = Array.isArray(to) ? to.join(", ") : to;

    const result = await sendEmail({
      to: Array.isArray(to) ? to : [to],
      subject: emailSubject,
      html,
    });

    if (!result.success) {
      await prisma.activityLog.create({
        data: {
          action: "EMAIL_SEND_FAILED",
          details: `type=${type}, to=${recipients}, error=${result.error || "Unknown error"}`,
          userId: userId || null,
          companyId,
        },
      });

      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    await prisma.activityLog.create({
      data: {
        action: "EMAIL_SENT",
        details: `type=${type}, to=${recipients}, subject=${emailSubject}`,
        userId: userId || null,
        companyId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error('❌ Email send API error:', error);

    try {
      const userId = req.headers.get("x-user-id");
      const companyId = await resolveCompanyId(req);
      if (companyId) {
        await prisma.activityLog.create({
          data: {
            action: "EMAIL_SEND_FAILED",
            details: error.message || "Unhandled email send error",
            userId: userId || null,
            companyId,
          },
        });
      }
    } catch (logError) {
      console.error("❌ Failed to log email send error:", logError);
    }

    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}

