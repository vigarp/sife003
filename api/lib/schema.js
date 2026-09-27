import { getDb } from "./db.js";
import { hashPassword } from "./auth.js";

let initialized = false;

export async function ensureSchema() {
  if (initialized) return;

  const db = getDb();

  // Create users table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nama_lengkap TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'pengurus',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create agenda table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS agenda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pekan INTEGER NOT NULL,
      pertemuan INTEGER DEFAULT 4,
      mata_kuliah TEXT NOT NULL,
      judul TEXT NOT NULL,
      keterangan TEXT,
      tipe_deadline TEXT NOT NULL DEFAULT 'week_only', -- 'datetime' | 'date_only' | 'week_only'
      tanggal TEXT,
      jam TEXT,
      is_completed INTEGER DEFAULT 0,
      created_by TEXT DEFAULT 'Pengurus Kelas',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure default admin exists
  const existingUser = await db.execute({
    sql: "SELECT id FROM users WHERE username = ? LIMIT 1",
    args: ["admin"],
  });

  if (existingUser.rows.length === 0) {
    const defaultHash = hashPassword("admin123");
    await db.execute({
      sql: `INSERT INTO users (username, password_hash, nama_lengkap, role) VALUES (?, ?, ?, ?)`,
      args: ["admin", defaultHash, "Pengurus Kelas 03SIFE003", "pengurus"],
    });
  }

  // Check if agenda table has any rows. If empty, populate with sample items for Pekan 4 and 5
  const existingAgenda = await db.execute("SELECT COUNT(*) as count FROM agenda");
  const count = existingAgenda.rows[0]?.count ?? 0;

  if (count === 0) {
    const initialAgendas = [
      {
        pekan: 5,
        pertemuan: 4,
        mata_kuliah: "Analisa Proses Bisnis",
        judul: "Tugas 2: Pemodelan Diagram BPMN Pengadaan Barang",
        keterangan: "Upload PDF di LMS Mentari. Batas toleransi penutupan slot tugas otomatis jam 23.59 WIB.",
        tipe_deadline: "datetime",
        tanggal: "2026-10-02",
        jam: "23:59",
      },
      {
        pekan: 5,
        pertemuan: 4,
        mata_kuliah: "Rekayasa Web",
        judul: "Laporan Praktikum: State Management & Vue Router",
        keterangan: "Format laporan bebas PDF, kumpulkan via drive kelas sebelum hari Sabtu.",
        tipe_deadline: "date_only",
        tanggal: "2026-10-02",
        jam: null,
      },
      {
        pekan: 5,
        pertemuan: 4,
        mata_kuliah: "Pemrograman Berorientasi Obyek (Java I)",
        judul: "Lanjutan Latihan Praktikum Pertemuan 4 (Polymorphism)",
        keterangan: "Dikerjakan di laptop masing-masing, akan dibahas dan dicek oleh dosen saat masuk kelas pertemuan 5 hari Sabtu.",
        tipe_deadline: "week_only",
        tanggal: null,
        jam: null,
      },
      {
        pekan: 4,
        pertemuan: 4,
        mata_kuliah: "Analisa Proses Bisnis",
        judul: "Tugas 2: Pemodelan Diagram BPMN Pengadaan Barang",
        keterangan: "Upload PDF di LMS Mentari. Batas toleransi penutupan slot tugas otomatis jam 23.59 WIB.",
        tipe_deadline: "datetime",
        tanggal: "2026-10-02",
        jam: "23:59",
      },
      {
        pekan: 4,
        pertemuan: 4,
        mata_kuliah: "Rekayasa Web",
        judul: "Laporan Praktikum: State Management & Vue Router",
        keterangan: "Format laporan bebas PDF, kumpulkan via drive kelas sebelum hari Sabtu.",
        tipe_deadline: "date_only",
        tanggal: "2026-10-02",
        jam: null,
      },
      {
        pekan: 4,
        pertemuan: 4,
        mata_kuliah: "Pemrograman Berorientasi Obyek (Java I)",
        judul: "Lanjutan Latihan Praktikum Pertemuan 4 (Polymorphism)",
        keterangan: "Dikerjakan di laptop masing-masing, akan dibahas dan dicek oleh dosen saat masuk kelas pertemuan 5 hari Sabtu.",
        tipe_deadline: "week_only",
        tanggal: null,
        jam: null,
      },
    ];

    for (const item of initialAgendas) {
      await db.execute({
        sql: `INSERT INTO agenda (pekan, pertemuan, mata_kuliah, judul, keterangan, tipe_deadline, tanggal, jam)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          item.pekan,
          item.pertemuan,
          item.mata_kuliah,
          item.judul,
          item.keterangan,
          item.tipe_deadline,
          item.tanggal,
          item.jam,
        ],
      });
    }
  }

  initialized = true;
}
