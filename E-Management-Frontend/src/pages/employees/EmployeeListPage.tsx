import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/common/DataTable";
import { SearchBar } from "@/components/common/SearchBar";
import { Pagination } from "@/components/common/Pagination";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useDebounce } from "@/hooks/useDebounce";
import { useDeleteEmployeeMutation, useListEmployeesQuery } from "@/redux/api/employeeApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import type { Employee, ListEmployeesParams } from "@/types/employee.types";

export function EmployeeListPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const sort = sorting[0];
  const sortBy = (sort?.id as ListEmployeesParams["sortBy"]) ?? "createdAt";
  const sortOrder = sort?.desc ? "desc" : "asc";

  const { data, isFetching } = useListEmployeesQuery({
    search: debouncedSearch || undefined,
    page,
    limit: 10,
    sortBy,
    sortOrder,
  });

  const [deleteEmployee, { isLoading: isDeleting }] = useDeleteEmployeeMutation();

  const columns = useMemo<ColumnDef<Employee, unknown>[]>(
    () => [
      { id: "fullName", accessorKey: "user.fullName", header: "Name" },
      { id: "email", accessorKey: "user.email", header: "Email" },
      { id: "department", accessorKey: "department", header: "Department" },
      { id: "designation", accessorKey: "designation", header: "Designation" },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Link to={`/employees/${row.original.id}/edit`}>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </Link>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(row.original)}>
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteEmployee(deleteTarget.id).unwrap();
      toast.success("Employee deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  const result = data?.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Employees</h1>
        <Link to="/employees/new">
          <Button>Add Employee</Button>
        </Link>
      </div>

      <SearchBar
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        placeholder="Search by name, email, department..."
      />

      <DataTable
        columns={columns}
        data={result?.items ?? []}
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={isFetching}
        emptyMessage="No employees found."
      />

      {result && result.totalPages > 1 && (
        <Pagination page={result.page} totalPages={result.totalPages} onPageChange={setPage} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.user.fullName}?`}
        description="This employee will be soft-deleted and their login disabled. This cannot be undone from the UI."
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
