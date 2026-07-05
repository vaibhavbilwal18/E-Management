import type { Request, Response } from "express";
import { employeeService } from "../services/employee.service";
import { sendSuccess } from "../utils/apiResponse";
import { listEmployeesQuerySchema } from "../validators/employee.validator";
import type { EmployeeWithUser } from "../repositories/employee.repository";

function toPublicEmployee(employee: EmployeeWithUser) {
  const { user, ...rest } = employee;
  const {
    passwordHash: _passwordHash,
    resetPasswordToken: _resetPasswordToken,
    resetPasswordExpires: _resetPasswordExpires,
    ...publicUser
  } = user;
  return { ...rest, user: publicUser };
}

export const employeeController = {
  async list(req: Request, res: Response) {
    const query = listEmployeesQuerySchema.parse(req.query);
    const result = await employeeService.list(query);
    sendSuccess(res, { ...result, items: result.items.map(toPublicEmployee) });
  },

  async getById(req: Request<{ id: string }>, res: Response) {
    const employee = await employeeService.getById(req.params.id);
    sendSuccess(res, toPublicEmployee(employee));
  },

  async create(req: Request, res: Response) {
    const { employee, tempPassword } = await employeeService.create(req.body, req.user!.id);
    sendSuccess(
      res,
      { employee: toPublicEmployee(employee), tempPassword },
      "Employee created",
      201,
    );
  },

  async update(req: Request<{ id: string }>, res: Response) {
    const employee = await employeeService.update(req.params.id, req.body, req.user!.id);
    sendSuccess(res, toPublicEmployee(employee), "Employee updated");
  },

  async remove(req: Request<{ id: string }>, res: Response) {
    await employeeService.remove(req.params.id, req.user!.id);
    sendSuccess(res, null, "Employee deleted");
  },
};
