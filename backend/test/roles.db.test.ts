import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { API_GUARDS, DEFAULT_ROLE_PERMISSIONS, ROLES, type RoleName } from "@freshflow/shared";
import { createUser, makeApp, prisma, resetDb, signIn, TEST_PASSWORD } from "./db/helpers.js";

type TestAgent = ReturnType<typeof request.agent>;
const app = makeApp();
const agents = {} as Record<RoleName, TestAgent>;

beforeAll(async () => {
  await resetDb();
  for (const role of ROLES) {
    const u = await createUser(role);
    agents[role] = await signIn(app, u.email, TEST_PASSWORD);
  }
});
afterAll(() => prisma.$disconnect());

describe("signed out", () => {
  it.each(API_GUARDS)("$path answers 401", async (g) => {
    const res = await request(app).get(g.path);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("session_expired");
  });
});

// The whole matrix: every role against every guarded area, expected result from the default grants.
describe.each(ROLES)("%s", (role) => {
  const denied = API_GUARDS.filter((g) => !DEFAULT_ROLE_PERMISSIONS[role].includes(g.permission));
  const allowed = API_GUARDS.filter((g) => DEFAULT_ROLE_PERMISSIONS[role].includes(g.permission));
  if (denied.length) {
    it.each(denied)("gets 403 on $path (needs $permission)", async (g) => {
      const res = await agents[role].get(g.path);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("forbidden");
    });
  }
  if (allowed.length) {
    it.each(allowed)("passes the guard on $path", async (g) => {
      expect((await agents[role].get(g.path)).status).not.toBe(403);
    });
  }
});

describe("spot checks from the docs", () => {
  it("SALES and PLANT_STAFF get 403 on employee records (RA 10173)", async () => {
    expect((await agents.SALES.get("/api/employees")).status).toBe(403);
    expect((await agents.PLANT_STAFF.get("/api/employees")).status).toBe(403);
  });
  it("only ADMIN can list or create accounts", async () => {
    for (const role of ROLES.filter((r) => r !== "ADMIN")) {
      expect((await agents[role].get("/api/users")).status).toBe(403);
      const res = await agents[role].post("/api/users").send({ fullName: "Sneaky", email: `sneaky-${role}@test.local`, role: "ADMIN" });
      expect(res.status).toBe(403);
    }
    expect(await prisma.user.count({ where: { email: { startsWith: "sneaky-" } } })).toBe(0);
    expect((await agents.ADMIN.get("/api/users")).status).toBe(200);
  });
  it("a customer cannot reach any staff area", async () => {
    for (const p of ["/api/staff/orders", "/api/pos", "/api/inventory", "/api/members", "/api/audit"]) {
      expect((await agents.CUSTOMER.get(p)).status).toBe(403);
    }
  });
  it("a role change applies on the next request, without signing in again", async () => {
    const u = await createUser("SALES");
    const agent = await signIn(app, u.email, TEST_PASSWORD);
    expect((await agent.get("/api/employees")).status).toBe(403);
    const hr = await prisma.role.findUniqueOrThrow({ where: { name: "MEMBERSHIP_HR" } });
    await prisma.user.update({ where: { id: u.id }, data: { roleId: hr.id } });
    expect((await agent.get("/api/employees")).status).not.toBe(403);
    expect((await agent.get("/api/pos")).status).toBe(403);
  });
});
