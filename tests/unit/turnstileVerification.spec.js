import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyTurnstileToken } from "../../api/auth/login.js";

describe("api/auth/login.js verifyTurnstileToken", () => {
  const originalSecret = process.env.TURNSTILE_SECRET_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.TURNSTILE_SECRET_KEY = originalSecret;
  });

  it("should bypass verification if TURNSTILE_SECRET_KEY is not set", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    const result = await verifyTurnstileToken(null);
    expect(result.success).toBe(true);
  });

  it("should reject if TURNSTILE_SECRET_KEY is set but token is empty", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret-key";
    const result = await verifyTurnstileToken("");
    expect(result.success).toBe(false);
    expect(result.message).toContain("Turnstile");
  });

  it("should verify successfully when Cloudflare siteverify returns success", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        challenge_ts: "2026-09-28T12:00:00Z",
        hostname: "sife003.vercel.app",
      }),
    });

    const result = await verifyTurnstileToken("valid-turnstile-token", "127.0.0.1");
    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("should return failure if Cloudflare siteverify returns success=false", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        "error-codes": ["invalid-input-response"],
      }),
    });

    const result = await verifyTurnstileToken("invalid-token");
    expect(result.success).toBe(false);
    expect(result.message).toContain("gagal atau kedaluwarsa");
  });
});
