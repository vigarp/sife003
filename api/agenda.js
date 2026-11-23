import { createCrudHandler, getRequestId } from "./_lib/http.js";

const PEKAN_ORDER_SQL = `CASE
  WHEN UPPER(CAST(pekan AS TEXT)) = 'UTS' THEN 7.5
  WHEN UPPER(CAST(pekan AS TEXT)) = 'UAS' THEN 14.5
  ELSE CAST(pekan AS REAL)
END`;

function getPekanSortOrder(pekan) {
  if (pekan === undefined || pekan === null || pekan === "") {
    return null;
  }
  const upper = String(pekan).trim().toUpperCase();
  if (upper === "UTS" || upper === "PEKAN UTS") return 7.5;
  if (upper === "UAS" || upper === "PEKAN UAS") return 14.5;
  const parsed = Number.parseFloat(upper.replace(/^PEKAN\s*/i, ""));
  return Number.isNaN(parsed) ? null : parsed;
}

function parsePertemuanValue(pertemuan) {
  if (pertemuan === undefined || pertemuan === null || pertemuan === "") {
    return null;
  }
  return Number.parseInt(pertemuan, 10);
}

function parsePekanValue(pekan) {
  if (pekan === undefined || pekan === null || pekan === "") {
    return null;
  }
  const pekanUpper = String(pekan).trim().toUpperCase();
  if (pekanUpper === "UTS" || pekanUpper === "UAS") {
    return pekanUpper;
  }
  return Number.parseInt(pekan, 10) || pekan;
}

async function handleGet({ req, res, db }) {
  const { pekan, all, exact } = req.query || {};

  let sql = `SELECT * FROM agenda ORDER BY ${PEKAN_ORDER_SQL} ASC, id ASC`;
  let args = [];

  if (pekan && !all) {
    const targetOrder = getPekanSortOrder(pekan);
    if (exact === "true" || targetOrder === null) {
      sql = "SELECT * FROM agenda WHERE CAST(pekan AS TEXT) = ? ORDER BY id ASC";
      args = [String(pekan).trim()];
    } else {
      sql = `SELECT * FROM agenda WHERE (${PEKAN_ORDER_SQL}) >= ? ORDER BY ${PEKAN_ORDER_SQL} ASC, id ASC`;
      args = [targetOrder];
    }
  }

  const result = await db.execute({ sql, args });
  return res.status(200).json({
    success: true,
    data: result.rows,
  });
}

async function handlePost({ res, db, user, body }) {
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

  const parsedPertemuan = parsePertemuanValue(pertemuan);
  const pekanVal = parsePekanValue(pekan);

  const result = await db.execute({
    sql: `INSERT INTO agenda (pekan, pertemuan, mata_kuliah, judul, keterangan, tipe_deadline, tanggal, jam, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      pekanVal,
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

async function handlePut({ req, res, db, body }) {
  const id = getRequestId(req, body);

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

  const parsedPertemuan = parsePertemuanValue(pertemuan);
  const pekanVal = parsePekanValue(pekan);

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
      pekanVal,
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

async function handleDelete({ req, res, db, body }) {
  const id = getRequestId(req, body);

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

export default createCrudHandler({
  handlers: {
    GET: handleGet,
    POST: handlePost,
    PUT: handlePut,
    DELETE: handleDelete,
  },
  optionsStatus: 204,
  auth: {
    unauthenticatedMessage: "Akses ditolak: Silakan login sebagai pengurus kelas.",
  },
  methodNotAllowedMessage: (req) => `Method ${req.method} tidak didukung.`,
  errorLogLabel: "API Agenda Error:",
  errorMessage: "Terjadi kesalahan pada server database.",
});
