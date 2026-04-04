"use client";

const VISITOR_SESSION_KEY = "fnv_sid";

export function getOrCreateVisitorSessionId(): string {
  if (typeof window === "undefined") return "";

  try {
    let sid = window.localStorage.getItem(VISITOR_SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      window.localStorage.setItem(VISITOR_SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `anon-${Math.random().toString(36).slice(2)}`;
  }
}

export function getVisitorSessionId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(VISITOR_SESSION_KEY);
  } catch {
    return null;
  }
}
