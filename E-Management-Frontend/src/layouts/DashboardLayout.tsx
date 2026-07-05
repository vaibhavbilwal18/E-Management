import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAppSelector } from "@/hooks/useAppDispatch";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/common/NotificationBell";
import { useLogoutMutation } from "@/redux/api/authApi";

export function DashboardLayout() {
  const user = useAppSelector((state) => state.auth.user);
  const [logout] = useLogoutMutation();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <nav className="flex items-center gap-4 text-sm font-medium">
          <span className="text-base font-semibold">ETMS</span>
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
          <Link to="/tasks" className="text-muted-foreground hover:text-foreground">
            Tasks
          </Link>
          {user?.role === "ADMIN" && (
            <>
              <Link to="/employees" className="text-muted-foreground hover:text-foreground">
                Employees
              </Link>
              <Link to="/reports" className="text-muted-foreground hover:text-foreground">
                Reports
              </Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <NotificationBell />
          <span className="text-muted-foreground">{user?.fullName}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
