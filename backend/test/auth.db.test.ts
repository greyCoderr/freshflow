import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { DEFAULT_ROLE_PERMISSIONS } from "@freshflow/shared";
import { createUser, makeApp, prisma, resetDb, signIn, TEST_PASSWORD } from "./db/helpers.js";
import { GENERIC_LOGIN_ERROR, MAX_FAILS } from "../src/routes/auth.js";
import { DB_TEST_ENV } from "./db/test-env.js";

const app = makeApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("login", () => {
  it("signs in with email or username and sets an httpOnly session cookie", async () => {
    const u = await createUser("SALES");
    const res = await request(app).post("/api/auth/login").send({ identifier: u.email.toUpperCase(), password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: u.id, role: "SALES", mustChangePassword: false });
    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toMatch(/ff_session=/);
    expect(cookie).toMatch(/HttpOnly/i);

    const agent = await signIn(app, u.username!, TEST_PASSWORD);
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.role).toBe("SALES");
    expect(me.body).not.toHaveProperty("passwordHash");
  });

  it("gives the same generic 401 for a wrong password and an unknown account", async () => {
    const u = await createUser("CUSTOMER");
    const bad = await request(app).post("/api/auth/login").send({ identifier: u.email, password: "wrong-password" });
    const unknown = await request(app).post("/api/auth/login").send({ identifier: "nobody@test.local", password: "wrong-password" });
    expect(bad.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(bad.body).toEqual(unknown.body);
    expect(bad.body.error).toBe(GENERIC_LOGIN_ERROR);
    expect(bad.headers["set-cookie"]).toBeUndefined();
  });

  it(`locks the account after ${MAX_FAILS} wrong passwords, even for the right password, until the lock ends`, async () => {
    const u = await createUser("CUSTOMER");
    for (let i = 0; i < MAX_FAILS; i++) {
      expect((await request(app).post("/api/auth/login").send({ identifier: u.email, password: "nope-" + i })).status).toBe(401);
    }
    const locked = await request(app).post("/api/auth/login").send({ identifier: u.email, password: TEST_PASSWORD });
    expect(locked.status).toBe(401);
    expect(locked.body.error).toBe(GENERIC_LOGIN_ERROR); // does not reveal the account exists
    const row = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(row.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    expect(await prisma.auditLog.count({ where: { action: "auth.locked", targetId: String(u.id) } })).toBe(1);

    // Lock runs out: the right password works and the counter resets.
    await prisma.user.update({ where: { id: u.id }, data: { lockedUntil: new Date(Date.now() - 1000) } });
    expect((await request(app).post("/api/auth/login").send({ identifier: u.email, password: TEST_PASSWORD })).status).toBe(200);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(after.failedLogins).toBe(0);
    expect(after.lockedUntil).toBeNull();
  });
});

describe("register", () => {
  const body = { fullName: "Ana Cruz", email: "ana@test.local", contactNumber: "09171234567", password: "Ana-Secret-1" };

  it("always creates a CUSTOMER, whatever role the client sends", async () => {
    const admin = await prisma.role.findUniqueOrThrow({ where: { name: "ADMIN" } });
    const agent = request.agent(app);
    const res = await agent.post("/api/auth/register").send({ ...body, role: "ADMIN", roleId: admin.id, permissions: ["user.manage"], status: "ACTIVE" });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("CUSTOMER");
    const u = await prisma.user.findUniqueOrThrow({ where: { email: body.email }, include: { role: true, customer: true } });
    expect(u.role.name).toBe("CUSTOMER");
    expect(u.customer).not.toBeNull();
    const me = await agent.get("/api/auth/me");
    expect([...me.body.permissions].sort()).toEqual([...DEFAULT_ROLE_PERMISSIONS.CUSTOMER].sort());
    expect((await agent.get("/api/users")).status).toBe(403);
  });

  it("rejects a duplicate email and a weak password", async () => {
    expect((await request(app).post("/api/auth/register").send(body)).status).toBe(201);
    const dup = await request(app).post("/api/auth/register").send({ ...body, email: "ANA@test.local" });
    expect(dup.status).toBe(409);
    const weak = await request(app).post("/api/auth/register").send({ ...body, email: "b@test.local", password: "short" });
    expect(weak.status).toBe(400);
    expect(weak.body.fields.password).toBeDefined();
  });
});

describe("deactivation", () => {
  it("blocks a deactivated user on the very next request, and blocks new sign-ins", async () => {
    const admin = await createUser("ADMIN");
    const sales = await createUser("SALES");
    const adminAgent = await signIn(app, admin.email, TEST_PASSWORD);
    const salesAgent = await signIn(app, sales.email, TEST_PASSWORD);
    expect((await salesAgent.get("/api/auth/me")).status).toBe(200);
    expect((await salesAgent.get("/api/staff/orders")).status).not.toBe(403);

    expect((await adminAgent.post(`/api/users/${sales.id}/deactivate`)).status).toBe(200);

    const me = await salesAgent.get("/api/auth/me");
    expect(me.status).toBe(401);
    expect(me.body.code).toBe("session_expired");
    expect((await salesAgent.get("/api/staff/orders")).status).toBe(401);
    const again = await request(app).post("/api/auth/login").send({ identifier: sales.email, password: TEST_PASSWORD });
    expect(again.status).toBe(401);
    expect(again.body.error).toBe(GENERIC_LOGIN_ERROR);
    expect(await prisma.auditLog.count({ where: { action: "user.deactivated", targetId: String(sales.id), actorId: admin.id } })).toBe(1);
  });

  it("also blocks a session when the status is changed directly in the database", async () => {
    const c = await createUser("CUSTOMER");
    const agent = await signIn(app, c.email, TEST_PASSWORD);
    await prisma.user.update({ where: { id: c.id }, data: { status: "INACTIVE" } });
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("will not let an administrator deactivate their own account", async () => {
    const admin = await createUser("ADMIN");
    const agent = await signIn(app, admin.email, TEST_PASSWORD);
    const res = await agent.post(`/api/users/${admin.id}/deactivate`);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("self_deactivate");
  });
});

describe("admin-created accounts and password change", () => {
  it("creates a staff account with DEFAULT_PASSWORD and forces a change before any other access", async () => {
    const admin = await createUser("ADMIN");
    const adminAgent = await signIn(app, admin.email, TEST_PASSWORD);
    const created = await adminAgent.post("/api/users").send({ fullName: "Ben Plant", email: "ben@test.local", username: "ben", role: "PLANT_STAFF", password: "ignored-by-server" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ role: "PLANT_STAFF", mustChangePassword: true });
    expect(created.body).not.toHaveProperty("passwordHash");
    const list = await adminAgent.get("/api/users");
    expect(JSON.stringify(list.body)).not.toMatch(/passwordHash|\$2[aby]\$/);

    // The password the client sent is ignored; the temporary one works.
    expect((await request(app).post("/api/auth/login").send({ identifier: "ben", password: "ignored-by-server" })).status).toBe(401);
    const ben = request.agent(app);
    const login = await ben.post("/api/auth/login").send({ identifier: "ben", password: DB_TEST_ENV.DEFAULT_PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.mustChangePassword).toBe(true);

    const blocked = await ben.get("/api/inventory");
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("password_change_required");
    expect((await ben.get("/api/auth/me")).body.mustChangePassword).toBe(true);

    const changed = await ben.post("/api/auth/change-password").send({ currentPassword: DB_TEST_ENV.DEFAULT_PASSWORD, newPassword: DB_TEST_ENV.DEFAULT_PASSWORD + "x" });
    expect(changed.status).toBe(200);
    expect((await ben.get("/api/inventory")).status).not.toBe(403);
    expect((await ben.get("/api/auth/me")).body.mustChangePassword).toBe(false);

    const actions = (await prisma.auditLog.findMany({ select: { action: true } })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["user.created", "auth.password_changed"]));
    expect(JSON.stringify(await prisma.auditLog.findMany())).not.toContain(DB_TEST_ENV.DEFAULT_PASSWORD);
  });

  it("refuses a wrong current password and the temporary password as the new one", async () => {
    const u = await createUser("SALES", { password: DB_TEST_ENV.DEFAULT_PASSWORD, mustChangePassword: true });
    const agent = await signIn(app, u.email, DB_TEST_ENV.DEFAULT_PASSWORD);
    const wrong = await agent.post("/api/auth/change-password").send({ currentPassword: "not-it", newPassword: "Brand-New-1" });
    expect(wrong.status).toBe(400);
    expect(wrong.body.fields.currentPassword).toBeDefined();
    const u2 = await createUser("SALES");
    const a2 = await signIn(app, u2.email, TEST_PASSWORD);
    const toDefault = await a2.post("/api/auth/change-password").send({ currentPassword: TEST_PASSWORD, newPassword: DB_TEST_ENV.DEFAULT_PASSWORD });
    expect(toDefault.status).toBe(400);
    expect(toDefault.body.fields.newPassword).toBeDefined();
  });

  it("signs out other sessions after a password change, but keeps this one", async () => {
    const u = await createUser("CUSTOMER");
    const here = await signIn(app, u.email, TEST_PASSWORD);
    const other = await signIn(app, u.email, TEST_PASSWORD);
    expect((await here.post("/api/auth/change-password").send({ currentPassword: TEST_PASSWORD, newPassword: "Another-Pass-2" })).status).toBe(200);
    expect((await here.get("/api/auth/me")).status).toBe(200);
    expect((await other.get("/api/auth/me")).status).toBe(401);
  });

  it("logout ends the session", async () => {
    const u = await createUser("CUSTOMER");
    const agent = await signIn(app, u.email, TEST_PASSWORD);
    expect((await agent.post("/api/auth/logout")).status).toBe(200);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });
});
