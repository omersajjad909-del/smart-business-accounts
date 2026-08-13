/**
 * Helper API endpoint to analyze business plan module configurations
 * GET /api/admin/analyze-plan-modules
 * 
 * Returns a detailed report of:
 * - Shared features between business types
 * - Current plan assignments
 * - Differences/mismatches
 * - Recommendations
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { 
  dashboardFeaturesForBusinessType, 
  CROSS_BUSINESS_FEATURE_LABELS,
  DASHBOARD_FEATURE_DEFS,
  DashboardFeaturePlanCode
} from "@/lib/dashboardFeatureRegistry";

type PlanCode = "STARTER" | "PRO" | "ENTERPRISE";

interface FeatureAnalysis {
  featureId: string;
  label: string;
  isCore: boolean;
  isCrossBusiness: boolean;
  business: {
    trading?: Record<PlanCode, boolean>;
    manufacturing?: Record<PlanCode, boolean>;
  };
  status: "synced" | "unsynced" | "unique";
  recommendation?: string;
}

interface AnalysisReport {
  timestamp: string;
  features: FeatureAnalysis[];
  summary: {
    total: number;
    synced: number;
    unsynced: number;
    unique: number;
  };
  uniqueToTrading: string[];
  uniqueToManufacturing: string[];
}

function isAdmin(req: NextRequest): boolean {
  const role = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (role === "ADMIN") return true;
  try {
    const p = verifyJwt(getTokenFromRequest(req as any)!);
    return String(p?.role || "").toUpperCase() === "ADMIN";
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Get current business plan modules config
    const log = await prisma.activityLog.findFirst({
      where: { action: "BUSINESS_PLAN_MODULES_CONFIG" },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });

    let savedConfig: Record<string, any> = {};
    let savedPageConfig: Record<string, Record<PlanCode, string[]>> = {};
    
    if (log?.details) {
      try {
        const parsed = JSON.parse(log.details);
        savedConfig = parsed.config || {};
        savedPageConfig = parsed.pageConfig || {};
      } catch (e) {
        console.error("Failed to parse saved config:", e);
      }
    }

    // Get features for Trading and Manufacturing
    const tradingFeatures = dashboardFeaturesForBusinessType("trading");
    const manufacturingFeatures = dashboardFeaturesForBusinessType("manufacturing");

    const tradingIds = new Set(tradingFeatures.map(f => f.id));
    const manufacturingIds = new Set(manufacturingFeatures.map(f => f.id));
    const sharedIds = [...tradingIds].filter(id => manufacturingIds.has(id));
    const uniqueTradingIds = [...tradingIds].filter(id => !manufacturingIds.has(id));
    const uniqueManufacturingIds = [...manufacturingIds].filter(id => !tradingIds.has(id));

    // Analyze each shared feature
    const features: FeatureAnalysis[] = [];

    for (const featureId of sharedIds) {
      const def = DASHBOARD_FEATURE_DEFS.find(f => f.id === featureId);
      if (!def) continue;

      const isCore = def.core;
      const isCrossBusiness = CROSS_BUSINESS_FEATURE_LABELS.has(def.businessLabel);
      
      // Get plan assignments for this feature
      const tradingPageConfig = savedPageConfig["trading"] || {};
      const manufacturingPageConfig = savedPageConfig["manufacturing"] || {};

      const tradingAssignment: Record<PlanCode, boolean> = {
        STARTER: (tradingPageConfig.STARTER || []).includes(featureId),
        PRO: (tradingPageConfig.PRO || []).includes(featureId),
        ENTERPRISE: (tradingPageConfig.ENTERPRISE || []).includes(featureId),
      };

      const manufacturingAssignment: Record<PlanCode, boolean> = {
        STARTER: (manufacturingPageConfig.STARTER || []).includes(featureId),
        PRO: (manufacturingPageConfig.PRO || []).includes(featureId),
        ENTERPRISE: (manufacturingPageConfig.ENTERPRISE || []).includes(featureId),
      };

      // Check if they're synced
      const isSynced = 
        tradingAssignment.STARTER === manufacturingAssignment.STARTER &&
        tradingAssignment.PRO === manufacturingAssignment.PRO &&
        tradingAssignment.ENTERPRISE === manufacturingAssignment.ENTERPRISE;

      let status: "synced" | "unsynced" | "unique" = "synced";
      let recommendation = undefined;

      if (!isSynced) {
        status = "unsynced";
        const diffs = [];
        if (tradingAssignment.STARTER !== manufacturingAssignment.STARTER) {
          diffs.push(`STARTER: trading=${tradingAssignment.STARTER} vs mfg=${manufacturingAssignment.STARTER}`);
        }
        if (tradingAssignment.PRO !== manufacturingAssignment.PRO) {
          diffs.push(`PRO: trading=${tradingAssignment.PRO} vs mfg=${manufacturingAssignment.PRO}`);
        }
        if (tradingAssignment.ENTERPRISE !== manufacturingAssignment.ENTERPRISE) {
          diffs.push(`ENTERPRISE: trading=${tradingAssignment.ENTERPRISE} vs mfg=${manufacturingAssignment.ENTERPRISE}`);
        }
        recommendation = `Difference detected: ${diffs.join(" | ")}. Consider syncing to: Trading=${JSON.stringify(tradingAssignment)}.`;
      }

      if (isCore || isCrossBusiness) {
        status = "synced"; // These are already auto-synced
        recommendation = "Core/Cross-business feature - automatically synchronized globally.";
      }

      features.push({
        featureId,
        label: def.label,
        isCore,
        isCrossBusiness,
        business: {
          trading: tradingAssignment,
          manufacturing: manufacturingAssignment,
        },
        status,
        recommendation,
      });
    }

    const report: AnalysisReport = {
      timestamp: new Date().toISOString(),
      features: features.sort((a, b) => {
        // Prioritize unsynced
        if (a.status !== b.status) {
          return (a.status === "unsynced" ? -1 : 1);
        }
        return a.label.localeCompare(b.label);
      }),
      summary: {
        total: sharedIds.length,
        synced: features.filter(f => f.status === "synced").length,
        unsynced: features.filter(f => f.status === "unsynced").length,
        unique: uniqueTradingIds.length + uniqueManufacturingIds.length,
      },
      uniqueToTrading: uniqueTradingIds
        .map(id => DASHBOARD_FEATURE_DEFS.find(f => f.id === id)?.label || id)
        .sort(),
      uniqueToManufacturing: uniqueManufacturingIds
        .map(id => DASHBOARD_FEATURE_DEFS.find(f => f.id === id)?.label || id)
        .sort(),
    };

    return NextResponse.json(report);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/analyze-plan-modules?action=sync-shared
 * 
 * Synchronizes plan assignments for shared features.
 * Copies Trading's plan assignment to Manufacturing for all shared modules.
 * 
 * Query params:
 *   action=sync-shared — sync Trading → Manufacturing
 *   sourceType=trading|manufacturing — which type to copy from (default: trading)
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const action = new URL(req.url).searchParams.get("action");
    const sourceType = new URL(req.url).searchParams.get("sourceType") || "trading";

    if (action !== "sync-shared") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Get current config
    const log = await prisma.activityLog.findFirst({
      where: { action: "BUSINESS_PLAN_MODULES_CONFIG" },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });

    let config: Record<string, any> = {};
    let pageConfig: Record<string, Record<PlanCode, string[]>> = {};

    if (log?.details) {
      try {
        const parsed = JSON.parse(log.details);
        config = parsed.config || {};
        pageConfig = parsed.pageConfig || {};
      } catch (e) {
        console.error("Failed to parse config:", e);
      }
    }

    // Get shared features
    const tradingFeatures = dashboardFeaturesForBusinessType("trading");
    const manufacturingFeatures = dashboardFeaturesForBusinessType("manufacturing");
    const tradingIds = new Set(tradingFeatures.map(f => f.id));
    const manufacturingIds = new Set(manufacturingFeatures.map(f => f.id));
    const sharedIds = [...tradingIds].filter(id => manufacturingIds.has(id));

    // Sync: copy sourceType → target
    const targetType = sourceType === "manufacturing" ? "trading" : "manufacturing";
    const sourceConfig = pageConfig[sourceType] || {};
    const targetConfig = pageConfig[targetType] || {};

    // For each shared feature, copy plan assignment from source to target
    for (const plan of ["STARTER", "PRO", "ENTERPRISE"] as PlanCode[]) {
      const sourceList = sourceConfig[plan] || [];
      const targetList = targetConfig[plan] || [];

      // Add/remove to match source
      for (const featureId of sharedIds) {
        const inSource = sourceList.includes(featureId);
        const inTarget = targetList.includes(featureId);

        if (inSource && !inTarget) {
          targetList.push(featureId);
        } else if (!inSource && inTarget) {
          targetList.splice(targetList.indexOf(featureId), 1);
        }
      }

      targetConfig[plan] = targetList;
    }

    // Save updated config
    const mergedPageConfig = { ...pageConfig, [targetType]: targetConfig };

    await prisma.activityLog.create({
      data: {
        action: "BUSINESS_PLAN_MODULES_CONFIG",
        details: JSON.stringify({ config, pageConfig: mergedPageConfig }),
        userId: null,
        companyId: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Synchronized ${sharedIds.length} shared features from ${sourceType} to ${targetType}`,
      sharedFeaturesCount: sharedIds.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
