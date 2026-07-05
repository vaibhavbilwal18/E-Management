export function resetPasswordTemplate(resetUrl: string): { subject: string; html: string } {
  return {
    subject: "Reset your password",
    html: `
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>This link expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
    `,
  };
}
