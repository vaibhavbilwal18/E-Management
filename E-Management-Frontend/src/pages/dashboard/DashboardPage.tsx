import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Link } from "react-router-dom";
import { useAppSelector } from "@/hooks/useAppDispatch";
import { useGetAdminDashboardQuery, useGetEmployeeDashboardQuery } from "@/redux/api/dashboardApi";

const STATUS_COLORS: Record<string, string> = {
  Pending: "#f59e0b",
  "In Progress": "#3b82f6",
  Completed: "#22c55e",
  Overdue: "#ef4444",
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatusPieChart({ data }: { data: { name: string; value: number }[] }) {
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return <p className="text-sm text-muted-foreground">No tasks to chart yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label
          isAnimationActive={false}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#94a3b8"} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function AdminDashboardView() {
  const { data, isFetching } = useGetAdminDashboardQuery();
  const dashboard = data?.data;

  if (isFetching && !dashboard) {
    return <p className="text-muted-foreground">Loading dashboard...</p>;
  }
  if (!dashboard) return null;

  const chartData = [
    { name: "Pending", value: dashboard.totals.pending },
    { name: "In Progress", value: dashboard.totals.inProgress },
    { name: "Completed", value: dashboard.totals.completed },
    { name: "Overdue", value: dashboard.totals.overdue },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Employees" value={dashboard.totals.employees} />
        <StatCard label="Total Tasks" value={dashboard.totals.tasks} />
        <StatCard label="Pending" value={dashboard.totals.pending} />
        <StatCard label="In Progress" value={dashboard.totals.inProgress} />
        <StatCard label="Completed" value={dashboard.totals.completed} />
        <StatCard label="Overdue" value={dashboard.totals.overdue} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Task Status Breakdown</h2>
          <StatusPieChart data={chartData} />
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Recent Activity</h2>
          {dashboard.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
              {dashboard.recentActivity.map((log) => (
                <li key={log.id} className="flex items-center justify-between border-b pb-1 last:border-0">
                  <span>
                    <span className="font-medium">{log.user?.fullName ?? "System"}</span>{" "}
                    {log.action.toLowerCase()} {log.entity.toLowerCase()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EmployeeDashboardView() {
  const { data, isFetching } = useGetEmployeeDashboardQuery();
  const dashboard = data?.data;

  if (isFetching && !dashboard) {
    return <p className="text-muted-foreground">Loading dashboard...</p>;
  }
  if (!dashboard) return null;

  const chartData = [
    { name: "Pending", value: dashboard.tasksByStatus.pending },
    { name: "In Progress", value: dashboard.tasksByStatus.inProgress },
    { name: "Completed", value: dashboard.tasksByStatus.completed },
    { name: "Overdue", value: dashboard.tasksByStatus.overdue },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Pending" value={dashboard.tasksByStatus.pending} />
        <StatCard label="In Progress" value={dashboard.tasksByStatus.inProgress} />
        <StatCard label="Completed" value={dashboard.tasksByStatus.completed} />
        <StatCard label="Overdue" value={dashboard.tasksByStatus.overdue} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">My Task Status</h2>
          <StatusPieChart data={chartData} />
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Upcoming Deadlines</h2>
          {dashboard.upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {dashboard.upcomingDeadlines.map((task) => (
                <li key={task.id} className="flex items-center justify-between border-b pb-1 last:border-0">
                  <Link to="/tasks" className="font-medium hover:underline">
                    {task.title}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {task.priority} · due {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {user?.fullName}</h1>
        <p className="text-muted-foreground">
          Role: {user?.role}
          {user?.employee ? ` · ${user.employee.designation} · ${user.employee.department}` : null}
        </p>
      </div>

      {isAdmin ? <AdminDashboardView /> : <EmployeeDashboardView />}
    </div>
  );
}
