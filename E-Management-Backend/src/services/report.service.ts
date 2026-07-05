import ExcelJS from "exceljs";
import { createObjectCsvStringifier } from "csv-writer";
import { TaskStatus } from "@prisma/client";
import { reportRepository, type EmployeeWithTasks, type ReportTask } from "../repositories/report.repository";
import { AppError } from "../utils/AppError";

export type ReportType = "completed" | "pending" | "employee-wise";
export type ReportFormat = "excel" | "csv";

function isOverdue(task: { status: TaskStatus; dueDate: Date }): boolean {
  return task.status !== TaskStatus.COMPLETED && task.dueDate < new Date();
}

function toTaskRow(task: ReportTask) {
  return {
    title: task.title,
    priority: task.priority,
    status: task.status,
    assignedTo: task.assignedTo.user.fullName,
    department: task.assignedTo.department,
    startDate: task.startDate,
    dueDate: task.dueDate,
    completedAt: task.completedAt,
    isOverdue: isOverdue(task),
  };
}

function toEmployeeRow(employee: EmployeeWithTasks) {
  const total = employee.assignedTasks.length;
  const completed = employee.assignedTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
  const pending = employee.assignedTasks.filter((t) => t.status === TaskStatus.PENDING).length;
  const inProgress = employee.assignedTasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
  const overdue = employee.assignedTasks.filter(isOverdue).length;

  return {
    fullName: employee.user.fullName,
    email: employee.user.email,
    department: employee.department,
    designation: employee.designation,
    totalTasks: total,
    pending,
    inProgress,
    completed,
    overdue,
  };
}

async function getRows(type: ReportType) {
  if (type === "completed") {
    const tasks = await reportRepository.completedTasks();
    return tasks.map(toTaskRow);
  }
  if (type === "pending") {
    const tasks = await reportRepository.pendingTasks();
    return tasks.map(toTaskRow);
  }
  const employees = await reportRepository.employeesWithTasks();
  return employees.map(toEmployeeRow);
}

const TASK_COLUMNS = [
  { header: "Title", key: "title" },
  { header: "Priority", key: "priority" },
  { header: "Status", key: "status" },
  { header: "Assigned To", key: "assignedTo" },
  { header: "Department", key: "department" },
  { header: "Start Date", key: "startDate" },
  { header: "Due Date", key: "dueDate" },
  { header: "Completed At", key: "completedAt" },
  { header: "Overdue", key: "isOverdue" },
];

const EMPLOYEE_COLUMNS = [
  { header: "Full Name", key: "fullName" },
  { header: "Email", key: "email" },
  { header: "Department", key: "department" },
  { header: "Designation", key: "designation" },
  { header: "Total Tasks", key: "totalTasks" },
  { header: "Pending", key: "pending" },
  { header: "In Progress", key: "inProgress" },
  { header: "Completed", key: "completed" },
  { header: "Overdue", key: "overdue" },
];

function columnsFor(type: ReportType) {
  return type === "employee-wise" ? EMPLOYEE_COLUMNS : TASK_COLUMNS;
}

const SHEET_TITLES: Record<ReportType, string> = {
  completed: "Completed Tasks",
  pending: "Pending Tasks",
  "employee-wise": "Employee Summary",
};

async function toExcelBuffer(type: ReportType, rows: Record<string, unknown>[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(SHEET_TITLES[type]);
  sheet.columns = columnsFor(type);
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));
  sheet.columns.forEach((column) => {
    column.width = 20;
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function toCsvSafeRow(row: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    safe[key] = value instanceof Date ? value.toLocaleDateString() : value;
  }
  return safe;
}

function toCsvString(type: ReportType, rows: Record<string, unknown>[]): string {
  const columns = columnsFor(type);
  const stringifier = createObjectCsvStringifier({
    header: columns.map((c) => ({ id: c.key, title: c.header })),
  });
  return stringifier.getHeaderString()! + stringifier.stringifyRecords(rows.map(toCsvSafeRow));
}

export const reportService = {
  completedTasks() {
    return reportRepository.completedTasks().then((tasks) => tasks.map(toTaskRow));
  },

  pendingTasks() {
    return reportRepository.pendingTasks().then((tasks) => tasks.map(toTaskRow));
  },

  employeeWise() {
    return reportRepository.employeesWithTasks().then((employees) => employees.map(toEmployeeRow));
  },

  async export(
    type: ReportType,
    format: ReportFormat,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const rows = await getRows(type);
    if (rows.length === 0) {
      throw AppError.notFound("No data available for this report");
    }

    const filenameBase = `${type}-report-${new Date().toISOString().slice(0, 10)}`;

    if (format === "excel") {
      const buffer = await toExcelBuffer(type, rows as Record<string, unknown>[]);
      return {
        buffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: `${filenameBase}.xlsx`,
      };
    }

    const csv = toCsvString(type, rows as Record<string, unknown>[]);
    return { buffer: Buffer.from(csv, "utf-8"), contentType: "text/csv", filename: `${filenameBase}.csv` };
  },
};
