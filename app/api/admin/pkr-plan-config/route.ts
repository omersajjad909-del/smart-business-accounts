import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLAN_DEFAULT_PERMISSIONS } from "@/lib/planPermissions";
import { DASHBOARD_FEATURE_IDS, createDefaultDashboardFeatureFlags } from "@/lib/dashboardFeatureRegistry";

const ADMIN_ONLY = "ADMIN";

// Default PKR prices (in Pakistani Rupees)
export const DEFAULT_PKR_PRICING = {
  starter:    { monthly: 3999,  yearly: 3199  },  // PKR/mo · PKR/mo billed yearly (20% off)
  pro:        { monthly: 8999,  yearly: 7199  },
  enterprise: { monthly: 14999, yearly: 11999 },
};

export const DEFAULT_PKR_SEAT_PRICING = {
  monthly: 999,
  yearly: 799,
};

function normalizePkrPlanPermissions(saved?: Record<string, string[]>) {
  const s = saved || {};
  const hasAny =
    Array.isArray(s.STARTER) || Array.isArray(s.PRO) || Array.isArray(s.ENTERPRISE);

  if (!hasAny) {
    return {
      STARTER:    PLAN_DEFAULT_PERMISSIONS.STARTER,
      PRO:        PLAN_DEFAULT_PERMISSIONS.PRO,
      ENTERPRISE: PLAN_DEFAULT_PERMISSIONS.ENTERPRISE,
      CUSTOM:     [],
    };
  }

  return {
    STARTER:    Array.isArray(s.STARTER)    ? s.STARTER    : [],
    PRO:        Array.isArray(s.PRO)        ? s.PRO        : [],
    ENTERPRISE: Array.isArray(s.ENTERPRISE) ? s.ENTERPRISE : [],
    CUSTOM:     Array.isArray(s.CUSTOM)     ? s.CUSTOM     : [],
  };
}

function normalizeDashboardFeatureFlags(saved?: Record<string, string[]>) {
  const defaults = createDefaultDashboardFeatureFlags();
  const s = saved || {};
  const clean = (list: string[] | undefined, fallback: string[]) =>
    Array.isArray(list) ? list.filter((id) => DASHBOARD_FEATURE_IDS.includes(id)) : fallback;

  return {
    STARTER:    clean(s.STARTER,    defaults.STARTER),
    PRO:        clean(s.PRO,        defaults.PRO),
    ENTERPRISE: clean(s.ENTERPRISE, defaults.ENTERPRISE),
    CUSTOM:     clean(s.CUSTOM,     defaults.CUSTOM),
  };
}

const DEFAULT_CONFIG = {
  pricing:              DEFAULT_PKR_PRICING,
  seatPricing:          DEFAULT_PKR_SEAT_PRICING,
  planPermissions:      normalizePkrPlanPermissions(),
  dashboardFeatureFlags: normalizeDashboardFeatureFlags(),
};

export async function GET(req: NextRequest) {
  try {
    if (req.headers.get("x-user-role") !== ADMIN_ONLY) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const latest = await prisma.activityLog.findFirst({
      where: { action: "PKR_PLAN_CONFIG" },
      orderBy: { createdAt: "desc" },
    });

    if (latest?.details) {
      const saved = JSON.parse(latest.details);
      return NextResponse.json({
        ...DEFAULT_CONFIG,
        ...saved,
        pricing: { ...DEFAULT_PKR_PRICING, ...(saved.pricing || {}) },
        seatPricing: { ...DEFAULT_PKR_SEAT_PRICING, ...(saved.seatPricing || {}) },
        planPermissions: normalizePkrPlanPermissions(saved.planPermissions),
        dashboardFeatureFlags: normalizeDashboardFeatureFlags(saved.dashboardFeatureFlags),
        updatedAt: latest.createdAt,
      });
    }

    return NextResponse.json({ ...DEFAULT_CONFIG, updatedAt: null });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load PKR config" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get("x-user-role") !== ADMIN_ONLY) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    await prisma.activityLog.create({
      data: {
        action:    "PKR_PLAN_CONFIG",
        details:   JSON.stringify(body),
        userId:    null,
        companyId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
