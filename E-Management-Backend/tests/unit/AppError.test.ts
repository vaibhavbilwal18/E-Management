import { AppError } from "../../src/utils/AppError";

describe("AppError", () => {
  it("badRequest sets status 400 and carries details", () => {
    const err = AppError.badRequest("bad input", { field: "email" });
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("bad input");
    expect(err.details).toEqual({ field: "email" });
    expect(err.isOperational).toBe(true);
  });

  it("unauthorized defaults to a generic message", () => {
    const err = AppError.unauthorized();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Unauthorized");
  });

  it("forbidden defaults to a generic message", () => {
    const err = AppError.forbidden();
    expect(err.statusCode).toBe(403);
  });

  it("notFound defaults to a generic message", () => {
    const err = AppError.notFound();
    expect(err.statusCode).toBe(404);
  });

  it("conflict sets status 409", () => {
    const err = AppError.conflict("already exists");
    expect(err.statusCode).toBe(409);
  });

  it("unprocessable sets status 422", () => {
    const err = AppError.unprocessable("invalid state");
    expect(err.statusCode).toBe(422);
  });

  it("internal sets status 500", () => {
    const err = AppError.internal();
    expect(err.statusCode).toBe(500);
  });

  it("is an instance of Error", () => {
    const err = AppError.badRequest("x");
    expect(err).toBeInstanceOf(Error);
  });
});
