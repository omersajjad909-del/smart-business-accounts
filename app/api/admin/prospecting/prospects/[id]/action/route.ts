import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";
import {
  applyProspectAction,
  ProspectActionError,
  PROSPECT_ACTIONS,
  CONTACT_CHANNELS,
  type ProspectAction,
  type ContactChannel,
} from "@/lib/prospecting/activity";

export const runtime = "nodejs";

/** Records what happened with a prospect: called, replied, interested, not interested, do-not-contact. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const action = String(body.action || "") as ProspectAction;
    if (!PROSPECT_ACTIONS.includes(action)) {
      return NextResponse.json({ error: `action must be one of: ${PROSPECT_ACTIONS.join(", ")}` }, { status: 400 });
    }
    const channel = body.channel ? (String(body.channel) as ContactChannel) : null;
    if (channel && !CONTACT_CHANNELS.includes(channel)) {
      return NextResponse.json({ error: `channel must be one of: ${CONTACT_CHANNELS.join(", ")}` }, { status: 400 });
    }

    const result = await applyProspectAction(id, action, {
      channel,
      note: body.note ? String(body.note) : null,
      by: admin.email,
    });

    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "PROSPECT_ACTION",
      targetType: "ProspectCompany",
      targetId: id,
      details: { action, channel, ...result },
    });

    return NextResponse.json(result);
  } catch (e: any) {
    if (e instanceof ProspectActionError) return NextResponse.json({ error: e.message }, { status: e.httpStatus });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
