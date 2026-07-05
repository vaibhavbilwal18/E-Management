import { describe, expect, it } from "vitest";
import { getApiErrorMessage } from "./getApiErrorMessage";

describe("getApiErrorMessage", () => {
  it("extracts the message from a well-shaped API error", () => {
    expect(getApiErrorMessage({ message: "Invalid credentials" })).toBe("Invalid credentials");
  });

  it("falls back to the default message for a non-error-shaped value", () => {
    expect(getApiErrorMessage("just a string")).toBe("Something went wrong");
  });

  it("falls back to the default message for null", () => {
    expect(getApiErrorMessage(null)).toBe("Something went wrong");
  });

  it("uses a custom fallback when provided", () => {
    expect(getApiErrorMessage(undefined, "Custom fallback")).toBe("Custom fallback");
  });

  it("rejects an object whose message field is not a string", () => {
    expect(getApiErrorMessage({ message: 42 })).toBe("Something went wrong");
  });
});
