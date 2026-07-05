import { api } from "./axios";
import type { ReportFormat, ReportType } from "@/types/report.types";

function extensionFor(format: ReportFormat): string {
  return format === "excel" ? "xlsx" : "csv";
}

export async function downloadReportExport(type: ReportType, format: ReportFormat): Promise<void> {
  const response = await api.get("/reports/export", {
    params: { type, format },
    responseType: "blob",
  });

  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${type}-report.${extensionFor(format)}`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}
