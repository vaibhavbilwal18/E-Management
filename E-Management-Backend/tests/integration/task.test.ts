import type { Express } from "express";
import request from "supertest";
import { createApp } from "../../src/app";
import { resetDb, disconnectDb } from "../helpers/db";
import { createAdmin, createEmployee, futureDate } from "../helpers/factories";
import { authHeader, loginAs } from "../helpers/auth";

describe("Tasks", () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  async function setupAdminAndEmployee() {
    const admin = await createAdmin();
    const employee = await createEmployee();
    const adminToken = await loginAs(app, admin.email, admin.password);
    const employeeToken = await loginAs(app, employee.email, employee.password);
    return { admin, employee, adminToken, employeeToken };
  }

  function validTaskPayload(assignedToId: string) {
    return {
      title: "Write the quarterly report",
      description: "Summarize Q3 performance",
      priority: "MEDIUM",
      assignedToId,
      startDate: futureDate(0).toISOString(),
      dueDate: futureDate(5).toISOString(),
    };
  }

  describe("POST /api/tasks (create)", () => {
    it("allows an Admin to create a task", async () => {
      const { employee, adminToken } = await setupAdminAndEmployee();

      const res = await request(app)
        .post("/api/tasks")
        .set(authHeader(adminToken))
        .send(validTaskPayload(employee.employee.id));

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("PENDING");
    });

    it("rejects an Employee trying to create a task with 403", async () => {
      const { employee, employeeToken } = await setupAdminAndEmployee();

      const res = await request(app)
        .post("/api/tasks")
        .set(authHeader(employeeToken))
        .send(validTaskPayload(employee.employee.id));

      expect(res.status).toBe(403);
    });

    it("rejects dueDate before startDate with 422", async () => {
      const { employee, adminToken } = await setupAdminAndEmployee();

      const res = await request(app)
        .post("/api/tasks")
        .set(authHeader(adminToken))
        .send({
          ...validTaskPayload(employee.employee.id),
          startDate: futureDate(5).toISOString(),
          dueDate: futureDate(1).toISOString(),
        });

      expect(res.status).toBe(422);
    });

    it("rejects an unauthenticated request with 401", async () => {
      const { employee } = await setupAdminAndEmployee();
      const res = await request(app).post("/api/tasks").send(validTaskPayload(employee.employee.id));
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/tasks/:id (update)", () => {
    it("restricts an Employee to only updating status", async () => {
      const { employee, adminToken, employeeToken } = await setupAdminAndEmployee();
      const created = await request(app)
        .post("/api/tasks")
        .set(authHeader(adminToken))
        .send(validTaskPayload(employee.employee.id));
      const taskId = created.body.data.id;

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set(authHeader(employeeToken))
        .send({ title: "Trying to rename" });

      expect(res.status).toBe(403);
    });

    it("allows an Employee to update their own task's status", async () => {
      const { employee, adminToken, employeeToken } = await setupAdminAndEmployee();
      const created = await request(app)
        .post("/api/tasks")
        .set(authHeader(adminToken))
        .send(validTaskPayload(employee.employee.id));
      const taskId = created.body.data.id;

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set(authHeader(employeeToken))
        .send({ status: "IN_PROGRESS" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("IN_PROGRESS");
    });

    it("blocks a different employee from viewing or editing the task (403)", async () => {
      const { employee, adminToken } = await setupAdminAndEmployee();
      const otherEmployee = await createEmployee({ email: "other@example.com" });
      const otherToken = await loginAs(app, otherEmployee.email, otherEmployee.password);

      const created = await request(app)
        .post("/api/tasks")
        .set(authHeader(adminToken))
        .send(validTaskPayload(employee.employee.id));
      const taskId = created.body.data.id;

      const getRes = await request(app).get(`/api/tasks/${taskId}`).set(authHeader(otherToken));
      expect(getRes.status).toBe(403);

      const putRes = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set(authHeader(otherToken))
        .send({ status: "IN_PROGRESS" });
      expect(putRes.status).toBe(403);
    });

    it("locks a completed task against further edits for both roles", async () => {
      const { employee, adminToken, employeeToken } = await setupAdminAndEmployee();
      const created = await request(app)
        .post("/api/tasks")
        .set(authHeader(adminToken))
        .send(validTaskPayload(employee.employee.id));
      const taskId = created.body.data.id;

      await request(app)
        .put(`/api/tasks/${taskId}`)
        .set(authHeader(employeeToken))
        .send({ status: "COMPLETED" });

      const employeeAttempt = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set(authHeader(employeeToken))
        .send({ status: "PENDING" });
      expect(employeeAttempt.status).toBe(422);

      const adminAttempt = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set(authHeader(adminToken))
        .send({ priority: "URGENT" });
      expect(adminAttempt.status).toBe(422);
    });
  });

  describe("GET /api/tasks (list + overdue derivation)", () => {
    it("scopes an Employee's list to only their own tasks", async () => {
      const { employee, adminToken, employeeToken } = await setupAdminAndEmployee();
      const otherEmployee = await createEmployee({ email: "scoped-other@example.com" });

      await request(app)
        .post("/api/tasks")
        .set(authHeader(adminToken))
        .send(validTaskPayload(employee.employee.id));
      await request(app)
        .post("/api/tasks")
        .set(authHeader(adminToken))
        .send(validTaskPayload(otherEmployee.employee.id));

      const res = await request(app).get("/api/tasks").set(authHeader(employeeToken));

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].assignedTo.id).toBe(employee.employee.id);
    });

    it("derives isOverdue for a non-completed task with a past due date", async () => {
      const { employee, adminToken } = await setupAdminAndEmployee();

      await request(app)
        .post("/api/tasks")
        .set(authHeader(adminToken))
        .send({
          ...validTaskPayload(employee.employee.id),
          startDate: futureDate(-10).toISOString(),
          dueDate: futureDate(-1).toISOString(),
        });

      const res = await request(app)
        .get("/api/tasks")
        .query({ overdue: "true" })
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].isOverdue).toBe(true);
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("rejects an Employee trying to delete a task with 403", async () => {
      const { employee, adminToken, employeeToken } = await setupAdminAndEmployee();
      const created = await request(app)
        .post("/api/tasks")
        .set(authHeader(adminToken))
        .send(validTaskPayload(employee.employee.id));

      const res = await request(app)
        .delete(`/api/tasks/${created.body.data.id}`)
        .set(authHeader(employeeToken));

      expect(res.status).toBe(403);
    });

    it("allows an Admin to delete a task", async () => {
      const { employee, adminToken } = await setupAdminAndEmployee();
      const created = await request(app)
        .post("/api/tasks")
        .set(authHeader(adminToken))
        .send(validTaskPayload(employee.employee.id));

      const res = await request(app)
        .delete(`/api/tasks/${created.body.data.id}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
    });
  });
});
