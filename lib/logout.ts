export function logout() {
  localStorage.clear(); // 💣 sab kuch saaf
  window.location.href = "/";
}
