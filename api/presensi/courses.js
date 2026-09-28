import { getDb } from "../_lib/db.js";
import { ensureSchema } from "../_lib/schema.js";
import { verifyToken } from "../_lib/auth.js";

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

function authenticate(req) {
  return verifyToken(req);
}

async function handleGet(res, db) {
  const coursesRes = await db.execute(`
    SELECT
      c.id, c.code, c.name, c.class_name, c.lecturer_id,
      COALESCE(l.name, c.lecturer) as lecturer,
      l.phone as lecturer_phone,
      c.time
    FROM courses c
    LEFT JOIN lecturers l ON c.lecturer_id = l.id
    ORDER BY c.name ASC
  `);
  const courses = coursesRes.rows.map((c) => ({
    id: c.id,
    code: c.code || "",
    name: c.name,
    className: c.class_name || "03SIFE003",
    lecturerId: c.lecturer_id || null,
    lecturer: c.lecturer || "",
    lecturerPhone: c.lecturer_phone || null,
    time: c.time || "",
  }));
  return res.status(200).json({ success: true, data: courses });
}

async function handlePost(req, res, db) {
  const body = parseBody(req);
  const { code, name, className, lecturer, lecturerId, time } = body;

  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: "Nama mata kuliah wajib diisi." });
  }

  const id = body.id || `c-${Date.now()}-${Date.now().toString(36)}`;
  await db.execute({
    sql: `INSERT INTO courses (id, code, name, class_name, lecturer, lecturer_id, time)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      code ? code.trim() : null,
      name.trim(),
      className ? className.trim() : "03SIFE003",
      lecturer ? lecturer.trim() : null,
      lecturerId ? lecturerId.trim() : null,
      time ? time.trim() : null,
    ],
  });

  return res.status(201).json({
    success: true,
    message: "Mata kuliah berhasil ditambahkan.",
    data: { id },
  });
}

async function handlePut(req, res, db) {
  const body = parseBody(req);
  const id = req.query?.id || body.id;
  if (!id) {
    return res.status(400).json({ success: false, message: "ID mata kuliah wajib disertakan." });
  }

  const { code, name, className, lecturer, lecturerId, time } = body;
  await db.execute({
    sql: `UPDATE courses SET
            code = COALESCE(?, code),
            name = COALESCE(?, name),
            class_name = COALESCE(?, class_name),
            lecturer = COALESCE(?, lecturer),
            lecturer_id = CASE WHEN ? = 1 THEN ? ELSE lecturer_id END,
            time = COALESCE(?, time)
          WHERE id = ?`,
    args: [
      code !== undefined ? code?.trim() : null,
      name !== undefined ? name?.trim() : null,
      className !== undefined ? className?.trim() : null,
      lecturer !== undefined ? lecturer?.trim() : null,
      lecturerId !== undefined ? 1 : 0,
      lecturerId ? lecturerId.trim() : null,
      time !== undefined ? time?.trim() : null,
      id,
    ],
  });

  return res.status(200).json({ success: true, message: "Mata kuliah berhasil diperbarui." });
}

async function handleDelete(req, res, db) {
  const body = parseBody(req);
  const id = req.query?.id || body.id;
  if (!id) {
    return res.status(400).json({ success: false, message: "ID mata kuliah wajib disertakan." });
  }

  await db.execute({ sql: "DELETE FROM courses WHERE id = ?", args: [id] });
  return res.status(200).json({ success: true, message: "Mata kuliah berhasil dihapus." });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const db = getDb();
  await ensureSchema();

  if (req.method === "GET") {
    return handleGet(res, db);
  }

  const user = authenticate(req);
  if (!user) {
    return res.status(401).json({ success: false, message: "Akses ditolak: Sesi tidak valid atau telah kedaluwarsa." });
  }

  if (req.method === "POST") return handlePost(req, res, db);
  if (req.method === "PUT") return handlePut(req, res, db);
  if (req.method === "DELETE") return handleDelete(req, res, db);

  return res.status(405).json({ success: false, message: "Method not allowed." });
}
