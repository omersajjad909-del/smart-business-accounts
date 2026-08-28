"use client";

import { createContext, useContext, useEffect, useRef } from "react";

/**
 * What a dashboard page tells the shell so the topbar ✕ can ask
 * "Do you want to save the changes you have made?" before it leaves.
 */
export type PageCloseGuard = {
  /** True while the page is holding work the user has not saved yet. */
  isDirty: () => boolean;
  /**
   * Persist that work. Return `false` to keep the page open (validation
   * failed, request errored); anything else counts as saved.
   */
  save?: () => Promise<boolean | void> | boolean | void;
};

export type PageCloseGuardRegistry = {
  register: (guard: PageCloseGuard, remove?: boolean) => void;
};

export const PageCloseGuardCtx = createContext<PageCloseGuardRegistry>({
  register: () => {},
});

/**
 * Opt a page into the close confirmation.
 *
 * Without this the shell falls back to a generic "did anything in this page
 * receive typing?" check and clicks the page's own save button, which is fine
 * for a simple settings screen but guesses wrong on a document form. Any page
 * that can be half-filled — invoices, vouchers, orders — should call this.
 *
 *   usePageCloseGuard({
 *     isDirty: () => !!customerId || rows.some(r => r.itemId),
 *     save: async () => await saveInvoice(),
 *   });
 */
export function usePageCloseGuard(guard: PageCloseGuard) {
  const { register } = useContext(PageCloseGuardCtx);
  // Kept in a ref so the registration below never has to re-run as the page's
  // state changes — the shell always calls through to the latest closure.
  const latest = useRef(guard);
  latest.current = guard;

  useEffect(() => {
    const stable: PageCloseGuard = {
      isDirty: () => latest.current.isDirty(),
      save: () => latest.current.save?.(),
    };
    register(stable);
    // Identity is passed back on unmount so a page that unmounts *after* the
    // next one has already registered cannot clear the new page's guard.
    return () => register(stable, true);
  }, [register]);
}
