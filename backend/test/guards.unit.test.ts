import { describe, expect, it } from "vitest";
import { API_GUARDS, DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, ROLES, homePathFor, createUserSchema, registerSchema, changePasswordSchema } from "@freshflow/shared";

describe("API guard table", () => {
  it("uses known permissions and unique paths under /api", () => {
    expect(new Set(API_GUARDS.map((g) => g.path)).size).toBe(API_GUARDS.length);
    for (const g of API_GUARDS) {
      expect(PERMISSIONS).toContain(g.permission);
      expect(g.path).toMatch(/^\/api\/[a-z/]+$/);
    }
  });
  it("leaves every non-admin role at least one area it cannot reach", () => {
    for (const role of ROLES.filter((r) => r !== "ADMIN")) {
      expect(API_GUARDS.some((g) => !DEFAULT_ROLE_PERMISSIONS[role].includes(g.permission))).toBe(true);
    }
  });
  it("routes staff to the workspace and customers to the shop", () => {
    expect(homePathFor("CUSTOMER")).toBe("/");
    for (const r of ROLES.filter((x) => x !== "CUSTOMER")) expect(homePathFor(r)).toBe("/staff");
  });
});

describe("account schemas", () => {
  it("register strips any role the client sends", () => {
    const v = registerSchema.parse({ fullName: "Ana Cruz", email: "A@x.ph", contactNumber: "09171234567", password: "longenough", role: "ADMIN", roleId: 1 });
    expect(v).not.toHaveProperty("role");
    expect(v).not.toHaveProperty("roleId");
    expect(v.email).toBe("a@x.ph");
  });
  it("admin-created accounts cannot be CUSTOMER and never carry a password", () => {
    expect(createUserSchema.safeParse({ fullName: "Ben", email: "b@x.ph", role: "CUSTOMER" }).success).toBe(false);
    const v = createUserSchema.parse({ fullName: "Ben Cruz", email: "b@x.ph", role: "SALES", password: "x" });
    expect(v).not.toHaveProperty("password");
  });
  it("new password must differ from the current one", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "same-pass-1", newPassword: "same-pass-1" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: "old-pass-1", newPassword: "short" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: "old-pass-1", newPassword: "new-pass-22" }).success).toBe(true);
  });
});
