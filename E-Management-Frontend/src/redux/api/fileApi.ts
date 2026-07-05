import { baseApi } from "./baseApi";
import type { ApiEnvelope } from "@/types/api.types";
import type { TaskFile } from "@/types/file.types";

export const fileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listTaskFiles: builder.query<ApiEnvelope<TaskFile[]>, string>({
      query: (taskId) => ({ url: `/tasks/${taskId}/attachments`, method: "GET" }),
      providesTags: (result, _error, taskId) =>
        result
          ? [
              ...result.data.map((file) => ({ type: "File" as const, id: file.id })),
              { type: "File" as const, id: `TASK_${taskId}` },
            ]
          : [{ type: "File" as const, id: `TASK_${taskId}` }],
    }),

    uploadTaskFile: builder.mutation<ApiEnvelope<TaskFile>, { taskId: string; file: File }>({
      query: ({ taskId, file }) => {
        const formData = new FormData();
        formData.append("file", file);
        return { url: `/tasks/${taskId}/attachments`, method: "POST", data: formData };
      },
      invalidatesTags: (_result, _error, { taskId }) => [{ type: "File", id: `TASK_${taskId}` }],
    }),

    deleteTaskFile: builder.mutation<ApiEnvelope<null>, { id: string; taskId: string }>({
      query: ({ id }) => ({ url: `/attachments/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, { id, taskId }) => [
        { type: "File", id },
        { type: "File", id: `TASK_${taskId}` },
      ],
    }),
  }),
});

export const { useListTaskFilesQuery, useUploadTaskFileMutation, useDeleteTaskFileMutation } = fileApi;
