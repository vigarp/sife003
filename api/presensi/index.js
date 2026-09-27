import { getDb } from "../lib/db.js";
import { ensureSchema } from "../lib/schema.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed." });
  }

  const db = getDb();
  await ensureSchema();

  try {
    // 1. Fetch courses
    const coursesRes = await db.execute("SELECT id, code, name, class_name, lecturer, time FROM courses ORDER BY name ASC");
    const courses = coursesRes.rows.map((c) => ({
      id: c.id,
      code: c.code || "",
      name: c.name,
      className: c.class_name || "03SIFE003",
      lecturer: c.lecturer || "",
      time: c.time || "",
    }));

    // 2. Fetch students
    const studentsRes = await db.execute("SELECT id, nim, name, phone, is_guest, course_ids FROM students ORDER BY name ASC");
    const students = studentsRes.rows.map((s) => {
      let courseIds = [];
      if (s.course_ids) {
        try {
          courseIds = JSON.parse(s.course_ids);
        } catch {
          courseIds = [];
        }
      }
      return {
        id: s.id,
        nim: s.nim,
        name: s.name,
        phone: s.phone || null,
        isGuest: Boolean(s.is_guest),
        courseIds: courseIds.length ? courseIds : undefined,
      };
    });

    // 3. Fetch attendance sessions
    const sessionsRes = await db.execute("SELECT id, course_id, date, meeting_no, note, created_by, updated_at FROM attendance_sessions ORDER BY date DESC, id DESC");

    // 4. Fetch all records to map to sessions
    const recordsRes = await db.execute("SELECT session_id, student_id, status, note FROM attendance_records");
    const recordsBySession = {};
    for (const r of recordsRes.rows) {
      if (!recordsBySession[r.session_id]) {
        recordsBySession[r.session_id] = {};
      }
      recordsBySession[r.session_id][r.student_id] = r.status;
    }

    const sessions = sessionsRes.rows.map((sess) => ({
      id: sess.id,
      courseId: sess.course_id,
      date: sess.date,
      meetingNo: sess.meeting_no || undefined,
      note: sess.note || undefined,
      records: recordsBySession[sess.id] || {},
      updatedAt: sess.updated_at,
    }));

    return res.status(200).json({
      success: true,
      data: {
        courses,
        students,
        sessions,
      },
    });
  } catch (err) {
    console.error("Error fetching presensi data:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Gagal mengambil data presensi.",
    });
  }
}
