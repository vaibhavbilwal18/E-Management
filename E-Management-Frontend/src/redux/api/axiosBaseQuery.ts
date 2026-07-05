import type { BaseQueryFn } from "@reduxjs/toolkit/query/react";
import type { AxiosError, AxiosRequestConfig, Method } from "axios";
import { api } from "@/services/axios";

interface AxiosBaseQueryArgs {
  url: string;
  method?: Method;
  data?: unknown;
  params?: AxiosRequestConfig["params"];
}

interface AxiosBaseQueryError {
  status?: number;
  message: string;
}

export function axiosBaseQuery(): BaseQueryFn<AxiosBaseQueryArgs, unknown, AxiosBaseQueryError> {
  return async ({ url, method = "GET", data, params }) => {
    try {
      const result = await api.request({ url, method, data, params });
      return { data: result.data };
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      return {
        error: {
          status: error.response?.status,
          message: error.response?.data?.message ?? error.message,
        },
      };
    }
  };
}
