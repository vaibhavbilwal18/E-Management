const ApiResponseEnvelope = (dataSchema: object) => ({
  type: "object",
  properties: {
    success: { type: "boolean" },
    message: { type: "string" },
    data: dataSchema,
  },
});

const ErrorResponse = {
  description: "Error response",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
          data: { nullable: true },
        },
      },
    },
  },
};

const bearerAuth = [{ bearerAuth: [] }];

const Pagination = {
  type: "object",
  properties: {
    total: { type: "integer" },
    page: { type: "integer" },
    limit: { type: "integer" },
    totalPages: { type: "integer" },
  },
};

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Employee Task Management System API",
    version: "1.0.0",
    description:
      "REST API for the Employee Task Management System — auth, employee management, task management, " +
      "file attachments, real-time notifications, dashboards, and reports.",
  },
  servers: [{ url: "/api", description: "API base path" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Short-lived (15m) access token returned by login/refresh, sent as `Authorization: Bearer <token>`.",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          fullName: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["ADMIN", "EMPLOYEE"] },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Employee: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          department: { type: "string" },
          designation: { type: "string" },
          isDeleted: { type: "boolean" },
          deletedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          user: { $ref: "#/components/schemas/User" },
        },
      },
      Task: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
          status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "COMPLETED"] },
          startDate: { type: "string", format: "date-time" },
          dueDate: { type: "string", format: "date-time" },
          assignedToId: { type: "string", format: "uuid" },
          createdById: { type: "string", format: "uuid" },
          completedAt: { type: "string", format: "date-time", nullable: true },
          isOverdue: { type: "boolean", description: "Derived at read time — never client-settable" },
          assignedTo: { $ref: "#/components/schemas/Employee" },
        },
      },
      Notification: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          taskId: { type: "string", format: "uuid", nullable: true },
          type: {
            type: "string",
            enum: ["TASK_ASSIGNED", "TASK_UPDATED", "TASK_COMPLETED", "TASK_DUE_SOON"],
          },
          message: { type: "string" },
          isRead: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      TaskFile: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          originalName: { type: "string" },
          storedName: { type: "string" },
          mimeType: { type: "string" },
          sizeBytes: { type: "integer" },
          taskId: { type: "string", format: "uuid", nullable: true },
          uploadedById: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  security: bearerAuth,
  tags: [
    { name: "Auth" },
    { name: "Employees" },
    { name: "Tasks" },
    { name: "Attachments" },
    { name: "Notifications" },
    { name: "Dashboard" },
    { name: "Reports" },
    { name: "Health" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Liveness check",
        security: [],
        responses: { "200": { description: "OK" } },
      },
    },

    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new Employee account (public signup is always role EMPLOYEE)",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fullName", "email", "password", "confirmPassword", "department", "designation"],
                properties: {
                  fullName: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                  confirmPassword: { type: "string" },
                  department: { type: "string" },
                  designation: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Registered", content: { "application/json": { schema: ApiResponseEnvelope({ $ref: "#/components/schemas/User" }) } } },
          "409": ErrorResponse,
          "422": ErrorResponse,
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in — sets httpOnly refresh + CSRF cookies, returns a short-lived access token",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                  rememberMe: { type: "boolean", default: false },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Logged in",
            content: {
              "application/json": {
                schema: ApiResponseEnvelope({
                  type: "object",
                  properties: { user: { $ref: "#/components/schemas/User" }, accessToken: { type: "string" } },
                }),
              },
            },
          },
          "401": ErrorResponse,
          "429": ErrorResponse,
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Rotate the refresh token and issue a new access token (cookie-authenticated, CSRF-protected)",
        security: [],
        parameters: [
          {
            name: "x-xsrf-token",
            in: "header",
            required: true,
            schema: { type: "string" },
            description: "Must match the XSRF-TOKEN cookie value (double-submit CSRF pattern)",
          },
        ],
        responses: {
          "200": {
            description: "Token refreshed",
            content: {
              "application/json": {
                schema: ApiResponseEnvelope({
                  type: "object",
                  properties: { user: { $ref: "#/components/schemas/User" }, accessToken: { type: "string" } },
                }),
              },
            },
          },
          "401": ErrorResponse,
          "403": ErrorResponse,
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Log out — revokes the refresh token and clears cookies (CSRF-protected)",
        security: [],
        parameters: [
          { name: "x-xsrf-token", in: "header", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Logged out" }, "403": ErrorResponse },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request a password reset email",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } },
            },
          },
        },
        responses: { "200": { description: "If that email exists, a reset link has been sent" } },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password using the emailed token",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "password", "confirmPassword"],
                properties: {
                  token: { type: "string" },
                  password: { type: "string" },
                  confirmPassword: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Password reset successful" }, "400": ErrorResponse, "422": ErrorResponse },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get the current authenticated user",
        responses: {
          "200": { description: "Current user", content: { "application/json": { schema: ApiResponseEnvelope({ $ref: "#/components/schemas/User" }) } } },
          "401": ErrorResponse,
        },
      },
    },

    "/employees": {
      get: {
        tags: ["Employees"],
        summary: "List employees (Admin only) — search/sort/paginate",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "department", in: "query", schema: { type: "string" } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["fullName", "email", "department", "designation", "createdAt"] } },
          { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          "200": {
            description: "Paginated employee list",
            content: {
              "application/json": {
                schema: ApiResponseEnvelope({
                  allOf: [Pagination, { type: "object", properties: { items: { type: "array", items: { $ref: "#/components/schemas/Employee" } } } }],
                }),
              },
            },
          },
          "401": ErrorResponse,
          "403": ErrorResponse,
        },
      },
      post: {
        tags: ["Employees"],
        summary: "Create an employee (Admin only) — auto-generates a temp password, returned once",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fullName", "email", "department", "designation"],
                properties: {
                  fullName: { type: "string" },
                  email: { type: "string", format: "email" },
                  department: { type: "string" },
                  designation: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Created",
            content: {
              "application/json": {
                schema: ApiResponseEnvelope({
                  type: "object",
                  properties: { employee: { $ref: "#/components/schemas/Employee" }, tempPassword: { type: "string" } },
                }),
              },
            },
          },
          "409": ErrorResponse,
        },
      },
    },
    "/employees/{id}": {
      get: {
        tags: ["Employees"],
        summary: "Get an employee by id (Admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Employee", content: { "application/json": { schema: ApiResponseEnvelope({ $ref: "#/components/schemas/Employee" }) } } },
          "404": ErrorResponse,
        },
      },
      put: {
        tags: ["Employees"],
        summary: "Update an employee (Admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  fullName: { type: "string" },
                  email: { type: "string", format: "email" },
                  department: { type: "string" },
                  designation: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Updated" }, "404": ErrorResponse, "409": ErrorResponse },
      },
      delete: {
        tags: ["Employees"],
        summary: "Soft-delete an employee (Admin only) — also disables login",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Deleted" }, "404": ErrorResponse },
      },
    },

    "/tasks": {
      get: {
        tags: ["Tasks"],
        summary: "List tasks — Admin sees all, Employee is scoped to their own (server-enforced)",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"] } },
          { name: "priority", in: "query", schema: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] } },
          { name: "assignedToId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "overdue", in: "query", schema: { type: "boolean" } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["title", "priority", "status", "startDate", "dueDate", "createdAt"] } },
          { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          "200": {
            description: "Paginated task list",
            content: {
              "application/json": {
                schema: ApiResponseEnvelope({
                  allOf: [Pagination, { type: "object", properties: { items: { type: "array", items: { $ref: "#/components/schemas/Task" } } } }],
                }),
              },
            },
          },
        },
      },
      post: {
        tags: ["Tasks"],
        summary: "Create a task (Admin only) — publishes a task.assigned notification event",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "description", "assignedToId", "startDate", "dueDate"],
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
                  status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "COMPLETED"] },
                  assignedToId: { type: "string", format: "uuid" },
                  startDate: { type: "string", format: "date-time" },
                  dueDate: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created", content: { "application/json": { schema: ApiResponseEnvelope({ $ref: "#/components/schemas/Task" }) } } },
          "403": ErrorResponse,
          "422": ErrorResponse,
        },
      },
    },
    "/tasks/{id}": {
      get: {
        tags: ["Tasks"],
        summary: "Get a task by id (ownership/role checked)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Task", content: { "application/json": { schema: ApiResponseEnvelope({ $ref: "#/components/schemas/Task" }) } } },
          "403": ErrorResponse,
          "404": ErrorResponse,
        },
      },
      put: {
        tags: ["Tasks"],
        summary: "Update a task — Admin can edit any field; assigned Employee may only change `status`; locked once COMPLETED",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
                  status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "COMPLETED"] },
                  assignedToId: { type: "string", format: "uuid" },
                  startDate: { type: "string", format: "date-time" },
                  dueDate: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated", content: { "application/json": { schema: ApiResponseEnvelope({ $ref: "#/components/schemas/Task" }) } } },
          "403": ErrorResponse,
          "422": { ...ErrorResponse, description: "Validation error, or the task is COMPLETED and locked" },
        },
      },
      delete: {
        tags: ["Tasks"],
        summary: "Delete a task (Admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Deleted" }, "403": ErrorResponse, "404": ErrorResponse },
      },
    },
    "/tasks/{taskId}/attachments": {
      get: {
        tags: ["Attachments"],
        summary: "List a task's attachments (same access rule as the task itself)",
        parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Attachments",
            content: { "application/json": { schema: ApiResponseEnvelope({ type: "array", items: { $ref: "#/components/schemas/TaskFile" } }) } },
          },
          "403": ErrorResponse,
        },
      },
      post: {
        tags: ["Attachments"],
        summary: "Upload a file to a task — multipart/form-data, field name `file`, 5MB cap, PDF/JPG/PNG only",
        parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { type: "object", properties: { file: { type: "string", format: "binary" } } },
            },
          },
        },
        responses: {
          "201": { description: "Uploaded", content: { "application/json": { schema: ApiResponseEnvelope({ $ref: "#/components/schemas/TaskFile" }) } } },
          "400": { ...ErrorResponse, description: "Invalid file type" },
          "403": ErrorResponse,
          "413": { ...ErrorResponse, description: "File exceeds the 5MB limit" },
        },
      },
    },
    "/attachments/{id}/download": {
      get: {
        tags: ["Attachments"],
        summary: "Download an attachment (same access rule as the parent task)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "File stream", content: { "application/octet-stream": {} } },
          "403": ErrorResponse,
          "404": ErrorResponse,
        },
      },
    },
    "/attachments/{id}": {
      delete: {
        tags: ["Attachments"],
        summary: "Delete an attachment — Admin, or the Employee who uploaded it",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Deleted" }, "403": ErrorResponse, "404": ErrorResponse },
      },
    },

    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List the current user's notifications",
        parameters: [
          { name: "unread", in: "query", schema: { type: "boolean" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          "200": {
            description: "Paginated notifications with unreadCount",
            content: {
              "application/json": {
                schema: ApiResponseEnvelope({
                  allOf: [
                    Pagination,
                    {
                      type: "object",
                      properties: {
                        items: { type: "array", items: { $ref: "#/components/schemas/Notification" } },
                        unreadCount: { type: "integer" },
                      },
                    },
                  ],
                }),
              },
            },
          },
        },
      },
    },
    "/notifications/{id}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark one notification as read",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Marked as read" } },
      },
    },
    "/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all of the current user's notifications as read",
        responses: { "200": { description: "Marked all as read" } },
      },
    },

    "/dashboard/admin": {
      get: {
        tags: ["Dashboard"],
        summary: "Admin dashboard — totals + recent activity feed (Redis-cached, 60s TTL)",
        responses: { "200": { description: "Admin dashboard data" }, "403": ErrorResponse },
      },
    },
    "/dashboard/employee": {
      get: {
        tags: ["Dashboard"],
        summary: "Employee dashboard — own task status breakdown + upcoming deadlines (Redis-cached, 60s TTL)",
        responses: { "200": { description: "Employee dashboard data" }, "403": ErrorResponse },
      },
    },

    "/reports/completed-tasks": {
      get: { tags: ["Reports"], summary: "Completed tasks report (Admin only)", responses: { "200": { description: "Report rows" }, "403": ErrorResponse } },
    },
    "/reports/pending-tasks": {
      get: { tags: ["Reports"], summary: "Pending/in-progress tasks report (Admin only)", responses: { "200": { description: "Report rows" }, "403": ErrorResponse } },
    },
    "/reports/employee-wise": {
      get: {
        tags: ["Reports"],
        summary: "Per-employee task summary report (Admin only)",
        responses: { "200": { description: "Report rows" }, "403": ErrorResponse },
      },
    },
    "/reports/export": {
      get: {
        tags: ["Reports"],
        summary: "Export a report as Excel or CSV (Admin only)",
        parameters: [
          { name: "type", in: "query", required: true, schema: { type: "string", enum: ["completed", "pending", "employee-wise"] } },
          { name: "format", in: "query", required: true, schema: { type: "string", enum: ["excel", "csv"] } },
        ],
        responses: {
          "200": {
            description: "File stream",
            content: {
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {},
              "text/csv": {},
            },
          },
          "403": ErrorResponse,
          "404": { ...ErrorResponse, description: "No data available for this report" },
          "422": ErrorResponse,
        },
      },
    },
  },
};
