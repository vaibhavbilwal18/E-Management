-- ============================================================================
-- Employee Task Management System — Database Script
-- ============================================================================
-- PostgreSQL 15+. Generated from the Prisma schema
-- (E-Management-Backend/prisma/schema.prisma) and its migration
-- (E-Management-Backend/prisma/migrations/20260704171448_init/migration.sql).
--
-- Usage:
--   createdb task_management
--   psql -U <user> -d task_management -f docs/database.sql
--
-- This script is idempotent-safe to run once against a FRESH, empty
-- database. It contains:
--   1. Enum types
--   2. Tables, indexes, and foreign keys
--   3. Demo seed data (1 Admin + 4 Employees + 8 Tasks) matching
--      E-Management-Backend/prisma/seed.ts — run `npm run prisma:seed`
--      instead if you want Prisma to (re-)generate this seed data itself.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Enum Types
-- ----------------------------------------------------------------------------

CREATE TYPE "Role" AS ENUM ('ADMIN', 'EMPLOYEE');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');
CREATE TYPE "NotificationType" AS ENUM ('TASK_ASSIGNED', 'TASK_UPDATED', 'TASK_COMPLETED', 'TASK_DUE_SOON');
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PASSWORD_RESET');


-- ----------------------------------------------------------------------------
-- 2. Tables
-- ----------------------------------------------------------------------------

-- Auth identity. A User with role EMPLOYEE always has a linked Employee
-- profile (1:1); an ADMIN may or may not.
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "resetPasswordToken" TEXT,
    "resetPasswordExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- HR profile data — a separate concern from login credentials so a
-- soft-deleted Employee doesn't affect the underlying User record's identity.
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- `status` never stores OVERDUE — that's derived at read time from
-- (status != COMPLETED AND dueDate < now()) and additionally persisted by
-- the hourly due-soon cron job for reporting purposes.
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- Task attachments. `path` is the filename relative to the server's
-- UPLOAD_DIR, not an absolute filesystem path (portable across environments).
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "taskId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- One row per issued refresh token (rotated on every use). `tokenHash` is a
-- SHA-256 hash — the raw token is never stored. Reuse of a `revoked` token
-- triggers theft-detection: every token in that user's chain is revoked.
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "replacedBy" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);


-- ----------------------------------------------------------------------------
-- 3. Indexes
-- ----------------------------------------------------------------------------

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_email_idx" ON "users"("email");

CREATE UNIQUE INDEX "employees_userId_key" ON "employees"("userId");
CREATE INDEX "employees_department_idx" ON "employees"("department");
CREATE INDEX "employees_isDeleted_idx" ON "employees"("isDeleted");

CREATE INDEX "tasks_assignedToId_idx" ON "tasks"("assignedToId");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "tasks_dueDate_idx" ON "tasks"("dueDate");

CREATE UNIQUE INDEX "files_storedName_key" ON "files"("storedName");
CREATE INDEX "files_taskId_idx" ON "files"("taskId");

CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
CREATE INDEX "refresh_tokens_tokenHash_idx" ON "refresh_tokens"("tokenHash");

CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");


-- ----------------------------------------------------------------------------
-- 4. Foreign Keys
-- ----------------------------------------------------------------------------

ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "files" ADD CONSTRAINT "files_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "files" ADD CONSTRAINT "files_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================================
-- 5. Demo Seed Data
-- ============================================================================
-- Passwords below are real bcrypt hashes (cost factor 12) for:
--   Admin:     Admin@12345
--   Employees: Employee@123
-- These are the exact hashes produced by E-Management-Backend/prisma/seed.ts.

-- Admin
INSERT INTO "users" (id, "fullName", email, "passwordHash", role, "isActive", "createdAt", "updatedAt") VALUES
('11111111-0000-0000-0000-000000000001', 'System Admin', 'admin@taskmanagement.local', '$2b$12$tkNqGlbAsMFnxnVxsPoAvO4MLGw.oGroC0tKVzR0if/qJApxdglRC', 'ADMIN', true, now(), now());

-- Employees (Users)
INSERT INTO "users" (id, "fullName", email, "passwordHash", role, "isActive", "createdAt", "updatedAt") VALUES
('22222222-0000-0000-0000-000000000001', 'Alice Johnson', 'alice@taskmanagement.local', '$2b$12$Mjk5fws/Su9zvb4Nm9UX1uMM/VX9GYfQVdKXKcpbTA7i7uFMhynJu', 'EMPLOYEE', true, now(), now()),
('22222222-0000-0000-0000-000000000002', 'Bob Martinez', 'bob.martinez@taskmanagement.local', '$2b$12$rkZ5nED0sIKVtheHlgvYW.7H2SOgMy/6aYyJfI4c.UQrE4laXOX0u', 'EMPLOYEE', true, now(), now()),
('22222222-0000-0000-0000-000000000003', 'Carol Chen', 'carol@taskmanagement.local', '$2b$12$FVvom9QlbJMOt6I.G9q/ru6oL195jZR5y5vOLQovVBopSEOrfPI06', 'EMPLOYEE', true, now(), now()),
('22222222-0000-0000-0000-000000000004', 'David Kim', 'david@taskmanagement.local', '$2b$12$ZC6HdYBP6SP2eXX./Izm4e70IR7rn91wAIjWOc9wlMMzdmtDB5MSO', 'EMPLOYEE', true, now(), now());

-- Employee profiles
INSERT INTO "employees" (id, "userId", department, designation, "isDeleted", "createdAt", "updatedAt") VALUES
('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Engineering', 'Senior Developer', false, now(), now()),
('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Sales', 'Sales Executive', false, now(), now()),
('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003', 'HR', 'HR Manager', false, now(), now()),
('33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000004', 'Marketing', 'Marketing Specialist', false, now(), now());

-- Tasks — spans every status (pending/in-progress/completed/overdue)
INSERT INTO "tasks" (id, title, description, priority, status, "startDate", "dueDate", "assignedToId", "createdById", "completedAt", "createdAt", "updatedAt") VALUES
('44444444-0000-0000-0000-000000000001', 'Design new onboarding flow', 'Create wireframes and user flow for the revamped employee onboarding experience.', 'HIGH', 'IN_PROGRESS', now() - interval '3 days', now() + interval '4 days', '33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', NULL, now(), now()),
('44444444-0000-0000-0000-000000000002', 'Fix production login bug', 'Users intermittently report being logged out after exactly 15 minutes.', 'URGENT', 'PENDING', now(), now() + interval '1 day', '33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', NULL, now(), now()),
('44444444-0000-0000-0000-000000000003', 'Q3 sales pipeline review', 'Review and update the sales pipeline for all active enterprise accounts.', 'MEDIUM', 'PENDING', now(), now() + interval '7 days', '33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', NULL, now(), now()),
('44444444-0000-0000-0000-000000000004', 'Follow up with overdue invoices', 'Contact clients with invoices overdue by more than 30 days.', 'HIGH', 'PENDING', now() - interval '10 days', now() - interval '2 days', '33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', NULL, now(), now()),
('44444444-0000-0000-0000-000000000005', 'Update employee handbook', 'Incorporate the new remote-work policy into the employee handbook.', 'LOW', 'COMPLETED', now() - interval '14 days', now() - interval '7 days', '33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', now() - interval '8 days', now(), now()),
('44444444-0000-0000-0000-000000000006', 'Schedule Q3 performance reviews', 'Coordinate calendars and book performance review slots for all engineering staff.', 'MEDIUM', 'IN_PROGRESS', now() - interval '2 days', now() + interval '5 days', '33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', NULL, now(), now()),
('44444444-0000-0000-0000-000000000007', 'Launch social media campaign', 'Kick off the Q3 product launch campaign across all social channels.', 'HIGH', 'PENDING', now() + interval '1 day', now() + interval '10 days', '33333333-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', NULL, now(), now()),
('44444444-0000-0000-0000-000000000008', 'Publish Q2 marketing report', 'Compile and publish the Q2 marketing performance report for leadership.', 'MEDIUM', 'COMPLETED', now() - interval '20 days', now() - interval '12 days', '33333333-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', now() - interval '13 days', now(), now());
