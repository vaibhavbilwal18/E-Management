import type { Express } from "express";
import request from "supertest";
import { createApp } from "../../src/app";
import { resetDb, disconnectDb } from "../helpers/db";
import { createAdmin, createEmployee, DEFAULT_PASSWORD } from "../helpers/factories";
import { authHeader, loginAs } from "../helpers/auth";

describe("Auth", () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  describe("POST /api/auth/register", () => {
    it("registers a new employee and always assigns role EMPLOYEE", async () => {
      const res = await request(app).post("/api/auth/register").send({
        fullName: "Jane Doe",
        email: "jane@example.com",
        password: "Str0ng!Pass",
        confirmPassword: "Str0ng!Pass",
        department: "Engineering",
        designation: "Developer",
      });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe("EMPLOYEE");
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it("rejects a duplicate email with 409", async () => {
      await createEmployee({ email: "dupe@example.com" });

      const res = await request(app).post("/api/auth/register").send({
        fullName: "Dup User",
        email: "dupe@example.com",
        password: "Str0ng!Pass",
        confirmPassword: "Str0ng!Pass",
        department: "Engineering",
        designation: "Developer",
      });

      expect(res.status).toBe(409);
    });

    it("rejects a weak password with 422", async () => {
      const res = await request(app).post("/api/auth/register").send({
        fullName: "Weak Pass",
        email: "weak@example.com",
        password: "weak",
        confirmPassword: "weak",
        department: "Engineering",
        designation: "Developer",
      });

      expect(res.status).toBe(422);
    });

    it("rejects mismatched passwords with 422", async () => {
      const res = await request(app).post("/api/auth/register").send({
        fullName: "Mismatch",
        email: "mismatch@example.com",
        password: "Str0ng!Pass",
        confirmPassword: "Different!Pass1",
        department: "Engineering",
        designation: "Developer",
      });

      expect(res.status).toBe(422);
    });
  });

  describe("POST /api/auth/login", () => {
    it("logs in with correct credentials and sets refresh + CSRF cookies", async () => {
      const { email, password } = await createEmployee({ email: "login@example.com" });

      const res = await request(app).post("/api/auth/login").send({ email, password });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      const cookies = res.headers["set-cookie"] as unknown as string[];
      expect(cookies.some((c) => c.startsWith("refreshToken="))).toBe(true);
      expect(cookies.some((c) => c.startsWith("XSRF-TOKEN="))).toBe(true);
    });

    it("rejects wrong password with 401", async () => {
      const { email } = await createEmployee({ email: "wrongpw@example.com" });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email, password: "TotallyWrong!1" });

      expect(res.status).toBe(401);
    });

    it("rejects unknown email with 401", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@example.com", password: DEFAULT_PASSWORD });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns the current user when authenticated", async () => {
      const { email, password } = await createEmployee({ email: "me@example.com" });
      const token = await loginAs(app, email, password);

      const res = await request(app).get("/api/auth/me").set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(email);
    });

    it("rejects with 401 when no token is provided", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("rejects with 401 for a malformed token", async () => {
      const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer garbage");
      expect(res.status).toBe(401);
    });
  });

  describe("CSRF protection on cookie-authenticated routes", () => {
    it("blocks /auth/refresh without a matching CSRF header", async () => {
      const { email, password } = await createAdmin({ email: "csrf-admin@example.com" });
      const loginRes = await request(app).post("/api/auth/login").send({ email, password });
      const cookies = (loginRes.headers["set-cookie"] as unknown as string[]).map((c) => c.split(";")[0]);

      const res = await request(app).post("/api/auth/refresh").set("Cookie", cookies.join("; "));

      expect(res.status).toBe(403);
    });

    it("allows /auth/refresh when the CSRF header matches the cookie", async () => {
      const { email, password } = await createAdmin({ email: "csrf-ok@example.com" });
      const loginRes = await request(app).post("/api/auth/login").send({ email, password });
      const cookies = (loginRes.headers["set-cookie"] as unknown as string[]).map((c) => c.split(";")[0]);
      const csrfCookie = cookies.find((c) => c.startsWith("XSRF-TOKEN="));
      const csrfToken = csrfCookie!.split("=")[1];

      const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", cookies.join("; "))
        .set("x-xsrf-token", csrfToken);

      expect(res.status).toBe(200);
    });

    it("returns a clean 401 (not a CSRF error) when there is no session at all", async () => {
      const res = await request(app).post("/api/auth/refresh");
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Missing refresh token");
    });
  });
});
