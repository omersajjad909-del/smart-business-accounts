import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signJwt } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password, companyId } = await req.json();
  if (!email || !password || !companyId) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Email, password, and companyId are required.' } }, { status: 400 });
  }
  const user = await prisma.user.findFirst({ where: { email, companies: { some: { companyId } }, active: true } });
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } }, { status: 401 });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } }, { status: 401 });
  }
  // Create session & JWT
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      companyId,
      token: signJwt({ userId: user.id, companyId, role: user.role }),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
      ip: req.ip ?? '',
      userAgent: req.headers.get('user-agent') ?? '',
    },
  });
  // Set HTTP-only cookie
  const res = NextResponse.json({ success: true });
  res.cookies.set('sb_auth', session.token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
  return res;
}
