import { NextRequest, NextResponse } from 'next/server';

// Usage: tenantMiddleware(req)
export function tenantMiddleware(req: NextRequest) {
  const user = (req as any).user;
  if (!user || !user.companyId) {
    return NextResponse.json({ success: false, error: { code: 'NO_COMPANY', message: 'Company context required.' } }, { status: 400 });
  }
  // Optionally: check company status, subscription, etc.
  return null; // Continue
}
