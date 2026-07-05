import { baseApi } from "./baseApi";
import type { ApiEnvelope } from "@/types/api.types";
import type { ListNotificationsParams, Notification, PaginatedResult } from "@/types/notification.types";

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listNotifications: builder.query<
      ApiEnvelope<PaginatedResult<Notification>>,
      ListNotificationsParams
    >({
      query: (params) => ({ url: "/notifications", method: "GET", params }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.items.map((n) => ({ type: "Notification" as const, id: n.id })),
              { type: "Notification" as const, id: "LIST" },
            ]
          : [{ type: "Notification" as const, id: "LIST" }],
    }),

    markNotificationAsRead: builder.mutation<ApiEnvelope<null>, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "PATCH" }),
      invalidatesTags: [{ type: "Notification", id: "LIST" }],
    }),

    markAllNotificationsAsRead: builder.mutation<ApiEnvelope<null>, void>({
      query: () => ({ url: "/notifications/read-all", method: "PATCH" }),
      invalidatesTags: [{ type: "Notification", id: "LIST" }],
    }),
  }),
});

export const {
  useListNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} = notificationApi;
