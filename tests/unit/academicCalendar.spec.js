import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAcademicCalendar, CATEGORIES, CATEGORY_COLORS } from "@/composables/useAcademicCalendar";

// Mock auth composable for frontend tests
vi.mock("@/composables/useAdminAuth", () => ({
  useAdminAuth: () => ({
    token: { value: "test-token-123" },
    isAdmin: { value: true },
  }),
}));

// Mock database and schema for api endpoint tests
const mockDb = {
  execute: vi.fn(),
};

vi.mock("../../api/_lib/schema.js", () => ({
  ensureSchema: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../api/_lib/db.js", () => ({
  getDb: () => mockDb,
}));

vi.mock("../../api/_lib/auth.js", () => ({
  verifyToken: vi.fn((req) => {
    const authHeader = req?.headers?.authorization;
    if (authHeader === "Bearer admin-token") {
      return { id: 1, username: "admin", isAdmin: true, role: "pengurus" };
    }
    if (authHeader === "Bearer student-token") {
      return { id: 2, username: "student", isAdmin: false, role: "student" };
    }
    return null;
  }),
}));

import handler from "../../api/calendar.js";

describe("useAcademicCalendar composable", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should have correct categories and category colors mapped", () => {
    expect(CATEGORIES.length).toBe(4);
    expect(CATEGORY_COLORS.event).toBe("#3b82f6");
    expect(CATEGORY_COLORS.prodi).toBe("#8b5cf6");
    expect(CATEGORY_COLORS.kampus).toBe("#10b981");
  });

  it("should fetch events successfully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [{ id: 1, title: "KRS Online", category: "event", start_date: "2026-09-01" }],
      }),
    });

    const { events, fetchEvents, loading, error } = useAcademicCalendar();
    const result = await fetchEvents();

    expect(global.fetch).toHaveBeenCalledWith("/api/calendar");
    expect(result.length).toBe(1);
    expect(events.value[0].title).toBe("KRS Online");
    expect(loading.value).toBe(false);
    expect(error.value).toBe(null);
  });

  it("should append query parameters when category or year is specified", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    const { fetchEvents } = useAcademicCalendar();
    await fetchEvents("prodi", "20261");

    expect(global.fetch).toHaveBeenCalledWith("/api/calendar?category=prodi&year=20261");
  });

  it("should handle error when fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, message: "Internal server error" }),
    });

    const { fetchEvents, error } = useAcademicCalendar();
    const result = await fetchEvents();

    expect(result).toEqual([]);
    expect(error.value).toBe("Internal server error");
  });

  it("should create event with auth header and refresh events", async () => {
    const mockPostResponse = {
      ok: true,
      json: async () => ({
        success: true,
        data: { id: 2, title: "UTS", start_date: "2026-11-01" },
      }),
    };
    const mockGetResponse = {
      ok: true,
      json: async () => ({
        success: true,
        data: [{ id: 2, title: "UTS", start_date: "2026-11-01" }],
      }),
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(mockPostResponse)
      .mockResolvedValueOnce(mockGetResponse);

    const { createEvent } = useAcademicCalendar();
    const res = await createEvent({
      title: "UTS",
      category: "Mahasiswa",
      start_date: "2026-11-01",
    });

    expect(res.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/calendar",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token-123",
        }),
      })
    );
  });

  it("should update event with PUT request", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 2, title: "UTS Susulan" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [{ id: 2, title: "UTS Susulan" }] }),
      });

    const { updateEvent } = useAcademicCalendar();
    const res = await updateEvent({
      id: 2,
      title: "UTS Susulan",
      start_date: "2026-11-05",
    });

    expect(res.success).toBe(true);
  });

  it("should delete event with DELETE request", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { deleteEvent, events } = useAcademicCalendar();
    events.value = [{ id: 5, title: "Agenda Hapus" }];

    const res = await deleteEvent(5);
    expect(res.success).toBe(true);
    expect(events.value.find((e) => e.id === 5)).toBeUndefined();
  });
});

describe("api/calendar.js endpoint handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockReqRes({ method = "GET", query = {}, body = {}, headers = {} } = {}) {
    const req = {
      method,
      query,
      body,
      headers: {
        authorization: headers.authorization || "",
        ...headers,
      },
    };

    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) {
        this.headers[k] = v;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
      end() {
        return this;
      },
    };

    return { req, res };
  }

  it("should handle OPTIONS preflight with 204", async () => {
    const { req, res } = createMockReqRes({ method: "OPTIONS" });
    await handler(req, res);
    expect(res.statusCode).toBe(204);
  });

  it("should fetch public calendar events on GET", async () => {
    mockDb.execute.mockResolvedValue({
      rows: [{ id: 1, title: "Dies Natalis", start_date: "2026-08-20" }],
    });

    const { req, res } = createMockReqRes({ method: "GET" });
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe("Dies Natalis");
  });

  it("should reject unauthenticated mutations with 401", async () => {
    const { req, res } = createMockReqRes({
      method: "POST",
      body: { title: "Test", start_date: "2026-10-01" },
    });

    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should reject non-admin student mutations with 401", async () => {
    const { req, res } = createMockReqRes({
      method: "POST",
      headers: { authorization: "Bearer student-token" },
      body: { title: "Test", start_date: "2026-10-01" },
    });

    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should create new event on POST when admin is authenticated", async () => {
    mockDb.execute
      .mockResolvedValueOnce({ lastInsertRowid: 10 })
      .mockResolvedValueOnce({
        rows: [{ id: 10, title: "Kuliah Perdana", start_date: "2026-09-01" }],
      });

    const { req, res } = createMockReqRes({
      method: "POST",
      headers: { authorization: "Bearer admin-token" },
      body: {
        title: "Kuliah Perdana",
        category: "Mahasiswa",
        start_date: "2026-09-01",
      },
    });

    await handler(req, res);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(10);
  });

  it("should reject POST with missing title or start_date with 400", async () => {
    const { req, res } = createMockReqRes({
      method: "POST",
      headers: { authorization: "Bearer admin-token" },
      body: { title: "" },
    });

    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should update event on PUT when valid", async () => {
    mockDb.execute
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ id: 10, title: "Kuliah Perdana (Diundur)", start_date: "2026-09-08" }],
      });

    const { req, res } = createMockReqRes({
      method: "PUT",
      headers: { authorization: "Bearer admin-token" },
      body: {
        id: 10,
        title: "Kuliah Perdana (Diundur)",
        start_date: "2026-09-08",
      },
    });

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should delete event on DELETE when valid", async () => {
    mockDb.execute.mockResolvedValueOnce({});

    const { req, res } = createMockReqRes({
      method: "DELETE",
      headers: { authorization: "Bearer admin-token" },
      body: { id: 10 },
    });

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
