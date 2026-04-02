"use client";

// Canonical customer statement page under /reports — delegates to the shared implementation.
// The actual logic lives at /dashboard/customer-statement/page.tsx; we re-export it here
// so both routes work without duplicating code.
export { default } from "@/app/dashboard/customer-statement/page";
