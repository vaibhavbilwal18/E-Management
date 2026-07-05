import { Role } from "@prisma/client";
import {
  generateRefreshToken,
  hashToken,
  signAccessToken,
  verifyAccessToken,
} from "../../src/utils/jwt.util";

describe("jwt.util", () => {
  it("signs and verifies an access token round-trip", () => {
    const token = signAccessToken({ sub: "user-1", role: Role.ADMIN });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.role).toBe(Role.ADMIN);
  });

  it("throws when verifying a tampered token", () => {
    const token = signAccessToken({ sub: "user-1", role: Role.EMPLOYEE });
    const tampered = token.slice(0, -2) + "xx";
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it("generateRefreshToken returns a raw token whose hash matches hashToken", () => {
    const { rawToken, tokenHash } = generateRefreshToken();
    expect(hashToken(rawToken)).toBe(tokenHash);
  });

  it("generateRefreshToken produces unique tokens on each call", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a.rawToken).not.toBe(b.rawToken);
  });
});
