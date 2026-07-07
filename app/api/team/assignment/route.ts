/**
 * app/api/team/assignment/route.ts
 *
 * GET    /api/team/assignment                          — get assignment rules
 * GET    /api/team/assignment?action=workload          — get team workload stats
 * POST   /api/team/assignment                          — create rule
 * POST   /api/team/assignment?action=assign            — assign entity to team member
 * POST   /api/team/assignment?action=update_load       — update member load
 * PUT    /api/team/assignment?ruleId=                  — update rule
 * DELETE /api/team/assignment?ruleId=                  — delete rule
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/apiError";
import {
  getRules,
  saveRule,
  updateRule,
  deleteRule,
  assignEntity,
  updateWorkload,
  getWorkloadStats,
} from "@/lib/teamAssignment";

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return apiError("x-company-id header required", 400);

    const url        = new URL(req.url);
    const action     = url.searchParams.get("action");
    const entityType = url.searchParams.get("entityType") ?? undefined;

    // ── workload stats ───────────────────────────────────────────────────────
    if (action === "workload") {
      const members = await getWorkloadStats(companyId);
      return apiOk({ members });
    }

    // ── list rules ───────────────────────────────────────────────────────────
    const rules = await getRules(companyId, entityType);
    return apiOk({ rules });
  } catch (err) {
    console.error("[team/assignment GET]", err);
    return apiError("Internal server error", 500);
  }
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return apiError("x-company-id header required", 400);

    const url    = new URL(req.url);
    const action = url.searchParams.get("action");

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    // ── assign entity ────────────────────────────────────────────────────────
    if (action === "assign") {
      const { entityType, entityId, title, requiredSkills, priority } =
        body as Record<string, unknown>;

      if (!entityType) return apiError("entityType is required", 400);
      if (!entityId)   return apiError("entityId is required",   400);
      if (!title)      return apiError("title is required",      400);

      const result = await assignEntity(companyId, {
        entityType:     String(entityType),
        entityId:       String(entityId),
        title:          String(title),
        requiredSkills: Array.isArray(requiredSkills)
          ? (requiredSkills as unknown[]).map(String)
          : undefined,
        priority: priority ? String(priority) : undefined,
      });

      if (!result) {
        return apiError("No active assignment rule found for this entity type, or no available team members", 404);
      }

      return apiOk({ ok: true, ...result });
    }

    // ── update member load ───────────────────────────────────────────────────
    if (action === "update_load") {
      const { userId, delta } = body as Record<string, unknown>;
      if (!userId)                              return apiError("userId is required",           400);
      if (delta === undefined || delta === null) return apiError("delta is required",            400);
      if (typeof Number(delta) !== "number")    return apiError("delta must be a number",        400);

      await updateWorkload(companyId, String(userId), Number(delta));
      return apiOk({ ok: true });
    }

    // ── create rule ──────────────────────────────────────────────────────────
    const { name, type, entityType, teamMembers, active } = body as Record<string, unknown>;

    if (!name)        return apiError("name is required",        400);
    if (!type)        return apiError("type is required",        400);
    if (!entityType)  return apiError("entityType is required",  400);

    const validTypes = ["round_robin", "skill_based", "workload"];
    if (!validTypes.includes(String(type))) {
      return apiError(`type must be one of: ${validTypes.join(", ")}`, 400);
    }

    const members = Array.isArray(teamMembers)
      ? (teamMembers as unknown[]).map((m: unknown) => {
          const member = m as Record<string, unknown>;
          return {
            userId:      String(member.userId   ?? ""),
            name:        String(member.name     ?? ""),
            email:       String(member.email    ?? ""),
            skills:      Array.isArray(member.skills) ? (member.skills as unknown[]).map(String) : [],
            maxLoad:     Number(member.maxLoad  ?? 10),
            currentLoad: Number(member.currentLoad ?? 0),
            lastAssigned: member.lastAssigned ? String(member.lastAssigned) : undefined,
            active:      member.active !== false,
          };
        })
      : [];

    const rule = await saveRule(companyId, {
      companyId,
      name:        String(name),
      type:        String(type) as "round_robin" | "skill_based" | "workload",
      entityType:  String(entityType),
      teamMembers: members,
      active:      active !== undefined ? Boolean(active) : true,
    });

    return apiOk({ ok: true, rule }, 201);
  } catch (err) {
    console.error("[team/assignment POST]", err);
    return apiError("Internal server error", 500);
  }
}

// ---------------------------------------------------------------------------
// PUT
// ---------------------------------------------------------------------------

export async function PUT(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return apiError("x-company-id header required", 400);

    const url    = new URL(req.url);
    const ruleId = url.searchParams.get("ruleId");
    if (!ruleId) return apiError("ruleId query param required", 400);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const { name, type, entityType, teamMembers, active } = body as Record<string, unknown>;

    const patch: Parameters<typeof updateRule>[2] = {};
    if (name        !== undefined) patch.name       = String(name);
    if (type        !== undefined) patch.type       = String(type) as "round_robin" | "skill_based" | "workload";
    if (entityType  !== undefined) patch.entityType = String(entityType);
    if (active      !== undefined) patch.active     = Boolean(active);

    if (teamMembers !== undefined && Array.isArray(teamMembers)) {
      patch.teamMembers = (teamMembers as unknown[]).map((m: unknown) => {
        const member = m as Record<string, unknown>;
        return {
          userId:      String(member.userId   ?? ""),
          name:        String(member.name     ?? ""),
          email:       String(member.email    ?? ""),
          skills:      Array.isArray(member.skills) ? (member.skills as unknown[]).map(String) : [],
          maxLoad:     Number(member.maxLoad  ?? 10),
          currentLoad: Number(member.currentLoad ?? 0),
          lastAssigned: member.lastAssigned ? String(member.lastAssigned) : undefined,
          active:      member.active !== false,
        };
      });
    }

    const updated = await updateRule(ruleId, companyId, patch);
    if (!updated) return apiError("Rule not found or no changes", 404);

    return apiOk({ ok: true, rule: updated });
  } catch (err) {
    console.error("[team/assignment PUT]", err);
    return apiError("Internal server error", 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return apiError("x-company-id header required", 400);

    const url    = new URL(req.url);
    const ruleId = url.searchParams.get("ruleId");
    if (!ruleId) return apiError("ruleId query param required", 400);

    await deleteRule(ruleId, companyId);
    return apiOk({ ok: true, ruleId });
  } catch (err) {
    console.error("[team/assignment DELETE]", err);
    return apiError("Internal server error", 500);
  }
}
