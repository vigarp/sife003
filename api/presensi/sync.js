import { getDb } from "../_lib/db.js";
import { ensureSchema } from "../_lib/schema.js";
import { verifyToken } from "../_lib/auth.js";

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

function authenticate(req) {
  return verifyToken(req);
}

async function upsertSessionRecords(db, sessionId, records) {
  await db.execute({
    sql: "DELETE FROM attendance_records WHERE session_id = ?",
    args: [sessionId],
  });

  if (!records || typeof records !== "object") return;

  const validStatuses = new Set(["present", "permit", "sick", "absent"]);
  for (const [studentId, status] of Object.entries(records)) {
    if (validStatuses.has(status)) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO attendance_records (session_id, student_id, status)
              VALUES (?, ?, ?)`,
        args: [sessionId, studentId, status],
      });
    }
  }
}

async function upsertSession(db, sess, user) {
  if (!sess.id || !sess.courseId || !sess.date) return;

  const existingRes = await db.execute({
    sql: "SELECT updated_at FROM attendance_sessions WHERE id = ? LIMIT 1",
    args: [sess.id],
  });

  const existingUpdatedAt = existingRes.rows[0]?.updated_at ?? 0;
  const incomingUpdatedAt = Number(sess.updatedAt) || Date.now();

  if (incomingUpdatedAt < existingUpdatedAt) return;

  await db.execute({
    sql: `INSERT INTO attendance_sessions (id, course_id, date, meeting_no, note, created_by, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            course_id = excluded.course_id,
            date = excluded.date,
            meeting_no = excluded.meeting_no,
            note = excluded.note,
            created_by = excluded.created_by,
            updated_at = excluded.updated_at`,
    args: [
      sess.id,
      sess.courseId,
      sess.date,
      sess.meetingNo ? Number(sess.meetingNo) : null,
      sess.note || null,
      user.nama_lengkap || user.username || "Pengurus",
      incomingUpdatedAt,
    ],
  });

  await upsertSessionRecords(db, sess.id, sess.records);
}

async function fetchAllLatestSessions(db) {
  const sessionsRes = await db.execute("SELECT id, course_id, date, meeting_no, note, updated_at FROM attendance_sessions ORDER BY date DESC, id DESC");
  const recordsRes = await db.execute("SELECT session_id, student_id, status FROM attendance_records");

  const recordsBySession = {};
  for (const r of recordsRes.rows) {
    if (!recordsBySession[r.session_id]) {
      recordsBySession[r.session_id] = {};
    }
    recordsBySession[r.session_id][r.student_id] = r.status;
  }

  return sessionsRes.rows.map((s) => ({
    id: s.id,
    courseId: s.course_id,
    date: s.date,
    meetingNo: s.meeting_no || undefined,
    note: s.note || undefined,
    records: recordsBySession[s.id] || {},
    updatedAt: s.updated_at,
  }));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed." });
  }

  const user = authenticate(req);
  if (!user) {
    return res.status(401).json({ success: false, message: "Akses ditolak: Sesi tidak valid atau telah kedaluwarsa." });
  }

  const db = getDb();
  await ensureSchema();

  const body = parseBody(req);
  const incomingSessions = Array.isArray(body.sessions) ? body.sessions : [];

  try {
    for (const sess of incomingSessions) {
      await upsertSession(db, sess, user);
    }

    const latestSessions = await fetchAllLatestSessions(db);

    return res.status(200).json({
      success: true,
      message: "Sinkronisasi presensi berhasil.",
      data: {
        sessions: latestSessions,
      },
    });
  } catch (err) {
    console.error("Error in attendance sync:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Gagal melakukan sinkronisasi presensi.",
    });
  }
}
