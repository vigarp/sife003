import { getDb } from "./db.js";
import { ensureSchema } from "./schema.js";
import { verifyToken } from "./auth.js";

/**
 * Safely parses JSON string or object request bodies.
 */
export function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

/**
 * Resolves a record ID from query params or parsed body.
 */
export function getRequestId(req, body) {
  return req.query?.id || body?.id;
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function checkPermission(user, auth) {
  if (typeof auth?.authorize === "function") {
    return auth.authorize(user);
  }
  if (auth?.requireAdmin) {
    return Boolean(user.isAdmin);
  }
  return true;
}

function authorizeRequest(req, auth) {
  const user = verifyToken(req);
  if (!user) {
    return {
      ok: false,
      status: 401,
      message: auth?.unauthenticatedMessage || "Akses ditolak: Sesi tidak valid atau telah kedaluwarsa.",
    };
  }

  if (!checkPermission(user, auth)) {
    return {
      ok: false,
      status: auth?.forbiddenStatus || 403,
      message: auth?.forbiddenMessage || "Akses ditolak.",
    };
  }

  return { ok: true, user };
}

/**
 * Creates a standardized CRUD API handler with CORS, OPTIONS, schema init, and JWT auth.
 */
export function createCrudHandler({
  handlers,
  optionsStatus = 200,
  auth = {},
  methodNotAllowedMessage = "Method not allowed.",
  errorLogLabel = "API Error:",
  errorMessage = "",
}) {
  async function dispatch(req, res) {
    await ensureSchema();
    const db = getDb();

    if (req.method === "GET" && handlers.GET) {
      return handlers.GET({ req, res, db });
    }

    const authResult = authorizeRequest(req, auth);
    if (!authResult.ok) {
      return res.status(authResult.status).json({
        success: false,
        message: authResult.message,
      });
    }

    const methodHandler = handlers[req.method];
    if (!methodHandler) {
      const msg = typeof methodNotAllowedMessage === "function"
        ? methodNotAllowedMessage(req)
        : methodNotAllowedMessage;
      return res.status(405).json({ success: false, message: msg });
    }

    const body = parseBody(req);
    return methodHandler({ req, res, db, user: authResult.user, body });
  }

  return async function handler(req, res) {
    setCorsHeaders(res);

    if (req.method === "OPTIONS") {
      return res.status(optionsStatus).end();
    }

    if (!errorMessage) {
      return dispatch(req, res);
    }

    try {
      return await dispatch(req, res);
    } catch (error) {
      console.error(errorLogLabel, error);
      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: error.message,
      });
    }
  };
}
