import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  const res = NextResponse.json({ success: true });
  res.cookies.set('sb_auth', '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
