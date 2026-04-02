export function logout() {
  try {
    sessionStorage.removeItem("user");
    localStorage.removeItem("user");
    localStorage.removeItem("pendingVerification");
    localStorage.removeItem("pendingBusinessType");
  } catch {}
  window.location.href = "/";
}
