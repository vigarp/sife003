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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const db = getDb();
  await ensureSchema();

  // GET is public or protected
  if (req.method === "GET") {
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

  // Auth required for write operations
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Akses ditolak: Token otorisasi tidak ditemukan." });
  }
  const token = authHeader.split(" ")[1];
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: "Akses ditolak: Sesi tidak valid atau telah kedaluwarsa." });
  }

  const body = parseBody(req);

  if (req.method === "POST") {
    const { nim, name, isGuest, courseIds } = body;
    if (!nim || !name) {
      return res.status(400).json({ success: false, message: "NIM dan Nama mahasiswa wajib diisi." });
    }
    const id = body.id || `s-${Date.now()}-${Date.now().toString(36)}`;
    await db.execute({
      sql: `INSERT INTO students (id, nim, name, is_guest, course_ids) VALUES (?, ?, ?, ?, ?)`,
      args: [
        id,
        nim.trim(),
        name.trim(),
        isGuest ? 1 : 0,
        courseIds?.length ? JSON.stringify(courseIds) : null,
      ],
    });
    return res.status(201).json({ success: true, message: "Mahasiswa berhasil ditambahkan.", data: { id } });
  }

  if (req.method === "DELETE") {
    const id = req.query?.id || body.id;
    if (!id) {
      return res.status(400).json({ success: false, message: "ID mahasiswa wajib disertakan." });
    }
    await db.execute({ sql: "DELETE FROM students WHERE id = ?", args: [id] });
    return res.status(200).json({ success: true, message: "Mahasiswa berhasil dihapus." });
  }

  return res.status(405).json({ success: false, message: "Method not allowed." });
}
