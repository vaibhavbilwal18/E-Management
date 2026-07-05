import { describe, expect, it } from "vitest";
import { forgotPasswordFormSchema, loginFormSchema, registerFormSchema } from "./schemas";

describe("loginFormSchema", () => {
  it("accepts a valid login payload", () => {
    const result = loginFormSchema.safeParse({
      email: "user@example.com",
      password: "anything",
      rememberMe: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginFormSchema.safeParse({
      email: "not-an-email",
      password: "anything",
      rememberMe: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginFormSchema.safeParse({
      email: "user@example.com",
      password: "",
      rememberMe: false,
    });
    expect(result.success).toBe(false);
  });
});

describe("registerFormSchema", () => {
  const base = {
    fullName: "Jane Doe",
    email: "jane@example.com",
    password: "Str0ng!Pass",
    confirmPassword: "Str0ng!Pass",
    department: "Engineering",
    designation: "Developer",
  };

  it("accepts a valid registration payload", () => {
    expect(registerFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a password missing a special character", () => {
    const result = registerFormSchema.safeParse({
      ...base,
      password: "Str0ngPass1",
      confirmPassword: "Str0ngPass1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched password/confirmPassword", () => {
    const result = registerFormSchema.safeParse({
      ...base,
      confirmPassword: "Different!Pass1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("confirmPassword");
    }
  });

  it("rejects a missing department", () => {
    const result = registerFormSchema.safeParse({ ...base, department: "" });
    expect(result.success).toBe(false);
  });
});

describe("forgotPasswordFormSchema", () => {
  it("accepts a valid email", () => {
    expect(forgotPasswordFormSchema.safeParse({ email: "user@example.com" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(forgotPasswordFormSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});
