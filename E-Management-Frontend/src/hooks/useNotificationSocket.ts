import { useEffect } from "react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "./useAppDispatch";
import { connectSocket, disconnectSocket } from "@/services/socket";
import { baseApi } from "@/redux/api/baseApi";
import type { Notification } from "@/types/notification.types";

export function useNotificationSocket() {
  const userId = useAppSelector((state) => state.auth.user?.id);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!userId) return;

    const socket = connectSocket();

    function handleNewNotification(payload: Pick<Notification, "message">) {
      toast(payload.message, { icon: "🔔" });
      dispatch(baseApi.util.invalidateTags([{ type: "Notification", id: "LIST" }]));
    }

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
      disconnectSocket();
    };
  }, [userId, dispatch]);
}
