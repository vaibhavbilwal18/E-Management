import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { useAppSelector } from "@/hooks/useAppDispatch";
import { AuthLayout } from "@/layouts/AuthLayout";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { EmployeeListPage } from "@/pages/employees/EmployeeListPage";
import { EmployeeFormPage } from "@/pages/employees/EmployeeFormPage";
import { TaskListPage } from "@/pages/tasks/TaskListPage";
import { TaskFormPage } from "@/pages/tasks/TaskFormPage";
import { NotificationCenterPage } from "@/pages/notifications/NotificationCenterPage";
import { ReportsPage } from "@/pages/reports/ReportsPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute } from "./RoleRoute";

function RootRedirect() {
  const user = useAppSelector((state) => state.auth.user);
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

const router = createBrowserRouter([
  { path: "/", element: <RootRedirect /> },
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/tasks", element: <TaskListPage /> },
          { path: "/notifications", element: <NotificationCenterPage /> },
          {
            element: <RoleRoute roles={["ADMIN"]} />,
            children: [
              { path: "/employees", element: <EmployeeListPage /> },
              { path: "/employees/new", element: <EmployeeFormPage /> },
              { path: "/employees/:id/edit", element: <EmployeeFormPage /> },
              { path: "/tasks/new", element: <TaskFormPage /> },
              { path: "/tasks/:id/edit", element: <TaskFormPage /> },
              { path: "/reports", element: <ReportsPage /> },
            ],
          },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
