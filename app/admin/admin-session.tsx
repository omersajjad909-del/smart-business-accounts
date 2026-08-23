"use client";

/**
 * Who is signed into the console, according to the server.
 *
 * The sidebar used to read this out of sessionStorage, which the browser owns
 * — anyone could write `{"isSuperAdmin":true}` there and the full nav appeared.
 * It was cosmetic either way (the API is what enforces access), but a menu
 * full of links that all 403 is a bad way to find that out. This asks
 * /api/admin/auth/me instead, which answers from the signed cookie.
 */

import { createContext, useContext } from "react";

export type AdminSession = {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  /** null = unrestricted. Otherwise the page ids this admin may open. */
  allowedPages: string[] | null;
  source: "platform" | "team";
};

export type AdminSessionValue = {
  session: AdminSession | null;
  superAdminOnlyPages: string[];
  /** Pages behind the extra page password (see /admin/security). */
  lockedPages?: string[];
  /** The one page this browser has open right now, if any. */
  unlockedPage?: string | null;
};

const AdminSessionContext = createContext<AdminSessionValue>({
  session: null,
  superAdminOnlyPages: [],
  lockedPages: [],
  unlockedPage: null,
});

export const AdminSessionProvider = AdminSessionContext.Provider;

export function useAdminSession(): AdminSessionValue {
  return useContext(AdminSessionContext);
}

/** Mirrors `canAccessPage` in lib/adminAuth — the server always has final say. */
export function canOpenPage(value: AdminSessionValue, pageId: string): boolean {
  const { session, superAdminOnlyPages } = value;
  if (!session) return false;
  if (superAdminOnlyPages.includes(pageId)) return session.isSuperAdmin;
  if (session.isSuperAdmin || session.allowedPages === null) return true;
  return session.allowedPages.includes(pageId);
}
