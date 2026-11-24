import { Prisma } from "../generated/prisma/index.js";

/** Deadlock or write conflict (MySQL 1213 / TiDB 9007): safe to run the whole transaction again. */
export function isRetryableTxError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") return true;
  const msg = e instanceof Error ? e.message : "";
  return /deadlock|write conflict|try restarting transaction/i.test(msg);
}

export const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/** Runs fn again (up to `attempts` times) when the database reports a deadlock or write conflict. */
export async function withTxRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try { return await fn(); }
    catch (e) {
      if (i >= attempts || !isRetryableTxError(e)) throw e;
      await new Promise((r) => setTimeout(r, 15 * i + Math.floor(Math.random() * 20)));
    }
  }
}

/** Interactive transaction limits for stock work: wait up to 5 s to start, 10 s to finish. */
export const STOCK_TX = { maxWait: 5_000, timeout: 10_000 } as const;
