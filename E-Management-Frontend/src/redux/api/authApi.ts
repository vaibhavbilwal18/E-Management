import { baseApi } from "./baseApi";
import { setSession } from "@/services/sessionBridge";
import type { ApiEnvelope } from "@/types/api.types";
import type {
  AuthSessionResponse,
  ForgotPasswordRequest,
  LoginRequest,
  PublicUser,
  RegisterRequest,
  ResetPasswordRequest,
} from "@/types/auth.types";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<ApiEnvelope<PublicUser>, RegisterRequest>({
      query: (body) => ({ url: "/auth/register", method: "POST", data: body }),
    }),

    login: builder.mutation<ApiEnvelope<AuthSessionResponse>, LoginRequest>({
      query: (body) => ({ url: "/auth/login", method: "POST", data: body }),
      onQueryStarted: async (_arg, { queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          setSession(data.data);
        } catch {
          // Invalid credentials — no session change, error surfaces via `.unwrap()`.
        }
      },
    }),

    logout: builder.mutation<ApiEnvelope<null>, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      onQueryStarted: async (_arg, { queryFulfilled }) => {
        try {
          await queryFulfilled;
        } finally {
          setSession(null);
        }
      },
    }),

    forgotPassword: builder.mutation<ApiEnvelope<null>, ForgotPasswordRequest>({
      query: (body) => ({ url: "/auth/forgot-password", method: "POST", data: body }),
    }),

    resetPassword: builder.mutation<ApiEnvelope<null>, ResetPasswordRequest>({
      query: (body) => ({ url: "/auth/reset-password", method: "POST", data: body }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;
