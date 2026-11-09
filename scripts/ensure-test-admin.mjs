#!/usr/bin/env node
import bcrypt from "bcryptjs";
import { prisma } from "../server/prisma.js";

const email = "ram.ray@curiosity.com";
const password = process.env.TEST_ADMIN_PASSWORD;

if (!password) {
  throw new Error("Set TEST_ADMIN_PASSWORD for this command.");
}

const database = new URL(process.env.DATABASE_URL || "");
if (
  !["localhost", "127.0.0.1", "::1"].includes(database.hostname) ||
  database.port !== "55433" ||
  database.pathname !== "/curiosity_loadtest" ||
  decodeURIComponent(database.username) !== "curiosity_test_user"
) {
  throw new Error("Refusing to modify any database except the isolated local load-test database.");
}

try {
  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    create: {
      name: "Ram Ray",
      email,
      password: hashedPassword,
      role: "ADMIN",
      status: true,
      admin: { create: { status: true } },
    },
    update: {
      name: "Ram Ray",
      password: hashedPassword,
      role: "ADMIN",
      status: true,
      admin: {
        upsert: {
          create: { status: true },
          update: { status: true },
        },
      },
    },
  });
  console.log("Isolated test admin is ready. Password was not printed.");
} finally {
  await prisma.$disconnect();
}
