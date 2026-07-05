import { baseApi } from "./baseApi";
import type { ApiEnvelope } from "@/types/api.types";
import type { AdminDashboard, EmployeeDashboard } from "@/types/dashboard.types";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminDashboard: builder.query<ApiEnvelope<AdminDashboard>, void>({
      query: () => ({ url: "/dashboard/admin", method: "GET" }),
      providesTags: ["Dashboard"],
    }),

    getEmployeeDashboard: builder.query<ApiEnvelope<EmployeeDashboard>, void>({
      query: () => ({ url: "/dashboard/employee", method: "GET" }),
      providesTags: ["Dashboard"],
    }),
  }),
});

export const { useGetAdminDashboardQuery, useGetEmployeeDashboardQuery } = dashboardApi;
