import "dotenv/config";
import { PrismaClient, Role, TaskPriority, TaskStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_EMPLOYEE_PASSWORD = "Employee@123";

const DEMO_EMPLOYEES = [
  { fullName: "Alice Johnson", email: "alice@taskmanagement.local", department: "Engineering", designation: "Senior Developer" },
  { fullName: "Bob Martinez", email: "bob.martinez@taskmanagement.local", department: "Sales", designation: "Sales Executive" },
  { fullName: "Carol Chen", email: "carol@taskmanagement.local", department: "HR", designation: "HR Manager" },
  { fullName: "David Kim", email: "david@taskmanagement.local", department: "Marketing", designation: "Marketing Specialist" },
];

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@taskmanagement.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { fullName: "System Admin", email, passwordHash, role: Role.ADMIN },
  });

  console.log(`Seeded admin account -> email: ${email} / password: ${password}`);
}

async function seedEmployees() {
  const employeeIds: Record<string, string> = {};

  for (const demo of DEMO_EMPLOYEES) {
    const existing = await prisma.user.findUnique({ where: { email: demo.email }, include: { employee: true } });
    if (existing?.employee) {
      console.log(`Employee already exists: ${demo.email}`);
      employeeIds[demo.email] = existing.employee.id;
      continue;
    }

    const passwordHash = await bcrypt.hash(DEMO_EMPLOYEE_PASSWORD, 12);
    const user = await prisma.user.create({
      data: {
        fullName: demo.fullName,
        email: demo.email,
        passwordHash,
        role: Role.EMPLOYEE,
        employee: { create: { department: demo.department, designation: demo.designation } },
      },
      include: { employee: true },
    });

    employeeIds[demo.email] = user.employee!.id;
    console.log(`Seeded employee -> email: ${demo.email} / password: ${DEMO_EMPLOYEE_PASSWORD}`);
  }

  return employeeIds;
}

async function seedTasks(adminId: string, employeeIds: Record<string, string>) {
  const existingTaskCount = await prisma.task.count();
  if (existingTaskCount > 0) {
    console.log(`Tasks already exist (${existingTaskCount}) — skipping task seed`);
    return;
  }

  const [alice, bobM, carol, david] = DEMO_EMPLOYEES.map((e) => employeeIds[e.email]);

  const tasks = [
    {
      title: "Design new onboarding flow",
      description: "Create wireframes and user flow for the revamped employee onboarding experience.",
      priority: TaskPriority.HIGH,
      status: TaskStatus.IN_PROGRESS,
      assignedToId: alice,
      startDate: daysFromNow(-3),
      dueDate: daysFromNow(4),
    },
    {
      title: "Fix production login bug",
      description: "Users intermittently report being logged out after exactly 15 minutes.",
      priority: TaskPriority.URGENT,
      status: TaskStatus.PENDING,
      assignedToId: alice,
      startDate: daysFromNow(0),
      dueDate: daysFromNow(1),
    },
    {
      title: "Q3 sales pipeline review",
      description: "Review and update the sales pipeline for all active enterprise accounts.",
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.PENDING,
      assignedToId: bobM,
      startDate: daysFromNow(0),
      dueDate: daysFromNow(7),
    },
    {
      title: "Follow up with overdue invoices",
      description: "Contact clients with invoices overdue by more than 30 days.",
      priority: TaskPriority.HIGH,
      status: TaskStatus.PENDING,
      assignedToId: bobM,
      startDate: daysFromNow(-10),
      dueDate: daysFromNow(-2),
    },
    {
      title: "Update employee handbook",
      description: "Incorporate the new remote-work policy into the employee handbook.",
      priority: TaskPriority.LOW,
      status: TaskStatus.COMPLETED,
      assignedToId: carol,
      startDate: daysFromNow(-14),
      dueDate: daysFromNow(-7),
      completedAt: daysFromNow(-8),
    },
    {
      title: "Schedule Q3 performance reviews",
      description: "Coordinate calendars and book performance review slots for all engineering staff.",
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.IN_PROGRESS,
      assignedToId: carol,
      startDate: daysFromNow(-2),
      dueDate: daysFromNow(5),
    },
    {
      title: "Launch social media campaign",
      description: "Kick off the Q3 product launch campaign across all social channels.",
      priority: TaskPriority.HIGH,
      status: TaskStatus.PENDING,
      assignedToId: david,
      startDate: daysFromNow(1),
      dueDate: daysFromNow(10),
    },
    {
      title: "Publish Q2 marketing report",
      description: "Compile and publish the Q2 marketing performance report for leadership.",
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.COMPLETED,
      assignedToId: david,
      startDate: daysFromNow(-20),
      dueDate: daysFromNow(-12),
      completedAt: daysFromNow(-13),
    },
  ];

  for (const task of tasks) {
    await prisma.task.create({
      data: { ...task, createdById: adminId },
    });
  }

  console.log(`Seeded ${tasks.length} demo tasks`);
}

async function main() {
  await seedAdmin();

  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: process.env.SEED_ADMIN_EMAIL ?? "admin@taskmanagement.local" },
  });

  const employeeIds = await seedEmployees();
  await seedTasks(admin.id, employeeIds);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
