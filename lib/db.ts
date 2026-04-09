import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  // 로컬 PostgreSQL이면 어댑터 없이 직접 연결
  if (dbUrl.startsWith("postgresql://") && (dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1"))) {
    return new PrismaClient();
  }
  const adapter = new PrismaNeonHTTP(dbUrl, {});
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
