import { getDb } from "./_lib/db.js";
import { ensureSchema } from "./_lib/schema.js";
import { verifyToken } from "./_lib/auth.js";

const CATEGORY_COLORS = {
  event: "#3b82f6",
  prodi: "#8b5cf6",
  kampus: "#10b981",
};

function parseBody(req) {
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

async function handleGet(req, res, db) {
  const { category, year } = req.query || {};
  let sql = "SELECT * FROM academic_calendar";
  const conditions = [];
  const args = [];

  if (category && category !== "Semua") {
    conditions.push("category = ?");
    args.push(category);
  }
  if (year) {
    conditions.push("academic_year = ?");
    args.push(year);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  sql += " ORDER BY start_date ASC, id ASC";

  const result = await db.execute({ sql, args });
  return res.status(200).json({
    success: true,
    data: result.rows,
  });
}

async function handlePost(res, db, body) {
  const {
    title,
    category = "event",
    start_date,
    end_date = null,
    color,
    academic_year = "20261",
    description = "",
  } = body;

  if (!title || !start_date) {
    return res.status(400).json({
      success: false,
      message: "Judul agenda dan tanggal mulai wajib diisi.",
    });
  }

  const assignedColor = color || CATEGORY_COLORS[category] || "#3b82f6";
  const sanitizedEndDate = end_date && String(end_date).trim() ? end_date : null;

  const result = await db.execute({
    sql: `INSERT INTO academic_calendar (title, category, start_date, end_date, color, academic_year, description)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      String(title).trim(),
      category,
      start_date,
      sanitizedEndDate,
      assignedColor,
      String(academic_year).trim() || "20261",
      String(description || "").trim(),
    ],
  });

  const newId = Number(result.lastInsertRowid);
  const inserted = await db.execute({
    sql: "SELECT * FROM academic_calendar WHERE id = ? LIMIT 1",
    args: [newId],
  });

  return res.status(201).json({
    success: true,
    message: "Agenda akademik berhasil ditambahkan.",
    data: inserted.rows[0] || { id: newId },
  });
}

async function handlePut(res, db, body) {
  const {
    id,
    title,
    category = "event",
    start_date,
    end_date = null,
    color,
    academic_year = "20261",
    description = "",
  } = body;

  if (!id || !title || !start_date) {
    return res.status(400).json({
      success: false,
      message: "ID, judul agenda, dan tanggal mulai wajib diisi.",
    });
  }

  const assignedColor = color || CATEGORY_COLORS[category] || "#3b82f6";
  const sanitizedEndDate = end_date && String(end_date).trim() ? end_date : null;

  await db.execute({
    sql: `UPDATE academic_calendar
          SET title = ?, category = ?, start_date = ?, end_date = ?, color = ?,
              academic_year = ?, description = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
    args: [
      String(title).trim(),
      category,
      start_date,
      sanitizedEndDate,
      assignedColor,
      String(academic_year).trim() || "20261",
      String(description || "").trim(),
      Number(id),
    ],
  });

  const updated = await db.execute({
    sql: "SELECT * FROM academic_calendar WHERE id = ? LIMIT 1",
    args: [Number(id)],
  });

  return res.status(200).json({
    success: true,
    message: "Agenda akademik berhasil diperbarui.",
    data: updated.rows[0] || { id },
  });
}

async function handleDelete(req, res, db, body) {
  const id = body.id || req.query?.id;
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "ID agenda wajib disertakan.",
    });
  }

  await db.execute({
    sql: "DELETE FROM academic_calendar WHERE id = ?",
    args: [Number(id)],
  });

  return res.status(200).json({
    success: true,
    message: "Agenda akademik berhasil dihapus.",
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    await ensureSchema();
    const db = getDb();

    // 1. GET: Public read of calendar events
    if (req.method === "GET") {
      return await handleGet(req, res, db);
    }

    // Auth check for mutation endpoints (POST, PUT, DELETE)
    const user = verifyToken(req);
    if (!user?.isAdmin) {
      return res.status(401).json({
        success: false,
        message: "Akses ditolak: Hanya pengurus/admin yang dapat mengubah Kalender Akademik.",
      });
    }

    const body = parseBody(req);

    // 2. POST: Create event
    if (req.method === "POST") {
      return await handlePost(res, db, body);
    }

    // 3. PUT: Update event
    if (req.method === "PUT") {
      return await handlePut(res, db, body);
    }

    // 4. DELETE: Delete event
    if (req.method === "DELETE") {
      return await handleDelete(req, res, db, body);
    }

    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  } catch (error) {
    console.error("Academic Calendar API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server kalender akademik.",
      error: error.message,
    });
  }
}
