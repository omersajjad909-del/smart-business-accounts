import { NextResponse } from "next/server";
import { hasLemonSqueezyConfig } from "@/lib/lemonsqueezy";

function providerManagedResponse() {
  const provider = hasLemonSqueezyConfig() ? "LEMON_SQUEEZY" : "INTERNAL";

  return NextResponse.json({
    provider,
    managedExternally: provider === "LEMON_SQUEEZY",
    paymentMethods: [],
    defaultId: null,
    note:
      provider === "LEMON_SQUEEZY"
        ? "Payment methods are securely handled by LemonSqueezy during checkout."
        : "Payment methods are not configured yet for this workspace.",
  });
}

export async function GET() {
  return providerManagedResponse();
}

export async function POST() {
  return NextResponse.json(
    {
      error: hasLemonSqueezyConfig()
        ? "Payment methods are managed by LemonSqueezy during checkout."
        : "Payment method setup is not configured yet.",
    },
    { status: 400 },
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      error: hasLemonSqueezyConfig()
        ? "Default payment methods are managed by LemonSqueezy."
        : "Payment method setup is not configured yet.",
    },
    { status: 400 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: hasLemonSqueezyConfig()
        ? "Remove payment methods from your LemonSqueezy billing flow."
        : "Payment method setup is not configured yet.",
    },
    { status: 400 },
  );
}
