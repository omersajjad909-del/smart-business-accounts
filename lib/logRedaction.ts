// FILE: lib/logRedaction.ts
//
// ActivityLog doubles as the store for short-lived auth secrets (password-reset
// token hashes, email-change OTP hashes and the pending target address). The
// logs API returns rows verbatim — including a CSV export — so anyone holding
// VIEW_LOGS for a company could read every in-flight account-recovery artefact
// for their colleagues. These rows stay in the table; their payload is stripped
// on the way out.

const SENSITIVE_ACTIONS = new Set([
  "PASSWORD_RESET_REQUESTED",
  "EMAIL_CHANGE_OTP",
  "VERIFY_OTP",
  "EMAIL_OTP",
  "SMS_OTP",
  "MAGIC_LINK_ISSUED",
]);

export function isSensitiveLogAction(action: string | null | undefined): boolean {
  return SENSITIVE_ACTIONS.has(String(action || "").toUpperCase());
}

/** Replace the payload of security-sensitive rows with a fixed placeholder. */
export function redactLogDetails<T extends { action: string | null; details: string | null }>(
  log: T,
): T {
  if (!isSensitiveLogAction(log.action)) return log;
  return { ...log, details: "[redacted — security event]" };
}

export function redactLogs<T extends { action: string | null; details: string | null }>(
  logs: T[],
): T[] {
  return logs.map(redactLogDetails);
}

/**
 * Free-text search must not reach sensitive rows either: a `contains` filter
 * over `details` would otherwise let a caller confirm a token hash or probe the
 * pending new-email address one guess at a time.
 */
export function excludeSensitiveActions() {
  return { notIn: Array.from(SENSITIVE_ACTIONS) };
}
