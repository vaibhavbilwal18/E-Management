import { ResetPasswordForm } from "@/forms/auth/ResetPasswordForm";

export function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
