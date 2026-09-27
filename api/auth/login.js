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

function checkStudentPassword(password, student) {
  if (student.password_hash) {
    return comparePassword(password, student.password_hash);
  }
  return String(password).trim() === String(student.nim).trim();
}

async function tryUserLogin(db, username, password) {
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE LOWER(username) = ? LIMIT 1",
    args: [username.toLowerCase()],
  });
  if (result.rows.length === 0) return null;

  const user = result.rows[0];
  if (!comparePassword(password, user.password_hash)) {
    return { error: "Username atau kata sandi salah." };
  }

  const token = generateToken({
    id: user.id,
    username: user.username,
    nama_lengkap: user.nama_lengkap,
    role: user.role,
    isAdmin: true,
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      nama_lengkap: user.nama_lengkap,
      role: user.role,
      isAdmin: true,
    },
  };
}

async function tryStudentLogin(db, username, password) {
  const result = await db.execute({
    sql: "SELECT * FROM students WHERE LOWER(nim) = ? LIMIT 1",
    args: [username.toLowerCase()],
  });
  if (result.rows.length === 0) return null;

  const student = result.rows[0];
  if (!checkStudentPassword(password, student)) {
    return { error: "NIM atau kata sandi salah. Kata sandi bawaan adalah NIM Anda." };
  }

  const isAdmin = Boolean(student.is_admin);
  const role = isAdmin ? "pengurus" : "student";
  const token = generateToken({
    id: student.id,
    username: student.nim,
    nama_lengkap: student.name,
    role,
    isAdmin,
  });

  return {
    token,
    user: {
      id: student.id,
      username: student.nim,
      nim: student.nim,
      nama_lengkap: student.name,
      role,
      isAdmin,
      phone: student.phone || null,
    },
  };
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
        message: "Username/NIM dan kata sandi wajib diisi.",
      });
    }

    const trimmedUser = String(username).trim();

    // 1. Check users table (e.g. master admin)
    const userAuth = await tryUserLogin(db, trimmedUser, password);
    if (userAuth?.error) {
      return res.status(401).json({ success: false, message: userAuth.error });
    }
    if (userAuth) {
      return res.status(200).json({
        success: true,
        message: "Login berhasil sebagai Pengurus.",
        data: userAuth,
      });
    }

    // 2. Check students table (by NIM)
    const studentAuth = await tryStudentLogin(db, trimmedUser, password);
    if (studentAuth?.error) {
      return res.status(401).json({ success: false, message: studentAuth.error });
    }
    if (studentAuth) {
      return res.status(200).json({
        success: true,
        message: studentAuth.user.isAdmin
          ? "Login berhasil sebagai Pengurus Kelas."
          : "Login berhasil sebagai Mahasiswa.",
        data: studentAuth,
      });
    }

    return res.status(401).json({
      success: false,
      message: "Akun atau NIM tidak terdaftar dalam sistem kelas 03SIFE003.",
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
