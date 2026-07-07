/**
 * lib/teamAssignment.ts
 * Smart team assignment for tasks, leads, and support tickets.
 *
 * AssignmentRule table schema:
 *   id, companyId, name, type (round_robin|skill_based|workload),
 *   teamMembers (JSON), entityType (lead|ticket|task), active, createdAt
 */

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  skills: string[];
  maxLoad: number;
  currentLoad: number;
  lastAssigned?: string;
  active: boolean;
}

export interface AssignmentRule {
  id: string;
  companyId: string;
  name: string;
  type: "round_robin" | "skill_based" | "workload";
  teamMembers: TeamMember[];
  entityType: string;
  active: boolean;
}

export interface AssignmentResult {
  assignedTo: TeamMember;
  ruleId: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Table bootstrap
// ---------------------------------------------------------------------------

export async function ensureAssignmentTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AssignmentRule" (
      "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "companyId"    TEXT NOT NULL,
      "name"         TEXT NOT NULL DEFAULT '',
      "type"         TEXT NOT NULL DEFAULT 'round_robin',
      "teamMembers"  JSONB NOT NULL DEFAULT '[]',
      "entityType"   TEXT NOT NULL DEFAULT 'task',
      "active"       BOOLEAN NOT NULL DEFAULT true,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AssignmentRule_companyId_entityType"
      ON "AssignmentRule" ("companyId", "entityType", "active")
  `);
}

// ---------------------------------------------------------------------------
// CRUD helpers
// ---------------------------------------------------------------------------

export async function getRules(
  companyId: string,
  entityType?: string,
): Promise<AssignmentRule[]> {
  await ensureAssignmentTable();

  const rows = entityType
    ? await prisma.$queryRaw<Array<{ id: string; companyId: string; name: string; type: string; teamMembers: unknown; entityType: string; active: boolean }>>`
        SELECT "id", "companyId", "name", "type", "teamMembers", "entityType", "active"
        FROM "AssignmentRule"
        WHERE "companyId"  = ${companyId}
          AND "entityType" = ${entityType}
        ORDER BY "name" ASC
      `
    : await prisma.$queryRaw<Array<{ id: string; companyId: string; name: string; type: string; teamMembers: unknown; entityType: string; active: boolean }>>`
        SELECT "id", "companyId", "name", "type", "teamMembers", "entityType", "active"
        FROM "AssignmentRule"
        WHERE "companyId" = ${companyId}
        ORDER BY "name" ASC
      `;

  return rows.map((r) => ({
    ...r,
    type: r.type as AssignmentRule["type"],
    teamMembers: parseMembers(r.teamMembers),
  }));
}

export async function saveRule(
  companyId: string,
  rule: Omit<AssignmentRule, "id">,
): Promise<AssignmentRule> {
  await ensureAssignmentTable();

  const membersJson = JSON.stringify(rule.teamMembers);

  const rows = await prisma.$queryRaw<Array<{ id: string; companyId: string; name: string; type: string; teamMembers: unknown; entityType: string; active: boolean }>>`
    INSERT INTO "AssignmentRule"
      ("companyId", "name", "type", "teamMembers", "entityType", "active")
    VALUES
      (${companyId}, ${rule.name}, ${rule.type}, ${membersJson}::jsonb, ${rule.entityType}, ${rule.active})
    RETURNING "id", "companyId", "name", "type", "teamMembers", "entityType", "active"
  `;

  const r = rows[0];
  return { ...r, type: r.type as AssignmentRule["type"], teamMembers: parseMembers(r.teamMembers) };
}

export async function updateRule(
  ruleId: string,
  companyId: string,
  patch: Partial<Omit<AssignmentRule, "id" | "companyId">>,
): Promise<AssignmentRule | null> {
  await ensureAssignmentTable();

  // Build update fields dynamically
  const setClauses: string[] = [];
  const params: unknown[]    = [];
  let   idx                  = 1;

  if (patch.name !== undefined) {
    setClauses.push(`"name" = $${idx++}`);
    params.push(patch.name);
  }
  if (patch.type !== undefined) {
    setClauses.push(`"type" = $${idx++}`);
    params.push(patch.type);
  }
  if (patch.teamMembers !== undefined) {
    setClauses.push(`"teamMembers" = $${idx++}::jsonb`);
    params.push(JSON.stringify(patch.teamMembers));
  }
  if (patch.entityType !== undefined) {
    setClauses.push(`"entityType" = $${idx++}`);
    params.push(patch.entityType);
  }
  if (patch.active !== undefined) {
    setClauses.push(`"active" = $${idx++}`);
    params.push(patch.active);
  }

  if (setClauses.length === 0) return null;

  params.push(ruleId, companyId);

  const sql = `
    UPDATE "AssignmentRule"
    SET ${setClauses.join(", ")}
    WHERE "id" = $${idx++} AND "companyId" = $${idx++}
    RETURNING "id", "companyId", "name", "type", "teamMembers", "entityType", "active"
  `;

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; companyId: string; name: string; type: string; teamMembers: unknown; entityType: string; active: boolean }>>(sql, ...params);

  if (!rows[0]) return null;
  const r = rows[0];
  return { ...r, type: r.type as AssignmentRule["type"], teamMembers: parseMembers(r.teamMembers) };
}

export async function deleteRule(ruleId: string, companyId: string): Promise<void> {
  await ensureAssignmentTable();
  await prisma.$executeRawUnsafe(
    `DELETE FROM "AssignmentRule" WHERE "id" = $1 AND "companyId" = $2`,
    ruleId,
    companyId,
  );
}

// ---------------------------------------------------------------------------
// Assignment logic
// ---------------------------------------------------------------------------

export async function assignEntity(
  companyId: string,
  entity: {
    entityType: string;
    entityId: string;
    title: string;
    requiredSkills?: string[];
    priority?: string;
  },
): Promise<AssignmentResult | null> {
  await ensureAssignmentTable();

  // Find active rule for this entityType
  const rules = await getRules(companyId, entity.entityType);
  const rule  = rules.find((r) => r.active);
  if (!rule) return null;

  const activeMembers = rule.teamMembers.filter((m) => m.active);
  if (activeMembers.length === 0) return null;

  let chosen: TeamMember | null = null;
  let reason = "";

  switch (rule.type) {
    case "round_robin": {
      // Find member who was assigned longest ago (or never)
      const sorted = [...activeMembers].sort((a, b) => {
        const aTime = a.lastAssigned ? new Date(a.lastAssigned).getTime() : 0;
        const bTime = b.lastAssigned ? new Date(b.lastAssigned).getTime() : 0;
        return aTime - bTime;
      });
      chosen = sorted[0];
      reason = "round_robin rotation";
      break;
    }

    case "workload": {
      // Assign to member with lowest current load who hasn't exceeded maxLoad
      const eligible = activeMembers.filter((m) => m.currentLoad < m.maxLoad);
      const pool     = eligible.length > 0 ? eligible : activeMembers;
      chosen = pool.reduce((best, m) => (m.currentLoad < best.currentLoad ? m : best), pool[0]);
      reason = `lowest workload (${chosen.currentLoad}/${chosen.maxLoad})`;
      break;
    }

    case "skill_based": {
      const required = entity.requiredSkills ?? [];
      if (required.length > 0) {
        // Score members by number of matching skills
        const scored = activeMembers
          .map((m) => ({
            member: m,
            matches: required.filter((s) => m.skills.includes(s)).length,
          }))
          .filter((s) => s.matches > 0)
          .sort((a, b) => {
            // Primary: most skill matches; secondary: lowest load
            if (b.matches !== a.matches) return b.matches - a.matches;
            return a.member.currentLoad - b.member.currentLoad;
          });

        if (scored.length > 0) {
          chosen = scored[0].member;
          reason = `skill match (${scored[0].matches}/${required.length} skills)`;
        }
      }

      // Fallback: lowest workload
      if (!chosen) {
        const pool  = activeMembers.filter((m) => m.currentLoad < m.maxLoad);
        const final = pool.length > 0 ? pool : activeMembers;
        chosen = final.reduce((best, m) => (m.currentLoad < best.currentLoad ? m : best), final[0]);
        reason = "skill_based fallback — lowest workload";
      }
      break;
    }

    default:
      return null;
  }

  if (!chosen) return null;

  const now = new Date().toISOString();

  // Update the chosen member's lastAssigned and currentLoad in the rule's teamMembers JSON
  const updatedMembers = rule.teamMembers.map((m) =>
    m.userId === chosen!.userId
      ? { ...m, lastAssigned: now, currentLoad: m.currentLoad + 1 }
      : m,
  );

  await prisma.$executeRawUnsafe(
    `UPDATE "AssignmentRule" SET "teamMembers" = $1::jsonb WHERE "id" = $2`,
    JSON.stringify(updatedMembers),
    rule.id,
  );

  // Log the assignment
  await prisma.$queryRaw`
    INSERT INTO "ActivityLog" ("companyId", "action", "details")
    VALUES (
      ${companyId},
      'ENTITY_ASSIGNED',
      ${JSON.stringify({
        entityType:  entity.entityType,
        entityId:    entity.entityId,
        title:       entity.title,
        assignedTo:  chosen.userId,
        assigneeName: chosen.name,
        ruleId:      rule.id,
        reason,
        assignedAt:  now,
      })}
    )
  `.catch((err) => console.error("[teamAssignment] ActivityLog error:", err));

  // Notify the assigned member
  await notifyAssignment(chosen, entity, reason).catch((err) =>
    console.error("[teamAssignment] notify error:", err),
  );

  return { assignedTo: { ...chosen, lastAssigned: now, currentLoad: chosen.currentLoad + 1 }, ruleId: rule.id, reason };
}

// ---------------------------------------------------------------------------
// Workload management
// ---------------------------------------------------------------------------

export async function updateWorkload(
  companyId: string,
  userId: string,
  delta: number,
): Promise<void> {
  await ensureAssignmentTable();

  const rules = await getRules(companyId);

  for (const rule of rules) {
    const hasMember = rule.teamMembers.some((m) => m.userId === userId);
    if (!hasMember) continue;

    const updatedMembers = rule.teamMembers.map((m) =>
      m.userId === userId
        ? { ...m, currentLoad: Math.max(0, m.currentLoad + delta) }
        : m,
    );

    await prisma.$executeRawUnsafe(
      `UPDATE "AssignmentRule" SET "teamMembers" = $1::jsonb WHERE "id" = $2`,
      JSON.stringify(updatedMembers),
      rule.id,
    );
  }
}

export async function getWorkloadStats(companyId: string): Promise<TeamMember[]> {
  await ensureAssignmentTable();

  const rules = await getRules(companyId);

  // Merge members across rules — deduplicate by userId, keeping highest load
  const memberMap = new Map<string, TeamMember>();

  for (const rule of rules) {
    for (const member of rule.teamMembers) {
      const existing = memberMap.get(member.userId);
      if (!existing || member.currentLoad > existing.currentLoad) {
        memberMap.set(member.userId, member);
      }
    }
  }

  return Array.from(memberMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

async function notifyAssignment(
  member: TeamMember,
  entity: { entityType: string; entityId: string; title: string },
  reason: string,
): Promise<void> {
  const subject  = `[FinovaOS] New ${entity.entityType} assigned to you: ${entity.title}`;
  const smsText  = `[FinovaOS] Hi ${member.name}, a new ${entity.entityType} "${entity.title}" has been assigned to you. (${reason})`;
  const htmlBody = buildAssignmentEmail(member, entity, reason);

  await Promise.allSettled([
    member.email
      ? sendEmail({ to: member.email, subject, html: htmlBody })
      : Promise.resolve(),
  ]);

  // SMS only if member has a phone (TeamMember doesn't store phone, so skip unless extended)
  // sendSms would be called here if phone were available
}

function buildAssignmentEmail(
  member: TeamMember,
  entity: { entityType: string; entityId: string; title: string },
  reason: string,
): string {
  const entityTypeLabel = entity.entityType.charAt(0).toUpperCase() + entity.entityType.slice(1);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1e293b;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;padding:36px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 40px rgba(15,23,42,.10);">
  <tr>
    <td style="background:#0f172a;padding:26px 36px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="vertical-align:middle;">
            <div style="font-size:20px;font-weight:800;color:#ffffff;">FinovaOS</div>
          </td>
          <td align="right" style="vertical-align:middle;">
            <span style="background:#6366f1;color:#ffffff;padding:5px 14px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">New Assignment</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:36px;">
      <p style="font-size:15px;margin:0 0 16px;">Hi <strong>${member.name}</strong>,</p>
      <p style="font-size:14px;color:#475569;margin:0 0 24px;">A new ${entityTypeLabel.toLowerCase()} has been assigned to you via the auto-assignment system.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border-radius:10px;padding:20px;margin:0 0 24px;">
        <tr>
          <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Type</td>
          <td style="font-size:14px;font-weight:600;color:#1e293b;text-align:right;">${entityTypeLabel}</td>
        </tr>
        <tr><td colspan="2" style="height:8px;"></td></tr>
        <tr>
          <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Title</td>
          <td style="font-size:14px;font-weight:600;color:#6366f1;text-align:right;">${entity.title}</td>
        </tr>
        <tr><td colspan="2" style="height:8px;"></td></tr>
        <tr>
          <td style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Assigned Via</td>
          <td style="font-size:14px;font-weight:600;color:#1e293b;text-align:right;">${reason}</td>
        </tr>
      </table>
      <p style="font-size:13px;color:#64748b;margin:0;">Please log in to FinovaOS to review and action this ${entityTypeLabel.toLowerCase()}.</p>
    </td>
  </tr>
  <tr>
    <td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0;text-align:center;">
      <div style="font-size:11px;color:#94a3b8;">Sent via <strong style="color:#6366f1;">FinovaOS</strong> &nbsp;·&nbsp; finovaos.app</div>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseMembers(raw: unknown): TeamMember[] {
  if (Array.isArray(raw)) return raw as TeamMember[];
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as TeamMember[]; } catch { return []; }
  }
  return [];
}
