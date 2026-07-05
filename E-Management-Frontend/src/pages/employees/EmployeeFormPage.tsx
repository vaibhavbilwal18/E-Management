import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { EmployeeForm } from "@/forms/employee/EmployeeForm";
import {
  useCreateEmployeeMutation,
  useGetEmployeeQuery,
  useUpdateEmployeeMutation,
} from "@/redux/api/employeeApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import type { EmployeeFormValues } from "@/forms/employee/schemas";

export function EmployeeFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: employeeData, isLoading: isLoadingEmployee } = useGetEmployeeQuery(id ?? "", {
    skip: !id,
  });
  const [createEmployee, { isLoading: isCreating }] = useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: isUpdating }] = useUpdateEmployeeMutation();

  async function handleSubmit(values: EmployeeFormValues) {
    try {
      if (isEdit && id) {
        await updateEmployee({ id, data: values }).unwrap();
        toast.success("Employee updated");
      } else {
        const result = await createEmployee(values).unwrap();
        toast.success(
          `Employee created. Temporary password: ${result.data.tempPassword} — share this securely, it won't be shown again.`,
          { duration: 15000 },
        );
      }
      navigate("/employees");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  if (isEdit && isLoadingEmployee) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  const employee = employeeData?.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{isEdit ? "Edit Employee" : "Add Employee"}</h1>
      <EmployeeForm
        defaultValues={
          employee
            ? {
                fullName: employee.user.fullName,
                email: employee.user.email,
                department: employee.department,
                designation: employee.designation,
              }
            : undefined
        }
        onSubmit={handleSubmit}
        isSubmitting={isCreating || isUpdating}
        submitLabel={isEdit ? "Save changes" : "Create employee"}
      />
    </div>
  );
}
