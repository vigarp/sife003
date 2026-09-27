import { verifyToken, comparePassword, hashPassword } from "../lib/auth.js";
import { getDb } from "../lib/db.js";
import { ensureSchema } from "../lib/schema.js";

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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const payload = verifyToken(req);
  if (!payload) {
    return res.status(401).json({
      success: false,
      message: "Akses ditolak: Silakan login terlebih dahulu.",
    });
  }

  try {
    await ensureSchema();
    const db = getDb();
    const body = parseBody(req);
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Password lama dan password baru wajib diisi.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password baru minimal 6 karakter.",
      });
    }

    const result = await db.execute({
      sql: "SELECT * FROM users WHERE id = ? LIMIT 1",
      args: [payload.id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan.",
      });
    }

    const user = result.rows[0];
    const isMatch = comparePassword(oldPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Password lama tidak sesuai.",
      });
    }

    const newHash = hashPassword(newPassword);
    await db.execute({
      sql: "UPDATE users SET password_hash = ? WHERE id = ?",
      args: [newHash, payload.id],
    });

    return res.status(200).json({
      success: true,
      message: "Password berhasil diperbarui.",
    });
  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengganti password.",
      error: error.message,
    });
  }
}
