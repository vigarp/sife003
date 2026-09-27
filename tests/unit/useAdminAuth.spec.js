import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAdminAuth } from "@/composables/useAdminAuth";

describe("useAdminAuth composable", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("should initialize with unauthenticated state when no token in localStorage", () => {
    const { token, isAuthenticated } = useAdminAuth();
    token.value = null;
    expect(isAuthenticated.value).toBe(false);
  });

  it("should login successfully and save token", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          token: "mock-jwt-token-123",
          user: { id: 1, username: "admin", nama_lengkap: "Pengurus" },
        },
      }),
    });

    const { login, token, user, isAuthenticated } = useAdminAuth();
    const result = await login("admin", "admin123");

    expect(result.success).toBe(true);
    expect(token.value).toBe("mock-jwt-token-123");
    expect(user.value.username).toBe("admin");
    expect(isAuthenticated.value).toBe(true);
    expect(localStorage.getItem("03sife003_admin_token")).toBe("mock-jwt-token-123");
  });

  it("should logout and remove token from localStorage", () => {
    localStorage.setItem("03sife003_admin_token", "saved-token");
    const { logout, token, isAuthenticated } = useAdminAuth();
    token.value = "saved-token";

    logout();
    expect(token.value).toBe(null);
    expect(isAuthenticated.value).toBe(false);
    expect(localStorage.getItem("03sife003_admin_token")).toBe(null);
  });

  it("should compute isAdmin and isStudent correctly based on user role", () => {
    const { user, isAdmin, isStudent } = useAdminAuth();

    user.value = { id: "s-1", username: "251011700310", role: "student", isAdmin: false };
    expect(isAdmin.value).toBe(false);
    expect(isStudent.value).toBe(true);

    user.value = { id: "s-2", username: "251011700333", role: "pengurus", isAdmin: true };
    expect(isAdmin.value).toBe(true);
    expect(isStudent.value).toBe(false);
  });
});
