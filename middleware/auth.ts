import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt, getTokenFromRequest } from '@/lib/auth';

export async function authMiddleware(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } }, { status: 401 });
  }
  const payload = verifyJwt(token);
  if (!payload) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired session.' } }, { status: 401 });
  }
  // Optionally: check session in DB for logout/revoke
  const session = await prisma.session.findUnique({ where: { token } });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ success: false, error: { code: 'SESSION_EXPIRED', message: 'Session expired.' } }, { status: 401 });
  }
  // Attach user info to request (custom property)
  (req as any).user = payload;
  return null; // Continue
}
