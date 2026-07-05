import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/common/Pagination";
import {
  useListNotificationsQuery,
  useMarkAllNotificationsAsReadMutation,
  useMarkNotificationAsReadMutation,
} from "@/redux/api/notificationApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

export function NotificationCenterPage() {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useListNotificationsQuery({ page, limit: 10 });
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsAsReadMutation();

  const result = data?.data;

  async function handleMarkAllAsRead() {
    try {
      await markAllAsRead().unwrap();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <Button variant="outline" size="sm" disabled={isMarkingAll} onClick={handleMarkAllAsRead}>
          Mark all as read
        </Button>
      </div>

      {isFetching && !result ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !result?.items.length ? (
        <p className="text-muted-foreground">No notifications yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {result.items.map((notification) => (
            <li
              key={notification.id}
              className={`flex items-center justify-between px-4 py-3 ${notification.isRead ? "" : "bg-accent/50"}`}
            >
              <div>
                <p className="text-sm">{notification.message}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
              {!notification.isRead && (
                <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                  Mark read
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {result && result.totalPages > 1 && (
        <Pagination page={result.page} totalPages={result.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
