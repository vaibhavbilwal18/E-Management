import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

type Client = Prisma.TransactionClient | typeof prisma;

const withUser = { user: true } satisfies Prisma.EmployeeInclude;

export type EmployeeWithUser = Prisma.EmployeeGetPayload<{ include: typeof withUser }>;

export type EmployeeSortBy = "fullName" | "email" | "department" | "designation" | "createdAt";

export interface EmployeeListFilters {
  search?: string;
  department?: string;
  sortBy: EmployeeSortBy;
  sortOrder: "asc" | "desc";
  skip: number;
  take: number;
}

function buildWhere(filters: Pick<EmployeeListFilters, "search" | "department">): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = { isDeleted: false };

  if (filters.department) {
    where.department = { equals: filters.department, mode: "insensitive" };
  }

  if (filters.search) {
    where.OR = [
      { department: { contains: filters.search, mode: "insensitive" } },
      { designation: { contains: filters.search, mode: "insensitive" } },
      { user: { fullName: { contains: filters.search, mode: "insensitive" } } },
      { user: { email: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  return where;
}

function buildOrderBy(
  sortBy: EmployeeSortBy,
  sortOrder: "asc" | "desc",
): Prisma.EmployeeOrderByWithRelationInput {
  if (sortBy === "fullName" || sortBy === "email") {
    return { user: { [sortBy]: sortOrder } };
  }
  return { [sortBy]: sortOrder };
}

export const employeeRepository = {
  create(data: Prisma.EmployeeCreateInput, client: Client = prisma) {
    return client.employee.create({ data, include: withUser });
  },

  findByUserId(userId: string) {
    return prisma.employee.findUnique({ where: { userId }, include: withUser });
  },

  findById(id: string) {
    return prisma.employee.findFirst({ where: { id, isDeleted: false }, include: withUser });
  },

  async findMany(filters: EmployeeListFilters): Promise<{ items: EmployeeWithUser[]; total: number }> {
    const where = buildWhere(filters);
    const orderBy = buildOrderBy(filters.sortBy, filters.sortOrder);

    const [items, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        orderBy,
        skip: filters.skip,
        take: filters.take,
        include: withUser,
      }),
      prisma.employee.count({ where }),
    ]);

    return { items, total };
  },

  update(id: string, data: Prisma.EmployeeUpdateInput, client: Client = prisma) {
    return client.employee.update({ where: { id }, data, include: withUser });
  },
};
