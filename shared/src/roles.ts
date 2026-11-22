export const ROLES = ["CUSTOMER", "SALES", "PLANT_STAFF", "MEMBERSHIP_HR", "ADMIN"] as const;
export type RoleName = (typeof ROLES)[number];

/** Every permission the server can check. Keep in sync with prisma seed. */
export const PERMISSIONS = [
  "order.place", "order.view_own", "order.manage", "order.cancel_late",
  "pos.sell", "inventory.view", "inventory.stock_in", "inventory.adjust",
  "movement.view",
  "concern.submit", "concern.respond",
  "member.view", "member.manage",
  "employee.view", "employee.manage",
  "report.view",
  "user.manage", "role.manage", "product.manage", "audit.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Default grants. ADMIN gets everything (checked in code AND seeded). */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, readonly Permission[]> = {
  CUSTOMER: ["order.place", "order.view_own", "concern.submit"],
  SALES: ["order.manage", "pos.sell", "inventory.view", "movement.view", "concern.respond", "member.view", "report.view"],
  PLANT_STAFF: ["inventory.view", "inventory.stock_in", "inventory.adjust", "movement.view", "order.manage", "report.view"],
  MEMBERSHIP_HR: ["member.view", "member.manage", "employee.view", "employee.manage", "report.view"],
  ADMIN: PERMISSIONS,
};

export const STAFF_ROLES: readonly RoleName[] = ["SALES", "PLANT_STAFF", "MEMBERSHIP_HR", "ADMIN"];
