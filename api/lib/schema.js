import fs from "node:fs";
import path from "node:path";
import { getDb } from "./db.js";
import { hashPassword } from "./auth.js";

let initialized = false;

async function createTables(db) {
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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      nim TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      is_guest INTEGER DEFAULT 0,
      course_ids TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      code TEXT,
      name TEXT NOT NULL,
      class_name TEXT DEFAULT '03SIFE003',
      lecturer TEXT,
      time TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      date TEXT NOT NULL,
      meeting_no INTEGER,
      note TEXT,
      created_by TEXT DEFAULT 'Pengurus',
      updated_at INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      UNIQUE(session_id, student_id),
      FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);
}

async function ensureAdminUser(db) {
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
}

async function seedCourses(db, courses) {
  for (const c of courses) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO courses (id, code, name, class_name, lecturer, time)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [c.id, c.code || null, c.name, c.className || "03SIFE003", c.lecturer || null, c.time || null],
    });
  }
}

async function seedStudents(db, students) {
  for (const s of students) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO students (id, nim, name, is_guest, course_ids)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        s.id,
        s.nim,
        s.name,
        s.isGuest ? 1 : 0,
        s.courseIds?.length ? JSON.stringify(s.courseIds) : null,
      ],
    });
  }
}

async function seedSessions(db, sessions) {
  for (const sess of sessions) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO attendance_sessions (id, course_id, date, meeting_no, updated_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [sess.id, sess.courseId, sess.date, sess.meetingNo || null, sess.updatedAt || Date.now()],
    });

    if (sess.records) {
      for (const [studentId, status] of Object.entries(sess.records)) {
        await db.execute({
          sql: `INSERT OR IGNORE INTO attendance_records (session_id, student_id, status)
                VALUES (?, ?, ?)`,
          args: [sess.id, studentId, status],
        });
      }
    }
  }
}

async function seedInitialData(db) {
  const studentCountRes = await db.execute("SELECT COUNT(*) as count FROM students");
  const studentCount = studentCountRes.rows[0]?.count ?? 0;
  if (studentCount > 0) return;

  try {
    const initialPath = path.resolve(process.cwd(), "src/data/attendance-initial.json");
    if (!fs.existsSync(initialPath)) return;

    const initialData = JSON.parse(fs.readFileSync(initialPath, "utf-8"));
    if (initialData.courses) await seedCourses(db, initialData.courses);
    if (initialData.mainStudents) await seedStudents(db, initialData.mainStudents);
    if (initialData.sessions) await seedSessions(db, initialData.sessions);
  } catch (e) {
    console.error("Error seeding initial attendance data:", e);
  }
}

export async function ensureSchema() {
  if (initialized) return;

  const db = getDb();
  await createTables(db);
  await ensureAdminUser(db);
  await seedInitialData(db);

  initialized = true;
}
