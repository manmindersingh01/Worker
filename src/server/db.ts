import { PrismaClient } from "@prisma/client";
import { env } from "./env";

/**
 * Neon's serverless compute auto-suspends when idle and takes ~3-5s to wake on
 * the first connection. Prisma's default connect timeout (5s) plus a cold
 * serverless function can race that wake and fail with "Connection error." —
 * which previously killed ingestion. Give connections room to wake.
 */
function databaseUrl(): string {
  const raw = env.DATABASE_URL;
  try {
    const u = new URL(raw);
    if (!u.searchParams.has("connect_timeout"))
      u.searchParams.set("connect_timeout", "20");
    if (!u.searchParams.has("pool_timeout"))
      u.searchParams.set("pool_timeout", "20");
    return u.toString();
  } catch {
    return raw;
  }
}

const createPrismaClient = () =>
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: { db: { url: databaseUrl() } },
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
