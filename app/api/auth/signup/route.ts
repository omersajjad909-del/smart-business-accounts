import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`signup:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: { code: "RATE_LIMITED", message: "Too many signup attempts. Please wait a minute." } }, { status: 429 });
  }

  const { name, email, password, companyId, role } = await req.json();
  if (!name || !email || !password || !companyId) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: 'All fields are required.' } }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Email already registered.' } }, { status: 409 });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hash,
      role: role || 'ACCOUNTANT',
      companies: { create: { companyId } },
      defaultCompanyId: companyId,
    },
  });
  return NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}
