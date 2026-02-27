import { NextRequest, NextResponse } from 'next/server';

// Usage: rbacMiddleware(req, ['ADMIN', 'ACCOUNTANT'])
export function rbacMiddleware(req: NextRequest, allowedRoles: string[]) {
  const user = (req as any).user;
  if (!user || !allowedRoles.includes(user.role)) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions.' } }, { status: 403 });
  }
  return null; // Continue
}
