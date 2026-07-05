import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { TaskForm } from "@/forms/task/TaskForm";
import { useCreateTaskMutation, useGetTaskQuery, useUpdateTaskMutation } from "@/redux/api/taskApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import type { TaskFormValues } from "@/forms/task/schemas";

export function TaskFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: taskData, isLoading: isLoadingTask } = useGetTaskQuery(id ?? "", { skip: !id });
  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();

  async function handleSubmit(values: TaskFormValues) {
    try {
      if (isEdit && id) {
        await updateTask({ id, data: values }).unwrap();
        toast.success("Task updated");
      } else {
        await createTask(values).unwrap();
        toast.success("Task created");
      }
      navigate("/tasks");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  if (isEdit && isLoadingTask) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  const task = taskData?.data;

  if (isEdit && task?.status === "COMPLETED") {
    return <p className="text-muted-foreground">Completed tasks cannot be edited.</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{isEdit ? "Edit Task" : "Add Task"}</h1>
      <TaskForm
        defaultValues={
          task
            ? {
                title: task.title,
                description: task.description,
                priority: task.priority,
                status: task.status === "OVERDUE" ? "PENDING" : task.status,
                startDate: task.startDate.slice(0, 10),
                dueDate: task.dueDate.slice(0, 10),
                assignedToId: task.assignedToId,
              }
            : undefined
        }
        onSubmit={handleSubmit}
        isSubmitting={isCreating || isUpdating}
        submitLabel={isEdit ? "Save changes" : "Create task"}
      />
    </div>
  );
}
