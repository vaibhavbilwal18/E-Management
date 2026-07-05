import { baseApi } from "./baseApi";
import type { ApiEnvelope } from "@/types/api.types";
import type {
  CreateEmployeeRequest,
  CreateEmployeeResponse,
  Employee,
  ListEmployeesParams,
  PaginatedResult,
  UpdateEmployeeRequest,
} from "@/types/employee.types";

export const employeeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listEmployees: builder.query<ApiEnvelope<PaginatedResult<Employee>>, ListEmployeesParams>({
      query: (params) => ({ url: "/employees", method: "GET", params }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.items.map((employee) => ({ type: "Employee" as const, id: employee.id })),
              { type: "Employee" as const, id: "LIST" },
            ]
          : [{ type: "Employee" as const, id: "LIST" }],
    }),

    getEmployee: builder.query<ApiEnvelope<Employee>, string>({
      query: (id) => ({ url: `/employees/${id}`, method: "GET" }),
      providesTags: (_result, _error, id) => [{ type: "Employee", id }],
    }),

    createEmployee: builder.mutation<ApiEnvelope<CreateEmployeeResponse>, CreateEmployeeRequest>({
      query: (body) => ({ url: "/employees", method: "POST", data: body }),
      invalidatesTags: [{ type: "Employee", id: "LIST" }],
    }),

    updateEmployee: builder.mutation<
      ApiEnvelope<Employee>,
      { id: string; data: UpdateEmployeeRequest }
    >({
      query: ({ id, data }) => ({ url: `/employees/${id}`, method: "PUT", data }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Employee", id },
        { type: "Employee", id: "LIST" },
      ],
    }),

    deleteEmployee: builder.mutation<ApiEnvelope<null>, string>({
      query: (id) => ({ url: `/employees/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Employee", id },
        { type: "Employee", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListEmployeesQuery,
  useGetEmployeeQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} = employeeApi;
