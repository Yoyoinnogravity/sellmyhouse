import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }

  if (process.env.VERCEL !== "1") {
    return url;
  }

  const candidates = [
    path.join(process.cwd(), "prisma", "dev.db"),
    path.join(process.cwd(), "..", "prisma", "dev.db"),
  ];
  const source = candidates.find((candidate) => fs.existsSync(candidate));
  if (!source) {
    throw new Error("The property database was not included in this deployment.");
  }

  const target = path.join(os.tmpdir(), "sellmyhouse.db");
  if (!fs.existsSync(target)) {
    fs.copyFileSync(source, target);
  }
  return `file:${target}`;
}

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl() });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
