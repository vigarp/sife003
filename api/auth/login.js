import { getDb } from "../lib/db.js";
import { ensureSchema } from "../lib/schema.js";
import { comparePassword, generateToken } from "../lib/auth.js";

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

  try {
    await ensureSchema();
    const db = getDb();
    const body = parseBody(req);
    const { username, password } = body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username dan password wajib diisi.",
      });
    }

    const result = await db.execute({
      sql: "SELECT * FROM users WHERE username = ? LIMIT 1",
      args: [username.trim().toLowerCase()],
    });

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Username atau password salah.",
      });
    }

    const user = result.rows[0];
    const isMatch = comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Username atau password salah.",
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login berhasil.",
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          nama_lengkap: user.nama_lengkap,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Login API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan sistem saat proses login.",
      error: error.message,
    });
  }
}
