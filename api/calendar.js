import { createCrudHandler, getRequestId } from "./_lib/http.js";

const CATEGORY_COLORS = {
  event: "#3b82f6",
  prodi: "#8b5cf6",
  kampus: "#10b981",
  nasional: "#ef4444",
};

function buildCalendarEventValues(body) {
  const {
    title,
    category = "event",
    start_date,
    end_date = null,
    color,
    academic_year = "20261",
    description = "",
  } = body;

  const assignedColor = color || CATEGORY_COLORS[category] || "#3b82f6";
  const sanitizedEndDate = end_date && String(end_date).trim() ? end_date : null;

  return {
    title,
    category,
    start_date,
    sanitizedEndDate,
    assignedColor,
    yearVal: String(academic_year).trim() || "20261",
    descriptionVal: String(description || "").trim(),
  };
}

async function fetchCalendarEventById(db, id) {
  const result = await db.execute({
    sql: "SELECT * FROM academic_calendar WHERE id = ? LIMIT 1",
    args: [id],
  });
  return result.rows[0] || { id };
}

async function handleGet({ req, res, db }) {
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

async function handlePost({ res, db, body }) {
  const {
    title,
    category,
    start_date,
    sanitizedEndDate,
    assignedColor,
    yearVal,
    descriptionVal,
  } = buildCalendarEventValues(body);

  if (!title || !start_date) {
    return res.status(400).json({
      success: false,
      message: "Judul agenda dan tanggal mulai wajib diisi.",
    });
  }

  const result = await db.execute({
    sql: `INSERT INTO academic_calendar (title, category, start_date, end_date, color, academic_year, description)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      String(title).trim(),
      category,
      start_date,
      sanitizedEndDate,
      assignedColor,
      yearVal,
      descriptionVal,
    ],
  });

  const newId = Number(result.lastInsertRowid);
  const data = await fetchCalendarEventById(db, newId);

  return res.status(201).json({
    success: true,
    message: "Agenda akademik berhasil ditambahkan.",
    data,
  });
}

async function handlePut({ res, db, body }) {
  const { id } = body;
  const {
    title,
    category,
    start_date,
    sanitizedEndDate,
    assignedColor,
    yearVal,
    descriptionVal,
  } = buildCalendarEventValues(body);

  if (!id || !title || !start_date) {
    return res.status(400).json({
      success: false,
      message: "ID, judul agenda, dan tanggal mulai wajib diisi.",
    });
  }

  const numericId = Number(id);
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
      yearVal,
      descriptionVal,
      numericId,
    ],
  });

  const data = await fetchCalendarEventById(db, numericId);
  return res.status(200).json({
    success: true,
    message: "Agenda akademik berhasil diperbarui.",
    data,
  });
}

async function handleDelete({ req, res, db, body }) {
  const id = getRequestId(req, body);
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

export default createCrudHandler({
  handlers: {
    GET: handleGet,
    POST: handlePost,
    PUT: handlePut,
    DELETE: handleDelete,
  },
  optionsStatus: 204,
  auth: {
    unauthenticatedMessage: "Akses ditolak: Hanya pengurus/admin yang dapat mengubah Kalender Akademik.",
    requireAdmin: true,
    forbiddenStatus: 401,
    forbiddenMessage: "Akses ditolak: Hanya pengurus/admin yang dapat mengubah Kalender Akademik.",
  },
  methodNotAllowedMessage: "Method not allowed",
  errorLogLabel: "Academic Calendar API Error:",
  errorMessage: "Terjadi kesalahan pada server kalender akademik.",
});
