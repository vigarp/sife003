import { verifyToken } from "../_lib/auth.js";
import { getDb } from "../_lib/db.js";
import { ensureSchema } from "../_lib/schema.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const payload = verifyToken(req);
  if (!payload) {
    return res.status(401).json({
      success: false,
      message: "Token tidak valid atau telah kedaluwarsa.",
    });
  }

  try {
    await ensureSchema();
    const db = getDb();

    // 1. Check students table
    const studentRes = await db.execute({
      sql: "SELECT id, nim, name, phone, is_admin, is_guest FROM students WHERE id = ? OR LOWER(nim) = ? LIMIT 1",
      args: [payload.id, String(payload.username || "").toLowerCase()],
    });

    if (studentRes.rows.length > 0) {
      const s = studentRes.rows[0];
      const isAdmin = Boolean(s.is_admin);
      return res.status(200).json({
        success: true,
        data: {
          id: s.id,
          username: s.nim,
          nim: s.nim,
          nama_lengkap: s.name,
          role: isAdmin ? "pengurus" : "student",
          isAdmin,
          phone: s.phone || null,
          isGuest: Boolean(s.is_guest),
        },
      });
    }

    // 2. Check users table
    const result = await db.execute({
      sql: "SELECT id, username, nama_lengkap, role, created_at FROM users WHERE id = ? LIMIT 1",
      args: [payload.id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan.",
      });
    }

    const u = result.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        id: u.id,
        username: u.username,
        nama_lengkap: u.nama_lengkap,
        role: u.role,
        isAdmin: u.role === "pengurus" || u.role === "admin",
      },
    });
  } catch (error) {
    console.error("Auth Me Error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memverifikasi user.",
      error: error.message,
    });
  }
}
