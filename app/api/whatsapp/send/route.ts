import { NextRequest, NextResponse } from "next/server";
import { sendWhatsApp, formatPhone } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";

async function getCompanyId(req: NextRequest): Promise<string | null> {
  try {
    const fromHeader = req.headers.get("x-company-id");
    if (fromHeader) return fromHeader;
    const userId = req.headers.get("x-user-id");
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { defaultCompanyId: true } });
      if (user?.defaultCompanyId) return user.defaultCompanyId;
    }
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/sb_auth=([^;]+)/);
    if (match) {
      const raw = decodeURIComponent(match[1]);
      const parts = raw.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
        const cid = payload?.companyId || payload?.defaultCompanyId;
        if (cid) return cid;
      }
    }
    return null;
  } catch { return null; }
}

// POST /api/whatsapp/send
// Body: { to, type, text?, templateName?, templateParams?, languageCode? }
export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { to, type, text, templateName, templateParams, languageCode } = body || {};

    if (!to) return NextResponse.json({ error: "Missing 'to' phone number" }, { status: 400 });
    if (!type || !["text", "template"].includes(type))
      return NextResponse.json({ error: "type must be 'text' or 'template'" }, { status: 400 });

    const formattedTo = formatPhone(String(to));

    const result = await sendWhatsApp(companyId, {
      to: formattedTo,
      type,
      text,
      templateName,
      templateParams,
      languageCode,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    // Log outbound
    await prisma.activityLog.create({
      data: {
        action: "WHATSAPP_OUTBOUND",
        companyId,
        details: JSON.stringify({ to: formattedTo, type, text }),
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

// GET /api/whatsapp/send — get auto-reply config
export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const log = await prisma.activityLog.findFirst({
      where: { action: "WHATSAPP_AUTOREPLY_CONFIG", companyId },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });

    const config = log?.details ? JSON.parse(log.details) : { enabled: false, systemPrompt: "" };
    return NextResponse.json(config);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// PUT /api/whatsapp/send — save auto-reply config
export async function PUT(req: NextRequest) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { enabled, systemPrompt } = body || {};

    await prisma.activityLog.create({
      data: {
        action: "WHATSAPP_AUTOREPLY_CONFIG",
        companyId,
        details: JSON.stringify({ enabled: Boolean(enabled), systemPrompt: systemPrompt || "" }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
