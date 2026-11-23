import { ArrowLeftRight, ClipboardList, FileText, History, IdCard, LayoutDashboard, MessageSquare, Package, ShieldCheck, ShoppingBasket, UserCog, Users, type LucideIcon } from "lucide-react";
import type { Permission } from "@freshflow/shared";

export interface StaffNavItem { to: string; label: string; icon: LucideIcon; permission: Permission | null; group: string }

/** Rail items and staff routes come from this one list, so a link is shown only where the route allows. */
export const STAFF_NAV: readonly StaffNavItem[] = [
  { to: "/staff", label: "Dashboard", icon: LayoutDashboard, permission: null, group: "" },
  { to: "/staff/pos", label: "Point of Sale", icon: ShoppingBasket, permission: "pos.sell", group: "Selling" },
  { to: "/staff/orders", label: "Orders", icon: ClipboardList, permission: "order.manage", group: "Selling" },
  { to: "/staff/concerns", label: "Concerns", icon: MessageSquare, permission: "concern.respond", group: "Selling" },
  { to: "/staff/inventory", label: "Inventory", icon: Package, permission: "inventory.view", group: "Stock" },
  { to: "/staff/movements", label: "Stock Movements", icon: ArrowLeftRight, permission: "movement.view", group: "Stock" },
  { to: "/staff/members", label: "Members", icon: Users, permission: "member.view", group: "People" },
  { to: "/staff/employees", label: "Employees", icon: IdCard, permission: "employee.view", group: "People" },
  { to: "/staff/reports", label: "Reports", icon: FileText, permission: "report.view", group: "Office" },
  { to: "/staff/users", label: "Users", icon: UserCog, permission: "user.manage", group: "Office" },
  { to: "/staff/roles", label: "Roles & Permissions", icon: ShieldCheck, permission: "role.manage", group: "Office" },
  { to: "/staff/audit", label: "Audit Log", icon: History, permission: "audit.view", group: "Office" },
];

export function sectionFor(pathname: string): StaffNavItem | undefined {
  return [...STAFF_NAV].sort((a, b) => b.to.length - a.to.length).find((n) => pathname === n.to || pathname.startsWith(n.to + "/"));
}
