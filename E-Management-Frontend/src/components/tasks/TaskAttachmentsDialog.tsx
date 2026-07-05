import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/common/FileUpload";
import { useAppSelector } from "@/hooks/useAppDispatch";
import {
  useDeleteTaskFileMutation,
  useListTaskFilesQuery,
  useUploadTaskFileMutation,
} from "@/redux/api/fileApi";
import { downloadTaskFile } from "@/services/fileDownload";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import type { TaskFile } from "@/types/file.types";

interface TaskAttachmentsDialogProps {
  taskId: string | null;
  taskTitle?: string;
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskAttachmentsDialog({ taskId, taskTitle, onClose }: TaskAttachmentsDialogProps) {
  const user = useAppSelector((state) => state.auth.user);
  const { data, isFetching } = useListTaskFilesQuery(taskId ?? "", { skip: !taskId });
  const [uploadFile, { isLoading: isUploading }] = useUploadTaskFileMutation();
  const [deleteFile, { isLoading: isDeleting }] = useDeleteTaskFileMutation();

  if (!taskId) return null;

  const files = data?.data ?? [];

  async function handleUpload(file: File) {
    try {
      await uploadFile({ taskId: taskId!, file }).unwrap();
      toast.success("File uploaded");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleDownload(file: TaskFile) {
    try {
      await downloadTaskFile(file.id, file.originalName);
    } catch {
      toast.error("Failed to download file");
    }
  }

  async function handleDelete(file: TaskFile) {
    try {
      await deleteFile({ id: file.id, taskId: taskId! }).unwrap();
      toast.success("File deleted");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Attachments{taskTitle ? ` — ${taskTitle}` : ""}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {isFetching ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attachments yet.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {files.map((file) => (
                <li key={file.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="truncate text-left font-medium text-primary hover:underline"
                      onClick={() => handleDownload(file)}
                    >
                      {file.originalName}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.sizeBytes)} · {file.uploadedBy.fullName}
                    </p>
                  </div>
                  {(user?.role === "ADMIN" || user?.id === file.uploadedById) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isDeleting}
                      onClick={() => handleDelete(file)}
                    >
                      Delete
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4">
          <FileUpload onSelect={handleUpload} isUploading={isUploading} />
        </div>
      </div>
    </div>
  );
}
