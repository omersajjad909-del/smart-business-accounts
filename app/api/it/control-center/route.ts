import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

function normalizeRole(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

export async function GET(req: NextRequest) {
  const role = normalizeRole(req.headers.get("x-user-role"));
  if (!["ADMIN", "ACCOUNTANT", "VIEWER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const [projectRecords, sprintRecords, contractRecords, ticketRecords] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "it_project" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "sprint" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "contract" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "support_ticket" }, orderBy: { createdAt: "desc" } }),
  ]);

  const projects = projectRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      projectId: String(data.projectId || record.id),
      name: record.title,
      client: String(data.client || ""),
      techStack: Array.isArray(data.techStack) ? data.techStack.map(String) : [],
      teamSize: Number(data.teamSize || 0),
      startDate: String(record.date || data.startDate || ""),
      deadline: String(data.deadline || ""),
      progress: Number(data.progress || 0),
      budget: Number(record.amount || data.budget || 0),
      spent: Number(data.spent || 0),
      status: String(record.status || "Active"),
    };
  });

  const sprints = sprintRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      sprintId: String(data.sprintId || record.id),
      projectName: String(data.projectName || ""),
      name: record.title,
      start: String(record.date || data.start || ""),
      end: String(data.end || ""),
      total: Number(data.total || 0),
      completed: Number(data.completed || 0),
      inProgress: Number(data.inProgress || 0),
      blocked: Number(data.blocked || 0),
      velocity: Number(data.velocity || 0),
      status: String(record.status || "Active"),
      team: Array.isArray(data.team) ? data.team.map(String) : [],
    };
  });

  const contracts = contractRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      contractId: String(data.contractId || record.id),
      client: record.title,
      project: String(data.project || ""),
      type: String(data.type || "Fixed Price"),
      value: Number(record.amount || data.value || 0),
      start: String(record.date || data.start || ""),
      end: String(data.end || ""),
      payment: String(data.payment || "Monthly"),
      status: String(record.status || "Active"),
      mrr: Number(data.mrr || 0),
    };
  });

  const tickets = ticketRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      ticketId: String(data.ticketId || record.id),
      title: record.title,
      client: String(data.client || ""),
      project: String(data.project || ""),
      priority: String(data.priority || "Medium"),
      category: String(data.category || "General"),
      created: String(record.date || data.created || ""),
      assigned: String(data.assigned || ""),
      updated: String(data.updated || ""),
      status: String(record.status || "Open"),
    };
  });

  return NextResponse.json({
    summary: {
      projects: projects.length,
      activeProjects: projects.filter((item) => item.status === "Active").length,
      averageProgress: projects.length ? Math.round(projects.reduce((sum, item) => sum + item.progress, 0) / projects.length) : 0,
      sprints: sprints.length,
      activeSprints: sprints.filter((item) => item.status === "Active").length,
      contracts: contracts.length,
      activeContractValue: contracts.filter((item) => item.status === "Active").reduce((sum, item) => sum + item.value, 0),
      activeMrr: contracts.filter((item) => item.status === "Active").reduce((sum, item) => sum + item.mrr, 0),
      tickets: tickets.length,
      openTickets: tickets.filter((item) => !["Resolved", "Closed"].includes(item.status)).length,
      criticalTickets: tickets.filter((item) => item.priority === "Critical" && !["Resolved", "Closed"].includes(item.status)).length,
    },
    projects,
    sprints,
    contracts,
    tickets,
  });
}
