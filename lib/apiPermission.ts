import { prisma } from "./prisma";

export async function apiHasPermission(
  userId: string | null,
  userRole: string | null,
  permission: string
) {
  // ADMIN ko full access
  if (userRole === "ADMIN") return true;

  if (!userId) return false;

  // User-specific permissions check
  const userPerm = await prisma.userPermission.findFirst({
    where: { userId, permission },
  });

  if (userPerm) return true;

  // Role-based permissions check (RolePermission table se)
  if (userRole) {
    const rolePerm = await prisma.rolePermission.findFirst({
      where: { role: userRole, permission },
    });
    if (rolePerm) return true;
  }

  return false;
}
