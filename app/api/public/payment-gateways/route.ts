import { NextResponse } from "next/server";
import {
  GATEWAY_METHOD_MAP,
  syncAdminPaymentGatewayDefaults,
} from "@/lib/adminPaymentGateways";

export const runtime = "nodejs";

export async function GET() {
  try {
    const gateways = await syncAdminPaymentGatewayDefaults();
    const enabledMethodIds = Array.from(new Set(
      gateways
        .filter((gateway) => gateway.isEnabled)
        .flatMap((gateway) => GATEWAY_METHOD_MAP[gateway.key] || []),
    ));

    return NextResponse.json({
      gateways: gateways.filter((gateway) => gateway.isEnabled),
      enabledMethodIds,
      gatewayMethodMap: GATEWAY_METHOD_MAP,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load payment gateways" },
      { status: 500 },
    );
  }
}
