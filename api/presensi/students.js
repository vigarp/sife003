import { getDb } from "../lib/db.js";
import { ensureSchema } from "../lib/schema.js";
import { verifyToken } from "../lib/auth.js";

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
  const studentsRes = await db.execute("SELECT id, nim, name, is_guest, course_ids FROM students ORDER BY name ASC");
  const students = studentsRes.rows.map((s) => ({
    id: s.id,
    nim: s.nim,
    name: s.name,
    isGuest: Boolean(s.is_guest),
    courseIds: s.course_ids ? JSON.parse(s.course_ids) : undefined,
  }));
  return res.status(200).json({ success: true, data: students });
}

async function handleBulkPost(students, res, db) {
  let inserted = 0;
  for (const s of students) {
    if (!s.nim || !s.name) continue;
    const id = s.id || `s-${Date.now()}-${Date.now().toString(36)}-${inserted}`;
    await db.execute({
      sql: `INSERT OR REPLACE INTO students (id, nim, name, is_guest, course_ids) VALUES (?, ?, ?, ?, ?)`,
      args: [
        id,
        String(s.nim).trim(),
        String(s.name).trim(),
        s.isGuest ? 1 : 0,
        s.courseIds?.length ? JSON.stringify(s.courseIds) : null,
      ],
    });
    inserted++;
  }
  return res.status(201).json({
    success: true,
    message: `${inserted} mahasiswa berhasil diproses.`,
    data: { count: inserted },
  });
}

async function handlePost(req, res, db) {
  const body = parseBody(req);
  if (Array.isArray(body.students)) {
    return handleBulkPost(body.students, res, db);
  }

  const { nim, name, isGuest, courseIds } = body;
  if (!nim || !name) {
    return res.status(400).json({ success: false, message: "NIM dan Nama mahasiswa wajib diisi." });
  }

  const id = body.id || `s-${Date.now()}-${Date.now().toString(36)}`;
  await db.execute({
    sql: `INSERT INTO students (id, nim, name, is_guest, course_ids) VALUES (?, ?, ?, ?, ?)`,
    args: [
      id,
      String(nim).trim(),
      String(name).trim(),
      isGuest ? 1 : 0,
      courseIds?.length ? JSON.stringify(courseIds) : null,
    ],
  });

  return res.status(201).json({
    success: true,
    message: "Mahasiswa berhasil ditambahkan.",
    data: { id },
  });
}

async function handlePut(req, res, db) {
  const body = parseBody(req);
  const id = req.query?.id || body.id;
  if (!id) {
    return res.status(400).json({ success: false, message: "ID mahasiswa wajib disertakan." });
  }

  const { nim, name, isGuest, courseIds } = body;
  let isGuestVal = null;
  if (isGuest !== undefined) {
    isGuestVal = isGuest ? 1 : 0;
  }

  await db.execute({
    sql: `UPDATE students SET
            nim = COALESCE(?, nim),
            name = COALESCE(?, name),
            is_guest = COALESCE(?, is_guest),
            course_ids = ?
          WHERE id = ?`,
    args: [
      nim ? String(nim).trim() : null,
      name ? String(name).trim() : null,
      isGuestVal,
      courseIds?.length ? JSON.stringify(courseIds) : null,
      id,
    ],
  });

  return res.status(200).json({ success: true, message: "Data mahasiswa berhasil diperbarui." });
}

async function handleDelete(req, res, db) {
  const body = parseBody(req);
  const id = req.query?.id || body.id;
  if (!id) {
    return res.status(400).json({ success: false, message: "ID mahasiswa wajib disertakan." });
  }
  await db.execute({ sql: "DELETE FROM students WHERE id = ?", args: [id] });
  return res.status(200).json({ success: true, message: "Mahasiswa berhasil dihapus." });
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
