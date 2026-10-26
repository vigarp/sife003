import { describe, it, expect, vi, beforeEach } from "vitest";
import http2 from "node:http2";
import { EventEmitter } from "node:events";
import handler from "@/../api/mentari.js";

describe("api/mentari.js proxy handler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function createMockRes() {
    const res = {
      statusCode: 200,
      headers: {},
      body: null,
      setHeader(k, v) {
        this.headers[k] = v;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
      end(data) {
        this.body = data;
        return this;
      },
    };
    return res;
  }

  function mockHttp2Response(status, data) {
    let capturedReqHeaders = null;
    let capturedUrl = null;

    vi.spyOn(http2, "connect").mockImplementation((origin) => {
      capturedUrl = origin;
      const client = new EventEmitter();
      client.close = vi.fn();
      client.request = vi.fn((headers) => {
        capturedReqHeaders = headers;
        const stream = new EventEmitter();
        stream.setEncoding = vi.fn();
        process.nextTick(() => {
          stream.emit("response", {
            ":status": status,
          });
          stream.emit("data", typeof data === "string" ? data : JSON.stringify(data));
          stream.emit("end");
        });
        return stream;
      });
      return client;
    });

    return {
      getReqHeaders: () => capturedReqHeaders,
      getUrl: () => capturedUrl,
    };
  }

  it("should handle OPTIONS preflight request", async () => {
    const req = { method: "OPTIONS" };
    const res = createMockRes();

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("should reject non-GET methods", async () => {
    const req = { method: "POST" };
    const res = createMockRes();

    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.body.success).toBe(false);
  });

  it("should require Authorization header", async () => {
    const req = { method: "GET", headers: {} };
    const res = createMockRes();

    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toContain("Authorization Bearer");
  });

  it("should require path query parameter", async () => {
    const req = {
      method: "GET",
      headers: { authorization: "Bearer sample_token" },
      query: {},
    };
    const res = createMockRes();

    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain("path");
  });

  it("should proxy request to Mentari via HTTP/2 and return JSON response", async () => {
    const mockMentariData = { data: [{ id: 1, nama: "Course A" }] };
    const spy = mockHttp2Response(200, mockMentariData);

    const req = {
      method: "GET",
      headers: { authorization: "Bearer valid_jwt_token" },
      query: { path: "user-course", page: "1", limit: "100" },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(spy.getUrl()).toBe("https://mentari.unpam.ac.id");
    expect(spy.getReqHeaders()).toMatchObject({
      ":method": "GET",
      ":path": "/api/user-course?page=1&limit=100",
      authorization: "Bearer valid_jwt_token",
    });
    expect(spy.getReqHeaders()["user-agent"]).toContain("Mozilla/5.0");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockMentariData);
  });

  it("should handle non-JSON response gracefully and return structured JSON error", async () => {
    mockHttp2Response(500, "<html>Internal Server Error</html>");

    const req = {
      method: "GET",
      headers: { authorization: "Bearer token" },
      query: { path: "user-course" },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("<html>Internal Server Error</html>");
  });
});
