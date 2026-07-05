import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPasswordMutation } from "@/redux/api/authApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { forgotPasswordFormSchema, type ForgotPasswordFormValues } from "./schemas";

export function ForgotPasswordForm() {
  const [forgotPassword, { isLoading, isSuccess }] = useForgotPasswordMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordFormSchema) });

  async function onSubmit(values: ForgotPasswordFormValues) {
    try {
      await forgotPassword(values).unwrap();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  if (isSuccess) {
    return (
      <p className="text-sm text-muted-foreground">
        If that email exists, a password reset link has been sent to it.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Sending..." : "Send reset link"}
      </Button>
    </form>
  );
}
