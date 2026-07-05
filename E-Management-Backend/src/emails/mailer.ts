import nodemailer, { type Transporter } from "nodemailer";
import { env, isProduction } from "../config/env";
import { logger } from "../config/logger";
import { resetPasswordTemplate } from "./templates/resetPassword.template";
import { taskNotificationTemplate } from "./templates/taskNotification.template";

let transporter: Transporter | null = null;

if (env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    // Never log email bodies in production — they can carry password-reset links.
    if (isProduction) {
      logger.warn(`SMTP not configured — skipping email to "${to}": ${subject}`);
    } else {
      logger.info(`[dev email] to="${to}" subject="${subject}"\n${html}`);
    }
    return;
  }
  await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const { subject, html } = resetPasswordTemplate(resetUrl);
  await sendMail(to, subject, html);
}

export async function sendTaskNotificationEmail(to: string, message: string): Promise<void> {
  const { subject, html } = taskNotificationTemplate(message);
  await sendMail(to, subject, html);
}
