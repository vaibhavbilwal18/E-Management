import { TaskStatus } from "@prisma/client";
import { dashboardRepository } from "../repositories/dashboard.repository";
import { employeeRepository } from "../repositories/employee.repository";
import { AppError } from "../utils/AppError";
import { getOrSetCache, invalidateCache } from "../utils/cache";

const CACHE_TTL_SECONDS = 60;
const RECENT_ACTIVITY_LIMIT = 10;
const UPCOMING_DEADLINES_LIMIT = 5;

const adminCacheKey = "dashboard:admin";
const employeeCacheKey = (employeeId: string) => `dashboard:employee:${employeeId}`;

function statusCounts(groups: { status: TaskStatus; _count: { _all: number } }[]) {
  const counts = { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0 };
  for (const group of groups) {
    if (group.status in counts) {
      counts[group.status as keyof typeof counts] = group._count._all;
    }
  }
  return counts;
}

export const dashboardService = {
  admin() {
    return getOrSetCache(adminCacheKey, CACHE_TTL_SECONDS, async () => {
      const [employees, totalTasks, statusGroups, overdue, recentActivity] = await Promise.all([
        dashboardRepository.countActiveEmployees(),
        dashboardRepository.countTotalTasks(),
        dashboardRepository.tasksByStatus(),
        dashboardRepository.countOverdueTasks(),
        dashboardRepository.recentActivity(RECENT_ACTIVITY_LIMIT),
      ]);

      const counts = statusCounts(statusGroups);

      return {
        totals: {
          employees,
          tasks: totalTasks,
          pending: counts.PENDING,
          inProgress: counts.IN_PROGRESS,
          completed: counts.COMPLETED,
          overdue,
        },
        recentActivity: recentActivity.map((log) => ({
          id: log.id,
          action: log.action,
          entity: log.entity,
          entityId: log.entityId,
          createdAt: log.createdAt,
          user: log.user ? { id: log.user.id, fullName: log.user.fullName } : null,
        })),
      };
    });
  },

  async employee(userId: string) {
    const employee = await employeeRepository.findByUserId(userId);
    if (!employee) {
      throw AppError.forbidden("No employee profile linked to this account");
    }

    return getOrSetCache(employeeCacheKey(employee.id), CACHE_TTL_SECONDS, async () => {
      const [statusGroups, overdue, upcomingDeadlines] = await Promise.all([
        dashboardRepository.tasksByStatus({ assignedToId: employee.id }),
        dashboardRepository.countOverdueTasks({ assignedToId: employee.id }),
        dashboardRepository.upcomingDeadlines(employee.id, UPCOMING_DEADLINES_LIMIT),
      ]);

      const counts = statusCounts(statusGroups);

      return {
        tasksByStatus: {
          pending: counts.PENDING,
          inProgress: counts.IN_PROGRESS,
          completed: counts.COMPLETED,
          overdue,
        },
        upcomingDeadlines: upcomingDeadlines.map((task) => ({
          id: task.id,
          title: task.title,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate,
        })),
      };
    });
  },

  invalidate(employeeId?: string): Promise<void> {
    const keys = [adminCacheKey];
    if (employeeId) {
      keys.push(employeeCacheKey(employeeId));
    }
    return invalidateCache(...keys);
  },
};
