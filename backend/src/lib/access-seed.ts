import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, ROLES } from "@freshflow/shared";
import type { PrismaClient } from "../generated/prisma/index.js";

/** Roles, permissions and default grants. Idempotent; used by the seed and by the test reset helper. */
export async function seedRolesAndPermissions(prisma: PrismaClient) {
  for (const code of PERMISSIONS) await prisma.permission.upsert({ where: { code }, update: {}, create: { code } });
  const perms = new Map((await prisma.permission.findMany()).map((p) => [p.code, p.id]));
  for (const name of ROLES) {
    const role = await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
    await prisma.rolePermission.createMany({
      data: DEFAULT_ROLE_PERMISSIONS[name].map((code) => ({ roleId: role.id, permissionId: perms.get(code)! })),
      skipDuplicates: true,
    });
  }
}
