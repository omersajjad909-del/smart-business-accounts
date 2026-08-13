"use client";

/**
 * Runtime answer to "are the buy buttons open yet?".
 *
 * Starts from the build-time flag so a page that ships with signups already
 * open never flashes "Launching Soon", then confirms against the launch row —
 * which is what an admin pressing Launch Now actually moves.
 */

import { useEffect, useState } from "react";
import { SIGNUPS_OPEN } from "@/lib/signupGate";

export function useSignupsOpen(): boolean {
  const [open, setOpen] = useState(SIGNUPS_OPEN);

  useEffect(() => {
    if (SIGNUPS_OPEN) return; // Already open at build time; nothing can close it.
    let cancelled = false;
    fetch("/api/public/signup-status", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d?.open === true) setOpen(true); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return open;
}
