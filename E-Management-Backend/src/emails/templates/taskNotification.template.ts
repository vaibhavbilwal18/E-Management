export function taskNotificationTemplate(message: string): { subject: string; html: string } {
  return {
    subject: "Task Management System notification",
    html: `<p>${message}</p>`,
  };
}
