import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const itFont = "'Outfit','Inter',sans-serif";
export const itBg = "rgba(255,255,255,.03)";
export const itBorder = "rgba(255,255,255,.07)";
export const itMuted = "rgba(255,255,255,.58)";

export type ItProject = {
  id: string;
  projectId: string;
  name: string;
  client: string;
  techStack: string[];
  teamSize: number;
  startDate: string;
  deadline: string;
  progress: number;
  budget: number;
  spent: number;
  status: string;
};

export type ItSprint = {
  id: string;
  sprintId: string;
  projectName: string;
  name: string;
  start: string;
  end: string;
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
  velocity: number;
  status: string;
  team: string[];
};

export type ItContract = {
  id: string;
  contractId: string;
  client: string;
  project: string;
  type: string;
  value: number;
  start: string;
  end: string;
  payment: string;
  status: string;
  mrr: number;
};

export type SupportTicket = {
  id: string;
  ticketId: string;
  title: string;
  client: string;
  project: string;
  priority: string;
  category: string;
  created: string;
  assigned: string;
  updated: string;
  status: string;
};

export type ItControlCenter = {
  summary: {
    projects: number;
    activeProjects: number;
    averageProgress: number;
    sprints: number;
    activeSprints: number;
    contracts: number;
    activeContractValue: number;
    activeMrr: number;
    tickets: number;
    openTickets: number;
    criticalTickets: number;
  };
  projects: ItProject[];
  sprints: ItSprint[];
  contracts: ItContract[];
  tickets: SupportTicket[];
};

export async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export function mapItProjects(records: BusinessRecord[]): ItProject[] {
  return records.map((record) => ({
    id: record.id,
    projectId: String(record.data?.projectId || record.id),
    name: record.title,
    client: String(record.data?.client || ""),
    techStack: Array.isArray(record.data?.techStack) ? record.data.techStack.map(String) : [],
    teamSize: Number(record.data?.teamSize || 0),
    startDate: String(record.date || record.data?.startDate || ""),
    deadline: String(record.data?.deadline || ""),
    progress: Number(record.data?.progress || 0),
    budget: Number(record.amount || record.data?.budget || 0),
    spent: Number(record.data?.spent || 0),
    status: String(record.status || "Active"),
  }));
}

export function mapItSprints(records: BusinessRecord[]): ItSprint[] {
  return records.map((record) => ({
    id: record.id,
    sprintId: String(record.data?.sprintId || record.id),
    projectName: String(record.data?.projectName || ""),
    name: record.title,
    start: String(record.date || record.data?.start || ""),
    end: String(record.data?.end || ""),
    total: Number(record.data?.total || 0),
    completed: Number(record.data?.completed || 0),
    inProgress: Number(record.data?.inProgress || 0),
    blocked: Number(record.data?.blocked || 0),
    velocity: Number(record.data?.velocity || 0),
    status: String(record.status || "Active"),
    team: Array.isArray(record.data?.team) ? record.data.team.map(String) : [],
  }));
}

export function mapItContracts(records: BusinessRecord[]): ItContract[] {
  return records.map((record) => ({
    id: record.id,
    contractId: String(record.data?.contractId || record.id),
    client: record.title,
    project: String(record.data?.project || ""),
    type: String(record.data?.type || "Fixed Price"),
    value: Number(record.amount || record.data?.value || 0),
    start: String(record.date || record.data?.start || ""),
    end: String(record.data?.end || ""),
    payment: String(record.data?.payment || "Monthly"),
    status: String(record.status || "Active"),
    mrr: Number(record.data?.mrr || 0),
  }));
}

export function mapSupportTickets(records: BusinessRecord[]): SupportTicket[] {
  return records.map((record) => ({
    id: record.id,
    ticketId: String(record.data?.ticketId || record.id),
    title: record.title,
    client: String(record.data?.client || ""),
    project: String(record.data?.project || ""),
    priority: String(record.data?.priority || "Medium"),
    category: String(record.data?.category || "General"),
    created: String(record.date || record.data?.created || ""),
    assigned: String(record.data?.assigned || ""),
    updated: String(record.data?.updated || ""),
    status: String(record.status || "Open"),
  }));
}
