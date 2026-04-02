import { NextRequest, NextResponse } from "next/server";

// In-memory mock store (resets on server restart — fine for testing)
let mockPaymentMethods = [
  {
    id: "pm_mock_default",
    brand: "visa",
    last4: "4242",
    expMonth: 12,
    expYear: 2027,
    holderName: "ACCOUNT HOLDER",
    isDefault: true,
  },
];

export async function GET() {
  const defaultId = mockPaymentMethods.find(p => p.isDefault)?.id ?? null;
  return NextResponse.json({ paymentMethods: mockPaymentMethods, defaultId });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cardNumber: string = String(body?.cardNumber || "").replace(/\s/g, "");
    const expiry: string = String(body?.expiry || "");
    const holderName: string = String(body?.holderName || "CARDHOLDER").toUpperCase();

    // Detect brand from card number
    let brand = "unknown";
    if (/^4/.test(cardNumber)) brand = "visa";
    else if (/^5[1-5]/.test(cardNumber)) brand = "mastercard";
    else if (/^3[47]/.test(cardNumber)) brand = "amex";
    else if (/^6/.test(cardNumber)) brand = "discover";

    const last4 = cardNumber.slice(-4) || "0000";
    const [expMonthStr, expYearStr] = expiry.split("/");
    const expMonth = parseInt(expMonthStr || "12", 10);
    const expYear = parseInt("20" + (expYearStr || "27"), 10);

    const newCard = {
      id: `pm_mock_${Date.now()}`,
      brand,
      last4,
      expMonth,
      expYear,
      holderName,
      isDefault: mockPaymentMethods.length === 0,
    };

    mockPaymentMethods.push(newCard);

    return NextResponse.json({ ok: true, paymentMethod: newCard });
  } catch {
    return NextResponse.json({ error: "Failed to add card" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const wasDef = mockPaymentMethods.find(p => p.id === id)?.isDefault;
    mockPaymentMethods = mockPaymentMethods.filter(p => p.id !== id);

    // Promote first remaining card to default if we removed the default
    if (wasDef && mockPaymentMethods.length > 0) {
      mockPaymentMethods[0].isDefault = true;
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to remove card" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    mockPaymentMethods = mockPaymentMethods.map(p => ({ ...p, isDefault: p.id === id }));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update default" }, { status: 500 });
  }
}
