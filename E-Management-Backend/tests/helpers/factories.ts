import { Role } from "@prisma/client";
import { prisma } from "../../src/config/prisma";
import { hashPassword } from "../../src/utils/hash.util";

export const DEFAULT_PASSWORD = "TestPass@123";

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export async function createAdmin(overrides: { email?: string; password?: string } = {}) {
  const email = overrides.email ?? `${unique("admin")}@example.com`;
  const password = overrides.password ?? DEFAULT_PASSWORD;
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { fullName: "Test Admin", email, passwordHash, role: Role.ADMIN },
  });

  return { user, email, password };
}

export async function createEmployee(
  overrides: { email?: string; password?: string; department?: string; designation?: string } = {},
) {
  const email = overrides.email ?? `${unique("employee")}@example.com`;
  const password = overrides.password ?? DEFAULT_PASSWORD;
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      fullName: "Test Employee",
      email,
      passwordHash,
      role: Role.EMPLOYEE,
      employee: {
        create: {
          department: overrides.department ?? "Engineering",
          designation: overrides.designation ?? "Software Engineer",
        },
      },
    },
    include: { employee: true },
  });

  return { user, employee: user.employee!, email, password };
}

export function futureDate(daysFromNow: number): Date {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
}
