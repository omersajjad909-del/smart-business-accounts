// FILE: middleware.ts
// Next.js middleware entry point — must be named exactly "middleware.ts" at project root.
// Delegates to proxy.ts which handles JWT auth header injection and company context checks.
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

export default function middleware(req: NextRequest) {
  return proxy(req);
}

export { config } from "./proxy";
