export function getCurrentUser() {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("user");
    if (!raw) {
      console.log("🔍 No user in localStorage");
      return null;
    }

    const parsed = JSON.parse(raw);
    // Handle both { user: {...} } and direct user object
    const user = parsed.user ?? parsed;

    if (!user?.id || !user?.email) {
      console.log("🔍 Invalid user object:", user);
      return null;
    }

    const currentUser = {
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      role: (user.role || "VIEWER").trim().toUpperCase(),

      // 🔥 User-specific aur role-based permissions
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      rolePermissions: Array.isArray(user.rolePermissions) ? user.rolePermissions : [],
    };

    console.log("✅ getCurrentUser:", { email: currentUser.email, role: currentUser.role });
    return currentUser;
  } catch (e: any) {
    console.error("❌ getCurrentUser error:", e);
    return null;
  }
}
