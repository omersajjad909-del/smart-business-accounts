/**
 * What happens to a prospect after discovery: a call, a WhatsApp, a reply, a
 * "not interested". The pipeline stops at a drafted email; this is the part
 * that carries a conversation into the CRM.
 *
 * No schema change: the log lives in the prospect's `enrichment` JSON, and the
 * handoff creates an ordinary Lead row so the existing Leads / CRM pages work
 * on it unchanged.
 */

import { prisma } from "@/lib/prisma";
import { addSuppression } from "./sending";
import { COUNTRY_NAMES } from "./discovery";

const db = prisma as any;

export const PROSPECT_ACTIONS = ["contacted", "replied", "interested", "not_interested", "do_not_contact"] as const;
export type ProspectAction = (typeof PROSPECT_ACTIONS)[number];

export const CONTACT_CHANNELS = ["call", "whatsapp", "email", "visit"] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export type ActivityEntry = {
  at: string;
  action: ProspectAction;
  channel: ContactChannel | null;
  note: string | null;
  by: string | null;
};

const MAX_ACTIVITY = 50;

/** Statuses after which nothing further should be done to the prospect. */
const FINAL = new Set(["opted_out"]);

export type ActionResult = {
  status: string;
  leadId: string | null;
  createdLead: boolean;
};

export class ProspectActionError extends Error {
  constructor(message: string, public httpStatus = 400) {
    super(message);
  }
}

function readActivity(enrichment: unknown): ActivityEntry[] {
  const list = (enrichment as { activity?: unknown } | null)?.activity;
  return Array.isArray(list) ? (list as ActivityEntry[]) : [];
}

export async function applyProspectAction(
  prospectId: string,
  action: ProspectAction,
  options: { channel?: ContactChannel | null; note?: string | null; by?: string | null } = {},
): Promise<ActionResult> {
  const prospect = await db.prospectCompany.findUnique({
    where: { id: prospectId },
    include: { campaign: { select: { id: true, name: true } }, contacts: true },
  });
  if (!prospect) throw new ProspectActionError("Prospect not found.", 404);
  if (FINAL.has(prospect.status)) {
    throw new ProspectActionError("This company asked not to be contacted. Nothing more can be recorded.", 409);
  }

  const note = options.note ? String(options.note).trim().slice(0, 500) : null;
  const channel = options.channel && CONTACT_CHANNELS.includes(options.channel) ? options.channel : null;

  let status = prospect.status as string;
  let leadId = (prospect.leadId as string | null) ?? null;
  let createdLead = false;

  if (action === "contacted") {
    // Do not walk a conversation backwards: a company that already replied
    // stays "replied" if someone also logs a follow-up call.
    if (!["replied", "lost"].includes(status)) status = "contacted";
  }

  if (action === "replied") {
    status = "replied";
    // Mirror it on the drafted email so the review/queue stats agree.
    await db.outreachEmail.updateMany({
      where: { prospectId, status: "sent" },
      data: { status: "replied", repliedAt: new Date() },
    }).catch(() => {});
  }

  if (action === "interested") {
    status = "replied";

    // Idempotent: pressing it twice must not create two leads.
    if (!leadId) {
      const primary = prospect.contacts.find((c: any) => c.isPrimary) || prospect.contacts[0] || null;
      const email = primary?.email ? String(primary.email).toLowerCase() : null;
      if (!email && !prospect.phone) {
        throw new ProspectActionError("This company has no email or phone, so it cannot become a lead.");
      }

      const lead = await db.lead.create({
        data: {
          name: primary?.name || prospect.name,
          email,
          phone: prospect.phone || primary?.phone || null,
          company: prospect.name,
          source: "outreach",
          status: "contacted",
          priority: prospect.tier === "A" ? "high" : "medium",
          // The Leads page filters on the country name, so store "Pakistan", not "PK".
          country: (prospect.country && (COUNTRY_NAMES[prospect.country] || prospect.country)) || null,
          followUpAt: new Date(Date.now() + 2 * 86_400_000),
          message: note,
          notes: [
            `From AI Prospecting campaign "${prospect.campaign?.name || prospect.campaignId}".`,
            [prospect.city, prospect.country].filter(Boolean).join(", ") || null,
            prospect.website ? `Website: ${prospect.website}` : null,
            prospect.score != null ? `Fit score: ${prospect.score}${prospect.tier ? ` (tier ${prospect.tier})` : ""}` : null,
            channel ? `Reached by: ${channel}` : null,
            note ? `Note: ${note}` : null,
          ].filter(Boolean).join("\n"),
        },
      });
      leadId = lead.id;
      createdLead = true;
    }
  }

  if (action === "not_interested") {
    status = "lost";
  }

  if (action === "do_not_contact") {
    status = "opted_out";
    // Block every address we hold for them, so no later campaign mails them.
    for (const contact of prospect.contacts) {
      await addSuppression(contact.email, "manual", note || "Asked not to be contacted (recorded by admin).");
    }
  }

  const entry: ActivityEntry = {
    at: new Date().toISOString(),
    action,
    channel,
    note,
    by: options.by ?? null,
  };
  const enrichment = {
    ...((prospect.enrichment as Record<string, unknown>) || {}),
    activity: [...readActivity(prospect.enrichment), entry].slice(-MAX_ACTIVITY),
  };

  await db.prospectCompany.update({
    where: { id: prospectId },
    data: {
      status,
      leadId,
      enrichment,
      rejectReason: action === "not_interested" || action === "do_not_contact"
        ? (note || (action === "do_not_contact" ? "Asked not to be contacted." : "Not interested."))
        : prospect.rejectReason,
    },
  });

  return { status, leadId, createdLead };
}
