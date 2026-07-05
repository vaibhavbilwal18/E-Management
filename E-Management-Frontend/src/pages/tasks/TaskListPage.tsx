import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/common/DataTable";
import { SearchBar } from "@/components/common/SearchBar";
import { Pagination } from "@/components/common/Pagination";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { TaskAttachmentsDialog } from "@/components/tasks/TaskAttachmentsDialog";
import { useDebounce } from "@/hooks/useDebounce";
import { useAppSelector } from "@/hooks/useAppDispatch";
import { useDeleteTaskMutation, useListTasksQuery, useUpdateTaskMutation } from "@/redux/api/taskApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import type { ListTasksParams, Task } from "@/types/task.types";

const STATUS_OPTIONS = ["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"] as const;
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const selectClassName =
  "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function TaskListPage() {
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = user?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([{ id: "dueDate", desc: false }]);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [attachmentsTarget, setAttachmentsTarget] = useState<Task | null>(null);

  const sort = sorting[0];
  const sortBy = (sort?.id as ListTasksParams["sortBy"]) ?? "dueDate";
  const sortOrder = sort?.desc ? "desc" : "asc";

  const { data, isFetching } = useListTasksQuery({
    search: debouncedSearch || undefined,
    status: (status || undefined) as ListTasksParams["status"],
    priority: (priority || undefined) as ListTasksParams["priority"],
    page,
    limit: 10,
    sortBy,
    sortOrder,
  });

  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();
  const [updateTask, { isLoading: isUpdatingStatus }] = useUpdateTaskMutation();

  async function handleStatusChange(task: Task, nextStatus: "IN_PROGRESS" | "COMPLETED") {
    try {
      await updateTask({ id: task.id, data: { status: nextStatus } }).unwrap();
      toast.success(nextStatus === "COMPLETED" ? "Task marked complete" : "Task started");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteTask(deleteTarget.id).unwrap();
      toast.success("Task deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  const columns = useMemo<ColumnDef<Task, unknown>[]>(() => {
    const base: ColumnDef<Task, unknown>[] = [
      { id: "title", accessorKey: "title", header: "Title" },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <span>{row.original.isOverdue ? "OVERDUE" : row.original.status}</span>,
      },
      { id: "priority", accessorKey: "priority", header: "Priority" },
      {
        id: "startDate",
        accessorKey: "startDate",
        header: "Start",
        cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString(),
      },
      {
        id: "dueDate",
        accessorKey: "dueDate",
        header: "Due",
        cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString(),
      },
    ];

    if (isAdmin) {
      base.push({
        id: "assignee",
        header: "Assigned To",
        enableSorting: false,
        cell: ({ row }) => row.original.assignedTo.user.fullName,
      });
    }

    base.push({
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const task = row.original;
        const isCompleted = task.status === "COMPLETED";

        if (isAdmin) {
          return (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAttachmentsTarget(task)}>
                Attachments
              </Button>
              <Link to={`/tasks/${task.id}/edit`}>
                <Button variant="outline" size="sm" disabled={isCompleted}>
                  Edit
                </Button>
              </Link>
              <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(task)}>
                Delete
              </Button>
            </div>
          );
        }

        return (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setAttachmentsTarget(task)}>
              Attachments
            </Button>
            {isCompleted ? (
              <span className="self-center text-sm text-muted-foreground">Completed</span>
            ) : (
              <>
                {task.status === "PENDING" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusChange(task, "IN_PROGRESS")}
                  >
                    Start
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusChange(task, "COMPLETED")}
                >
                  Mark Complete
                </Button>
              </>
            )}
          </div>
        );
      },
    });

    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isUpdatingStatus]);

  const result = data?.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        {isAdmin && (
          <Link to="/tasks/new">
            <Button>Add Task</Button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by title or description..."
        />
        <select
          className={selectClassName}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className={selectClassName}
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All priorities</option>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={result?.items ?? []}
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={isFetching}
        emptyMessage="No tasks found."
      />

      {result && result.totalPages > 1 && (
        <Pagination page={result.page} totalPages={result.totalPages} onPageChange={setPage} />
      )}

      {isAdmin && (
        <ConfirmDialog
          open={!!deleteTarget}
          title={`Delete "${deleteTarget?.title}"?`}
          description="This will permanently delete the task."
          confirmLabel="Delete"
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {attachmentsTarget && (
        <TaskAttachmentsDialog
          taskId={attachmentsTarget.id}
          taskTitle={attachmentsTarget.title}
          onClose={() => setAttachmentsTarget(null)}
        />
      )}
    </div>
  );
}
