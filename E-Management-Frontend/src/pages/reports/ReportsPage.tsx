import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  useGetCompletedTasksReportQuery,
  useGetEmployeeWiseReportQuery,
  useGetPendingTasksReportQuery,
} from "@/redux/api/reportApi";
import { downloadReportExport } from "@/services/reportExport";
import type { EmployeeReportRow, ReportFormat, ReportType, TaskReportRow } from "@/types/report.types";

const REPORT_TABS: { value: ReportType; label: string }[] = [
  { value: "completed", label: "Completed Tasks" },
  { value: "pending", label: "Pending Tasks" },
  { value: "employee-wise", label: "Employee Summary" },
];

function TaskReportTable({ rows }: { rows: TaskReportRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No data for this report.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Title</th>
            <th className="px-4 py-2 text-left font-medium">Priority</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-left font-medium">Assigned To</th>
            <th className="px-4 py-2 text-left font-medium">Department</th>
            <th className="px-4 py-2 text-left font-medium">Due Date</th>
            <th className="px-4 py-2 text-left font-medium">Completed At</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t">
              <td className="px-4 py-2">{row.title}</td>
              <td className="px-4 py-2">{row.priority}</td>
              <td className="px-4 py-2">{row.isOverdue ? "OVERDUE" : row.status}</td>
              <td className="px-4 py-2">{row.assignedTo}</td>
              <td className="px-4 py-2">{row.department}</td>
              <td className="px-4 py-2">{new Date(row.dueDate).toLocaleDateString()}</td>
              <td className="px-4 py-2">
                {row.completedAt ? new Date(row.completedAt).toLocaleDateString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmployeeReportTable({ rows }: { rows: EmployeeReportRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No data for this report.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Employee</th>
            <th className="px-4 py-2 text-left font-medium">Department</th>
            <th className="px-4 py-2 text-left font-medium">Total</th>
            <th className="px-4 py-2 text-left font-medium">Pending</th>
            <th className="px-4 py-2 text-left font-medium">In Progress</th>
            <th className="px-4 py-2 text-left font-medium">Completed</th>
            <th className="px-4 py-2 text-left font-medium">Overdue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.email} className="border-t">
              <td className="px-4 py-2">
                <div>{row.fullName}</div>
                <div className="text-xs text-muted-foreground">{row.email}</div>
              </td>
              <td className="px-4 py-2">{row.department}</td>
              <td className="px-4 py-2">{row.totalTasks}</td>
              <td className="px-4 py-2">{row.pending}</td>
              <td className="px-4 py-2">{row.inProgress}</td>
              <td className="px-4 py-2">{row.completed}</td>
              <td className="px-4 py-2">{row.overdue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportsPage() {
  const [type, setType] = useState<ReportType>("completed");
  const [isExporting, setIsExporting] = useState(false);

  const completed = useGetCompletedTasksReportQuery(undefined, { skip: type !== "completed" });
  const pending = useGetPendingTasksReportQuery(undefined, { skip: type !== "pending" });
  const employeeWise = useGetEmployeeWiseReportQuery(undefined, { skip: type !== "employee-wise" });

  const isFetching =
    (type === "completed" && completed.isFetching) ||
    (type === "pending" && pending.isFetching) ||
    (type === "employee-wise" && employeeWise.isFetching);

  async function handleExport(format: ReportFormat) {
    setIsExporting(true);
    try {
      await downloadReportExport(type, format);
    } catch {
      toast.error("Failed to export report");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={isExporting} onClick={() => handleExport("csv")}>
            Export CSV
          </Button>
          <Button variant="outline" size="sm" disabled={isExporting} onClick={() => handleExport("excel")}>
            Export Excel
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {REPORT_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={type === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => setType(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isFetching ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : type === "completed" ? (
        <TaskReportTable rows={completed.data?.data ?? []} />
      ) : type === "pending" ? (
        <TaskReportTable rows={pending.data?.data ?? []} />
      ) : (
        <EmployeeReportTable rows={employeeWise.data?.data ?? []} />
      )}
    </div>
  );
}
