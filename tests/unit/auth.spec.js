import { describe, it, expect } from "vitest";
import { generateToken, verifyToken } from "../../api/lib/auth.js";

describe("api/lib/auth.js verifyToken", () => {
  const dummyUser = {
    id: 1,
    username: "admin",
    nama_lengkap: "Pengurus Kelas",
    role: "pengurus",
  };

  it("should verify token when passed as a req object with Bearer header", () => {
    const token = generateToken(dummyUser);
    const mockReq = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const payload = verifyToken(mockReq);
    expect(payload).not.toBeNull();
    expect(payload.username).toBe("admin");
  });

  it("should verify token when passed directly as raw token string", () => {
    const token = generateToken(dummyUser);
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload.username).toBe("admin");
  });

  it("should return null for invalid or missing token", () => {
    expect(verifyToken(null)).toBeNull();
    expect(verifyToken("")).toBeNull();
    expect(verifyToken("invalid.token.string")).toBeNull();
    expect(verifyToken({ headers: {} })).toBeNull();
    expect(verifyToken({ headers: { authorization: "Basic 123" } })).toBeNull();
  });
});
