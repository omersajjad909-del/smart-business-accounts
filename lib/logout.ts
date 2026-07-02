export async function logout() {
  // 1. Clear the server-side session + httpOnly sb_auth cookie
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    // network failure — proceed with client-side cleanup anyway
  }

  // 2. Clear client-side state
  try {
    sessionStorage.removeItem("user");
    localStorage.removeItem("user");
    localStorage.removeItem("pendingVerification");
    localStorage.removeItem("pendingBusinessType");
  } catch {}

  // 3. Hard reload to marketing site — kills any in-memory React state
  window.location.href = "/";
}
