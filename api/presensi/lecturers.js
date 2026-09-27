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
  const lecturersRes = await db.execute(`
    SELECT
      l.id,
      l.name,
      l.phone,
      l.email,
      l.note,
      (
        SELECT json_group_array(
          json_object('id', c.id, 'name', c.name, 'code', c.code)
        )
        FROM courses c
        WHERE c.lecturer_id = l.id
      ) as courses_json
    FROM lecturers l
    ORDER BY l.name ASC
  `);

  const lecturers = lecturersRes.rows.map((row) => {
    let courses = [];
    if (row.courses_json) {
      try {
        const parsed = JSON.parse(row.courses_json);
        courses = Array.isArray(parsed) ? parsed.filter((c) => c?.id) : [];
      } catch {
        courses = [];
      }
    }
    return {
      id: row.id,
      name: row.name,
      phone: row.phone || null,
      email: row.email || null,
      note: row.note || null,
      courses,
    };
  });

  return res.status(200).json({ success: true, data: lecturers });
}

async function syncLecturerCourses(db, lecturerId, courseIds) {
  if (!Array.isArray(courseIds)) return;

  // Clear previous assignments for this lecturer
  await db.execute({
    sql: "UPDATE courses SET lecturer_id = NULL WHERE lecturer_id = ?",
    args: [lecturerId],
  });

  // Assign selected courses
  for (const cid of courseIds) {
    if (!cid) continue;
    await db.execute({
      sql: "UPDATE courses SET lecturer_id = ? WHERE id = ?",
      args: [lecturerId, cid],
    });
  }
}

async function handlePost(req, res, db) {
  const body = parseBody(req);
  const { name, phone, email, note, courseIds } = body;

  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: "Nama dosen wajib diisi." });
  }

  const id = body.id || `d-${Date.now()}-${Date.now().toString(36)}`;
  await db.execute({
    sql: `INSERT INTO lecturers (id, name, phone, email, note)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      id,
      name.trim(),
      phone?.trim() || null,
      email?.trim() || null,
      note?.trim() || null,
    ],
  });

  if (Array.isArray(courseIds)) {
    await syncLecturerCourses(db, id, courseIds);
  }

  return res.status(201).json({
    success: true,
    message: "Dosen baru berhasil ditambahkan.",
    data: { id },
  });
}

async function handlePut(req, res, db) {
  const body = parseBody(req);
  const id = req.query?.id || body.id;
  if (!id) {
    return res.status(400).json({ success: false, message: "ID dosen wajib disertakan." });
  }

  const { name, phone, email, note, courseIds } = body;
  let phoneVal = null;
  if (phone !== undefined) {
    phoneVal = phone?.trim() || null;
  }
  let emailVal = null;
  if (email !== undefined) {
    emailVal = email?.trim() || null;
  }
  let noteVal = null;
  if (note !== undefined) {
    noteVal = note?.trim() || null;
  }

  await db.execute({
    sql: `UPDATE lecturers SET
            name = COALESCE(?, name),
            phone = CASE WHEN ? = 1 THEN ? ELSE phone END,
            email = CASE WHEN ? = 1 THEN ? ELSE email END,
            note = CASE WHEN ? = 1 THEN ? ELSE note END
          WHERE id = ?`,
    args: [
      name?.trim() || null,
      phone !== undefined ? 1 : 0,
      phoneVal,
      email !== undefined ? 1 : 0,
      emailVal,
      note !== undefined ? 1 : 0,
      noteVal,
      id,
    ],
  });

  if (Array.isArray(courseIds)) {
    await syncLecturerCourses(db, id, courseIds);
  }

  return res.status(200).json({ success: true, message: "Data dosen berhasil diperbarui." });
}

async function handleDelete(req, res, db) {
  const body = parseBody(req);
  const id = req.query?.id || body.id;
  if (!id) {
    return res.status(400).json({ success: false, message: "ID dosen wajib disertakan." });
  }

  // Unlink assigned courses
  await db.execute({
    sql: "UPDATE courses SET lecturer_id = NULL WHERE lecturer_id = ?",
    args: [id],
  });

  await db.execute({
    sql: "DELETE FROM lecturers WHERE id = ?",
    args: [id],
  });

  return res.status(200).json({ success: true, message: "Data dosen berhasil dihapus." });
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
