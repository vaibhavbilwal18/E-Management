import { baseApi } from "./baseApi";
import type { ApiEnvelope } from "@/types/api.types";
import type { EmployeeReportRow, TaskReportRow } from "@/types/report.types";

export const reportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCompletedTasksReport: builder.query<ApiEnvelope<TaskReportRow[]>, void>({
      query: () => ({ url: "/reports/completed-tasks", method: "GET" }),
      providesTags: ["Report"],
    }),

    getPendingTasksReport: builder.query<ApiEnvelope<TaskReportRow[]>, void>({
      query: () => ({ url: "/reports/pending-tasks", method: "GET" }),
      providesTags: ["Report"],
    }),

    getEmployeeWiseReport: builder.query<ApiEnvelope<EmployeeReportRow[]>, void>({
      query: () => ({ url: "/reports/employee-wise", method: "GET" }),
      providesTags: ["Report"],
    }),
  }),
});

export const { useGetCompletedTasksReportQuery, useGetPendingTasksReportQuery, useGetEmployeeWiseReportQuery } =
  reportApi;
