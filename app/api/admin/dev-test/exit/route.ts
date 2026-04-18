import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const backup = req.cookies.get("sb_auth_backup")?.value;
  const res = NextResponse.json({ ok: true });

  if (backup) {
    res.cookies.set("sb_auth", backup, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
  } else {
    res.cookies.delete("sb_auth");
  }

  res.cookies.delete("sb_auth_backup");
  return res;
}
