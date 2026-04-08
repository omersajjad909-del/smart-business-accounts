import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const salonFont = "'Outfit','Inter',sans-serif";
export const salonBg = "rgba(255,255,255,.03)";
export const salonBorder = "rgba(255,255,255,.07)";
export const salonMuted = "rgba(255,255,255,.55)";

export const stylistSpecialties = ["Hair Styling", "Coloring", "Makeup", "Nails", "Skincare", "Threading", "Spa"];
export const salonServiceCategories = ["Hair", "Skin", "Nails", "Threading", "Makeup", "Spa"];

export type SalonAppointmentStatus = "booked" | "confirmed" | "in_progress" | "completed" | "cancelled";
export type SalonStaffStatus = "Active" | "On Leave" | "Inactive";
export type SalonServiceStatus = "Active" | "Inactive";

export type SalonAppointment = {
  id: string;
  apptNo: string;
  client: string;
  phone: string;
  stylist: string;
  service: string;
  duration: number;
  price: number;
  date: string;
  time: string;
  status: SalonAppointmentStatus;
};

export type SalonStylist = {
  id: string;
  stylistId: string;
  name: string;
  specialization: string;
  status: SalonStaffStatus;
  phone: string;
  appointmentsToday: number;
  monthlyEarnings: number;
};

export type SalonService = {
  id: string;
  serviceId: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  status: SalonServiceStatus;
  popular: boolean;
};

export type SalonControlCenter = {
  summary: {
    appointments: number;
    appointmentsToday: number;
    openQueue: number;
    completedAppointments: number;
    cancellationRate: number;
    stylists: number;
    activeStylists: number;
    leaveStylists: number;
    services: number;
    activeServices: number;
    popularServices: number;
    completedRevenue: number;
  };
  appointments: SalonAppointment[];
  stylists: SalonStylist[];
  services: SalonService[];
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

export function salonStatusColor(status: string) {
  const colors: Record<string, string> = {
    booked: "#f59e0b",
    confirmed: "#60a5fa",
    in_progress: "#a78bfa",
    completed: "#34d399",
    cancelled: "#f87171",
    Active: "#34d399",
    "On Leave": "#f59e0b",
    Inactive: "#6b7280",
  };
  return colors[status] || "#a78bfa";
}

export function salonStatusLabel(status: string) {
  const labels: Record<string, string> = {
    booked: "Booked",
    confirmed: "Confirmed",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function mapSalonAppointments(records: BusinessRecord[]): SalonAppointment[] {
  return records.map((record) => ({
    id: record.id,
    apptNo: String(record.data?.apptNo || `SA-${record.id.slice(-6).toUpperCase()}`),
    client: record.title,
    phone: String(record.data?.phone || ""),
    stylist: String(record.data?.stylist || ""),
    service: String(record.data?.service || ""),
    duration: Number(record.data?.duration || 60),
    price: Number(record.amount || 0),
    date: String(record.date || todayIso()).slice(0, 10),
    time: String(record.data?.time || "09:00"),
    status: (record.status as SalonAppointmentStatus) || "booked",
  }));
}

export function mapSalonStylists(records: BusinessRecord[]): SalonStylist[] {
  return records.map((record) => ({
    id: record.id,
    stylistId: String(record.data?.stylistId || `STY-${record.id.slice(-6).toUpperCase()}`),
    name: record.title,
    specialization: String(record.data?.specialization || "Hair Styling"),
    status: (record.status as SalonStaffStatus) || "Active",
    phone: String(record.data?.phone || ""),
    appointmentsToday: Number(record.data?.appointmentsToday || 0),
    monthlyEarnings: Number(record.amount || record.data?.monthlyEarnings || 0),
  }));
}

export function mapSalonServices(records: BusinessRecord[]): SalonService[] {
  return records.map((record) => ({
    id: record.id,
    serviceId: String(record.data?.serviceId || `SVC-${record.id.slice(-6).toUpperCase()}`),
    name: record.title,
    category: String(record.data?.category || "Hair"),
    duration: Number(record.data?.duration || 0),
    price: Number(record.amount || record.data?.price || 0),
    status: (record.status as SalonServiceStatus) || "Active",
    popular: Boolean(record.data?.popular),
  }));
}
