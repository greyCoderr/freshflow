import bcrypt from "bcryptjs";
import request from "supertest";
import type { Express } from "express";
import type { RoleName } from "@freshflow/shared";
import { prisma } from "../../src/db.js";
import { createApp } from "../../src/app.js";
import { loadEnv } from "../../src/env.js";
import { seedRolesAndPermissions } from "../../src/lib/access-seed.js";

export { prisma };
export const makeApp = (): Express => createApp(loadEnv());
export const TEST_PASSWORD = "Correct-Horse-9";

/** Empties every table except Prisma's migration history, then re-seeds roles and permissions. */
export async function resetDb() {
  const db = (await prisma.$queryRaw<{ db: string }[]>`SELECT DATABASE() AS db`)[0]?.db ?? "";
  if (!/_test$/.test(db)) throw new Error(`resetDb refused: connected to "${db}", not a *_test database`);
  await prisma.$transaction(async (tx) => {
    const tables = await tx.$queryRaw<{ t: string }[]>`
      SELECT table_name AS t FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'`;
    // Same connection for the whole transaction, so the FK switch applies to these deletes only.
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
    for (const { t } of tables) await tx.$executeRawUnsafe(`DELETE FROM \`${t.replace(/`/g, "")}\``);
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  }, { timeout: 30_000 });
  await seedRolesAndPermissions(prisma);
}

let seq = 0;
export async function createUser(role: RoleName, o: { password?: string; status?: "ACTIVE" | "INACTIVE"; mustChangePassword?: boolean } = {}) {
  const n = ++seq;
  const tag = `${role.toLowerCase()}${n}${Math.random().toString(36).slice(2, 7)}`;
  const password = o.password ?? TEST_PASSWORD;
  const r = await prisma.role.findUniqueOrThrow({ where: { name: role } });
  const u = await prisma.user.create({
    data: {
      roleId: r.id, fullName: `Test ${role} ${n}`, email: `${tag}@test.local`, username: tag,
      passwordHash: await bcrypt.hash(password, 4), // low cost keeps tests fast; compare works on any cost
      status: o.status ?? "ACTIVE", mustChangePassword: o.mustChangePassword ?? false,
      ...(role === "CUSTOMER" ? { customer: { create: { contactNumber: "09171234567" } } } : {}),
    },
  });
  return { ...u, password };
}

/** A cookie-keeping client signed in as the given account. */
export async function signIn(app: Express, identifier: string, password: string) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ identifier, password });
  if (res.status !== 200) throw new Error(`signIn(${identifier}) failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}
