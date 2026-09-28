import { describe, it, expect } from "vitest";
import { generateToken, verifyToken } from "../../api/_lib/auth.js";

describe("api/_lib/auth.js verifyToken", () => {
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

  it("should generate and verify student tokens with proper roles and isAdmin flag", () => {
    const regularStudent = {
      id: "s-1",
      username: "251011700310",
      nama_lengkap: "ADAM BURHANUDIN LUBIS",
      role: "student",
      isAdmin: false,
    };
    const tokenStudent = generateToken(regularStudent);
    const payloadStudent = verifyToken(tokenStudent);
    expect(payloadStudent.username).toBe("251011700310");
    expect(payloadStudent.role).toBe("student");
    expect(payloadStudent.isAdmin).toBe(false);

    const adminStudent = {
      id: "s-2",
      username: "251011700333",
      nama_lengkap: "AHMAD SANDI",
      role: "pengurus",
      isAdmin: true,
    };
    const tokenAdmin = generateToken(adminStudent);
    const payloadAdmin = verifyToken(tokenAdmin);
    expect(payloadAdmin.username).toBe("251011700333");
    expect(payloadAdmin.role).toBe("pengurus");
    expect(payloadAdmin.isAdmin).toBe(true);
  });
});
