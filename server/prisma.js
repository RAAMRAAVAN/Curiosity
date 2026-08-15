import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { applyDatabaseConfig } from "../lib/db-config.js";

applyDatabaseConfig(process.env);

const globalForPrisma = global;

export const prisma =
  globalForPrisma.prisma || new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}