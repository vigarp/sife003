import { getDb } from "./lib/db.js";
import { ensureSchema } from "./lib/schema.js";
import { verifyToken } from "./lib/auth.js";

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

async function handleGet(req, res, db) {
  const { pekan, all } = req.query || {};

  let sql = "SELECT * FROM agenda ORDER BY pekan ASC, id ASC";
  let args = [];

  if (pekan && !all) {
    sql = "SELECT * FROM agenda WHERE pekan = ? ORDER BY id ASC";
    args = [Number.parseInt(pekan, 10)];
  }

  const result = await db.execute({ sql, args });
  return res.status(200).json({
    success: true,
    data: result.rows,
  });
}

async function handlePost(req, res, db, user) {
  const body = parseBody(req);
  const {
    pekan,
    pertemuan = null,
    mata_kuliah,
    judul,
    keterangan = "",
    tipe_deadline = "week_only",
    tanggal = null,
    jam = null,
  } = body;

  if (!pekan || !mata_kuliah || !judul) {
    return res.status(400).json({
      success: false,
      message: "Field pekan, mata_kuliah, dan judul wajib diisi.",
    });
  }

  const parsedPertemuan =
    pertemuan !== undefined && pertemuan !== null && pertemuan !== ""
      ? Number.parseInt(pertemuan, 10)
      : null;

  const result = await db.execute({
    sql: `INSERT INTO agenda (pekan, pertemuan, mata_kuliah, judul, keterangan, tipe_deadline, tanggal, jam, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      Number.parseInt(pekan, 10),
      parsedPertemuan,
      mata_kuliah.trim(),
      judul.trim(),
      keterangan ? keterangan.trim() : null,
      tipe_deadline,
      tanggal || null,
      jam || null,
      user.nama_lengkap || user.username,
    ],
  });

  return res.status(201).json({
    success: true,
    message: "Agenda berhasil ditambahkan.",
    data: {
      id: Number(result.lastInsertRowid),
    },
  });
}

async function handlePut(req, res, db) {
  const body = parseBody(req);
  const id = req.query?.id || body.id;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "ID agenda wajib disertakan.",
    });
  }

  const {
    pekan,
    pertemuan,
    mata_kuliah,
    judul,
    keterangan,
    tipe_deadline,
    tanggal,
    jam,
    is_completed,
  } = body;

  const parsedPertemuan =
    pertemuan !== undefined && pertemuan !== null && pertemuan !== ""
      ? Number.parseInt(pertemuan, 10)
      : null;

  await db.execute({
    sql: `UPDATE agenda SET
            pekan = COALESCE(?, pekan),
            pertemuan = ?,
            mata_kuliah = COALESCE(?, mata_kuliah),
            judul = COALESCE(?, judul),
            keterangan = COALESCE(?, keterangan),
            tipe_deadline = COALESCE(?, tipe_deadline),
            tanggal = ?,
            jam = ?,
            is_completed = COALESCE(?, is_completed),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
    args: [
      pekan ? Number.parseInt(pekan, 10) : null,
      parsedPertemuan,
      mata_kuliah ? mata_kuliah.trim() : null,
      judul ? judul.trim() : null,
      keterangan !== undefined ? keterangan : null,
      tipe_deadline || null,
      tanggal ?? null,
      jam ?? null,
      is_completed !== undefined ? Number(is_completed) : null,
      Number.parseInt(id, 10),
    ],
  });

  return res.status(200).json({
    success: true,
    message: "Agenda berhasil diperbarui.",
  });
}

async function handleDelete(req, res, db) {
  const body = parseBody(req);
  const id = req.query?.id || body.id;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "ID agenda wajib disertakan.",
    });
  }

  await db.execute({
    sql: "DELETE FROM agenda WHERE id = ?",
    args: [Number.parseInt(id, 10)],
  });

  return res.status(200).json({
    success: true,
    message: "Agenda berhasil dihapus.",
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    await ensureSchema();
    const db = getDb();

    if (req.method === "GET") {
      return await handleGet(req, res, db);
    }

    const user = verifyToken(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Akses ditolak: Silakan login sebagai pengurus kelas.",
      });
    }

    if (req.method === "POST") {
      return await handlePost(req, res, db, user);
    }
    if (req.method === "PUT") {
      return await handlePut(req, res, db);
    }
    if (req.method === "DELETE") {
      return await handleDelete(req, res, db);
    }

    return res.status(405).json({
      success: false,
      message: `Method ${req.method} tidak didukung.`,
    });
  } catch (error) {
    console.error("API Agenda Error:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server database.",
      error: error.message,
    });
  }
}
