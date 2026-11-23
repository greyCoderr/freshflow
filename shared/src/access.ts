import type { Permission, RoleName } from "./roles.js";

/** Plain-language role names for the UI. The server stores the code, never the label. */
export const ROLE_LABELS: Record<RoleName, string> = {
  CUSTOMER: "Customer",
  SALES: "Sales",
  PLANT_STAFF: "Plant Staff",
  MEMBERSHIP_HR: "Membership & HR",
  ADMIN: "Administrator",
};

/**
 * Every API area and the permission its router requires. The server mounts each router behind
 * `requirePermission(permission)` from this table, and the role tests walk the same table, so a
 * new area cannot be added without a guard. Finer checks (ownership, manage vs view) live in the routes.
 */
export const API_GUARDS = [
  { path: "/api/cart", permission: "order.place" },
  { path: "/api/orders", permission: "order.view_own" },
  { path: "/api/concerns", permission: "concern.submit" },
  { path: "/api/staff/orders", permission: "order.manage" },
  { path: "/api/pos", permission: "pos.sell" },
  { path: "/api/inventory", permission: "inventory.view" },
  { path: "/api/movements", permission: "movement.view" },
  { path: "/api/staff/concerns", permission: "concern.respond" },
  { path: "/api/members", permission: "member.view" },
  { path: "/api/employees", permission: "employee.view" },
  { path: "/api/reports", permission: "report.view" },
  { path: "/api/users", permission: "user.manage" },
  { path: "/api/roles", permission: "role.manage" },
  { path: "/api/audit", permission: "audit.view" },
] as const satisfies readonly { path: string; permission: Permission }[];

export const isStaffRole = (role: RoleName) => role !== "CUSTOMER";

/** Where a user lands after signing in. Staff go to the workspace, customers to the shop. */
export function homePathFor(role: RoleName): string {
  return isStaffRole(role) ? "/staff" : "/";
}
