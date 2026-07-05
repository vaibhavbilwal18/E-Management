import { prisma } from "../../src/config/prisma";

const TABLES = ["audit_logs", "notifications", "files", "refresh_tokens", "tasks", "employees", "users"];

export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
