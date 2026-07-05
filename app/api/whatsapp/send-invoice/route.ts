import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import { getCompanyCommsConfig } from "@/lib/companyCommsConfig";
import { formatPhone } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { phone, invoiceNo, customerName, pdfBase64 } = await req.json();

    if (!phone) return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    if (!pdfBase64) return NextResponse.json({ error: "PDF data required" }, { status: 400 });

    const config = await getCompanyCommsConfig(companyId);
    if (!config.whatsapp.enabled || !config.whatsapp.token || !config.whatsapp.phoneId) {
      return NextResponse.json({ error: "WhatsApp not configured" }, { status: 400 });
    }

    const { token, phoneId, apiVersion = "v18.0" } = config.whatsapp;
    const to = formatPhone(phone);

    // Upload PDF to Meta media API
    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const blob = new Blob([pdfBuffer], { type: "application/pdf" });
    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("type", "application/pdf");
    formData.append("file", blob, `invoice-${invoiceNo}.pdf`);

    const uploadRes = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneId}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) {
      return NextResponse.json({ error: uploadData?.error?.message || "Media upload failed" }, { status: 500 });
    }

    const mediaId = uploadData.id;

    // Send document message
    const msgRes = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "document",
        document: {
          id: mediaId,
          caption: `Invoice ${invoiceNo} — ${customerName}`,
          filename: `invoice-${invoiceNo}.pdf`,
        },
      }),
    });

    const msgData = await msgRes.json();
    if (!msgRes.ok) {
      return NextResponse.json({ error: msgData?.error?.message || "Failed to send WhatsApp message" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
