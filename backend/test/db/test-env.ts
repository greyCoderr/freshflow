import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const root = fileURLToPath(new URL("../../..", import.meta.url));

/** TEST_DATABASE_URL from the shell, else from .env, else XAMPP's default root with no password. */
function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const file = path.join(root, ".env");
  if (existsSync(file)) {
    const v = parseEnv(readFileSync(file, "utf8")).TEST_DATABASE_URL;
    if (v) return v;
  }
  return "mysql://root:@127.0.0.1:3306/freshflow_test";
}

export const TEST_DATABASE_URL = testDatabaseUrl();

/** The DB tests wipe every table. Refuse any database whose name does not end in _test. */
export function assertTestDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!/_test$/.test(name)) throw new Error(`Refusing to run DB tests against "${name}": the database name must end with _test.`);
}

export const DB_TEST_ENV = {
  NODE_ENV: "test",
  DATABASE_URL: TEST_DATABASE_URL,
  JWT_SECRET: "test-only-secret-test-only-secret-0123",
  COOKIE_SECURE: "false",
  SESSION_HOURS: "12",
  DEFAULT_PASSWORD: "Temp-Pass-2026",
  AUTH_RATE_LIMIT: "100000",
} as const;

export const ROOT_DIR = root;
