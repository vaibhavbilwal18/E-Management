import { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { userRepository } from "../repositories/user.repository";
import { employeeRepository } from "../repositories/employee.repository";
import { auditLogRepository } from "../repositories/auditLog.repository";
import { hashPassword } from "../utils/hash.util";
import { generateTempPassword } from "../utils/password.util";
import { AppError } from "../utils/AppError";
import { buildPaginatedResult } from "../utils/pagination";
import type {
  CreateEmployeeInput,
  ListEmployeesQuery,
  UpdateEmployeeInput,
} from "../validators/employee.validator";

export const employeeService = {
  async list(query: ListEmployeesQuery) {
    const skip = (query.page - 1) * query.limit;

    const { items, total } = await employeeRepository.findMany({
      search: query.search,
      department: query.department,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      skip,
      take: query.limit,
    });

    return buildPaginatedResult(items, total, { page: query.page, limit: query.limit });
  },

  async getById(id: string) {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw AppError.notFound("Employee not found");
    }
    return employee;
  },

  async create(input: CreateEmployeeInput, actorId: string) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict("An account with this email already exists");
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const employee = await prisma.$transaction(async (tx) => {
      const user = await userRepository.create(
        { fullName: input.fullName, email: input.email, passwordHash, role: Role.EMPLOYEE },
        tx,
      );

      const created = await employeeRepository.create(
        {
          department: input.department,
          designation: input.designation,
          user: { connect: { id: user.id } },
        },
        tx,
      );

      await auditLogRepository.create(
        { userId: actorId, action: "CREATE", entity: "Employee", entityId: created.id },
        tx,
      );

      return created;
    });

    return { employee, tempPassword };
  },

  async update(id: string, input: UpdateEmployeeInput, actorId: string) {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw AppError.notFound("Employee not found");
    }

    if (input.email && input.email !== employee.user.email) {
      const existing = await userRepository.findByEmail(input.email);
      if (existing) {
        throw AppError.conflict("An account with this email already exists");
      }
    }

    return prisma.$transaction(async (tx) => {
      if (input.fullName || input.email) {
        await tx.user.update({
          where: { id: employee.userId },
          data: { fullName: input.fullName, email: input.email },
        });
      }

      const updated = await employeeRepository.update(
        id,
        { department: input.department, designation: input.designation },
        tx,
      );

      await auditLogRepository.create(
        { userId: actorId, action: "UPDATE", entity: "Employee", entityId: id },
        tx,
      );

      return updated;
    });
  },

  async remove(id: string, actorId: string) {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw AppError.notFound("Employee not found");
    }

    await prisma.$transaction(async (tx) => {
      await employeeRepository.update(id, { isDeleted: true, deletedAt: new Date() }, tx);
      await tx.user.update({ where: { id: employee.userId }, data: { isActive: false } });
      await auditLogRepository.create(
        { userId: actorId, action: "DELETE", entity: "Employee", entityId: id },
        tx,
      );
    });
  },
};
