import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getAccessToken } from "./sessionBridge";
import { refreshSession } from "./refreshSession";

const baseURL = import.meta.env.VITE_API_BASE_URL;

export const api = axios.create({
  baseURL,
  withCredentials: true,
  // Backend and frontend run on different ports (different origins), so axios's
  // XSRF cookie mirroring must be explicitly opted into for cross-origin requests.
  withXSRFToken: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "x-xsrf-token",
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

const AUTH_FLOW_PATHS = ["/auth/login", "/auth/register", "/auth/refresh"];

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined;
    const url = originalRequest?.url ?? "";
    const isAuthFlowRequest = AUTH_FLOW_PATHS.some((path) => url.includes(path));

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthFlowRequest) {
      originalRequest._retry = true;

      const session = await refreshSession();

      if (session) {
        originalRequest.headers.set("Authorization", `Bearer ${session.accessToken}`);
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);
