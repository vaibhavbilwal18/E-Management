import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useListNotificationsQuery } from "@/redux/api/notificationApi";

export function NotificationBell() {
  const { data } = useListNotificationsQuery({ page: 1, limit: 1 });
  const unreadCount = data?.data.unreadCount ?? 0;

  return (
    <Link to="/notifications" className="relative inline-flex items-center">
      <Bell className="size-5 text-muted-foreground" />
      {unreadCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
