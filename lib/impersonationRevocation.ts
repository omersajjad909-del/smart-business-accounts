// In-memory impersonation revocation list.
// Cleared on server restart — acceptable since tokens are short-lived (1h).
const revokedTokens = new Set<string>();

export function revokeImpersonation(key: string) {
  revokedTokens.add(key);
}

export function isImpersonationRevoked(key: string) {
  return revokedTokens.has(key);
}
