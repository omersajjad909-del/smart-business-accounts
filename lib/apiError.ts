import { NextResponse } from "next/server";

export function apiError(message: string, status: number = 400, details?: any) {
  const body = details ? { error: message, details } : { error: message };
  return NextResponse.json(body, { status });
}

export function apiOk(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}
