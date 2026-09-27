import { verifyToken } from "../lib/auth.js";
import { getDb } from "../lib/db.js";
import { ensureSchema } from "../lib/schema.js";

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

    return res.status(200).json({
      success: true,
      data: result.rows[0],
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
