import { baseApi } from "./baseApi";
import type { ApiEnvelope } from "@/types/api.types";
import type {
  CreateTaskRequest,
  ListTasksParams,
  PaginatedResult,
  Task,
  UpdateTaskRequest,
} from "@/types/task.types";

export const taskApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listTasks: builder.query<ApiEnvelope<PaginatedResult<Task>>, ListTasksParams>({
      query: (params) => ({ url: "/tasks", method: "GET", params }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.items.map((task) => ({ type: "Task" as const, id: task.id })),
              { type: "Task" as const, id: "LIST" },
            ]
          : [{ type: "Task" as const, id: "LIST" }],
    }),

    getTask: builder.query<ApiEnvelope<Task>, string>({
      query: (id) => ({ url: `/tasks/${id}`, method: "GET" }),
      providesTags: (_result, _error, id) => [{ type: "Task", id }],
    }),

    createTask: builder.mutation<ApiEnvelope<Task>, CreateTaskRequest>({
      query: (body) => ({ url: "/tasks", method: "POST", data: body }),
      invalidatesTags: [{ type: "Task", id: "LIST" }, "Dashboard"],
    }),

    updateTask: builder.mutation<ApiEnvelope<Task>, { id: string; data: UpdateTaskRequest }>({
      query: ({ id, data }) => ({ url: `/tasks/${id}`, method: "PUT", data }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Task", id },
        { type: "Task", id: "LIST" },
        "Dashboard",
      ],
    }),

    deleteTask: builder.mutation<ApiEnvelope<null>, string>({
      query: (id) => ({ url: `/tasks/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Task", id },
        { type: "Task", id: "LIST" },
        "Dashboard",
      ],
    }),
  }),
});

export const {
  useListTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} = taskApi;
