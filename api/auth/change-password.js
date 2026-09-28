import { verifyToken, comparePassword, hashPassword } from "../_lib/auth.js";
import { getDb } from "../_lib/db.js";
import { ensureSchema } from "../_lib/schema.js";

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

async function changeStudentPassword(db, student, oldPassword, newPassword) {
  let isMatch = false;
  if (student.password_hash) {
    isMatch = comparePassword(oldPassword, student.password_hash);
  } else {
    isMatch = oldPassword.trim() === String(student.nim).trim();
  }

  if (!isMatch) {
    return { error: "Kata sandi lama tidak sesuai." };
  }

  const newHash = hashPassword(newPassword);
  await db.execute({
    sql: "UPDATE students SET password_hash = ? WHERE id = ?",
    args: [newHash, student.id],
  });
  return { success: true };
}

async function changeUserPassword(db, user, oldPassword, newPassword) {
  const isMatch = comparePassword(oldPassword, user.password_hash);
  if (!isMatch) {
    return { error: "Kata sandi lama tidak sesuai." };
  }

  const newHash = hashPassword(newPassword);
  await db.execute({
    sql: "UPDATE users SET password_hash = ? WHERE id = ?",
    args: [newHash, user.id],
  });
  return { success: true };
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

    // 1. Check students table
    const studentRes = await db.execute({
      sql: "SELECT * FROM students WHERE id = ? OR LOWER(nim) = ? LIMIT 1",
      args: [payload.id, String(payload.username || "").toLowerCase()],
    });

    if (studentRes.rows.length > 0) {
      const studentChange = await changeStudentPassword(db, studentRes.rows[0], oldPassword, newPassword);
      if (studentChange.error) {
        return res.status(400).json({ success: false, message: studentChange.error });
      }
      return res.status(200).json({ success: true, message: "Kata sandi berhasil diperbarui." });
    }

    // 2. Check users table
    const userRes = await db.execute({
      sql: "SELECT * FROM users WHERE id = ? LIMIT 1",
      args: [payload.id],
    });

    if (userRes.rows.length > 0) {
      const userChange = await changeUserPassword(db, userRes.rows[0], oldPassword, newPassword);
      if (userChange.error) {
        return res.status(400).json({ success: false, message: userChange.error });
      }
      return res.status(200).json({ success: true, message: "Kata sandi berhasil diperbarui." });
    }

    return res.status(404).json({
      success: false,
      message: "Pengguna tidak ditemukan.",
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
