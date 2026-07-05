import { describe, expect, it } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import authReducer, { sessionChanged } from "@/redux/slices/authSlice";
import { RoleRoute } from "./RoleRoute";
import type { PublicUser } from "@/types/auth.types";

function renderWithUser(user: PublicUser | null) {
  const store = configureStore({ reducer: { auth: authReducer } });
  if (user) {
    store.dispatch(sessionChanged({ user, accessToken: "token" }));
  }

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/employees"]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/" element={<div>Dashboard Page</div>} />
          <Route element={<RoleRoute roles={["ADMIN"]} />}>
            <Route path="/employees" element={<div>Employees Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

const adminUser: PublicUser = {
  id: "1",
  fullName: "Admin User",
  email: "admin@example.com",
  role: "ADMIN",
  isActive: true,
  createdAt: "",
  updatedAt: "",
};

const employeeUser: PublicUser = {
  ...adminUser,
  id: "2",
  role: "EMPLOYEE",
};

describe("RoleRoute", () => {
  it("redirects to /login when there is no user", () => {
    renderWithUser(null);
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("redirects to / when the user's role is not allowed", () => {
    renderWithUser(employeeUser);
    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
  });

  it("renders the nested route when the user's role is allowed", () => {
    renderWithUser(adminUser);
    expect(screen.getByText("Employees Page")).toBeInTheDocument();
  });
});
