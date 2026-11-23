import { execFileSync } from "node:child_process";
import path from "node:path";
import { DB_TEST_ENV, ROOT_DIR, assertTestDatabase } from "./test-env.js";

/** Runs once before the db project: applies every migration to freshflow_test (creates the DB if missing). */
export default function setup() {
  assertTestDatabase(DB_TEST_ENV.DATABASE_URL);
  const cli = path.join(ROOT_DIR, "node_modules/prisma/build/index.js");
  try {
    execFileSync(process.execPath, [cli, "migrate", "deploy"], {
      cwd: path.join(ROOT_DIR, "backend"), env: { ...process.env, ...DB_TEST_ENV }, stdio: "pipe",
    });
  } catch (e) {
    const out = String((e as { stdout?: Buffer }).stdout ?? "") + String((e as { stderr?: Buffer }).stderr ?? "");
    throw new Error(
      "Could not prepare the test database. Is MySQL (XAMPP) running? Set TEST_DATABASE_URL in .env if your MySQL user has a password.\n" +
      out.replace(/mysql:\/\/[^@\s]*@/g, "mysql://***@"), // never print credentials
    );
  }
}
