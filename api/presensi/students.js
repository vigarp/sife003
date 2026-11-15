import { createCrudHandler, getRequestId } from "../_lib/http.js";

function buildStudentRowArgs(id, student) {
  return [
    id,
    String(student.nim).trim(),
    String(student.name).trim(),
    student.phone ? String(student.phone).trim() : null,
    student.isGuest ? 1 : 0,
    student.courseIds?.length ? JSON.stringify(student.courseIds) : null,
    student.isAdmin ? 1 : 0,
  ];
}

async function handleGet({ res, db }) {
  const studentsRes = await db.execute(
    "SELECT id, nim, name, phone, is_guest, course_ids, is_admin FROM students ORDER BY name ASC"
  );
  const students = studentsRes.rows.map((s) => ({
    id: s.id,
    nim: s.nim,
    name: s.name,
    phone: s.phone || null,
    isGuest: Boolean(s.is_guest),
    isAdmin: Boolean(s.is_admin),
    courseIds: s.course_ids ? JSON.parse(s.course_ids) : undefined,
  }));
  return res.status(200).json({ success: true, data: students });
}

async function handleBulkPost(students, res, db) {
  const validStudents = students.filter((s) => s.nim && s.name);
  const now = Date.now();
  const nowBase36 = now.toString(36);

  await Promise.all(
    validStudents.map((s, idx) => {
      const id = s.id || `s-${now}-${nowBase36}-${idx}`;
      return db.execute({
        sql: "INSERT OR REPLACE INTO students (id, nim, name, phone, is_guest, course_ids, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: buildStudentRowArgs(id, s),
      });
    })
  );

  const inserted = validStudents.length;
  return res.status(201).json({
    success: true,
    message: `${inserted} mahasiswa berhasil diproses.`,
    data: { count: inserted },
  });
}

async function handlePost({ res, db, body }) {
  if (Array.isArray(body.students)) {
    return handleBulkPost(body.students, res, db);
  }

  const { nim, name } = body;
  if (!nim || !name) {
    return res.status(400).json({ success: false, message: "NIM dan Nama mahasiswa wajib diisi." });
  }

  const id = body.id || `s-${Date.now()}-${Date.now().toString(36)}`;
  await db.execute({
    sql: "INSERT INTO students (id, nim, name, phone, is_guest, course_ids, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: buildStudentRowArgs(id, body),
  });

  return res.status(201).json({
    success: true,
    message: "Mahasiswa berhasil ditambahkan.",
    data: { id },
  });
}

async function handlePut({ req, res, db, body }) {
  const id = getRequestId(req, body);
  if (!id) {
    return res.status(400).json({ success: false, message: "ID mahasiswa wajib disertakan." });
  }

  const { nim, name, phone, isGuest, courseIds, isAdmin } = body;
  let isGuestVal = null;
  if (isGuest !== undefined) {
    isGuestVal = isGuest ? 1 : 0;
  }
  let phoneVal = null;
  if (phone !== undefined) {
    phoneVal = phone ? String(phone).trim() : null;
  }
  let isAdminVal = null;
  if (isAdmin !== undefined) {
    isAdminVal = isAdmin ? 1 : 0;
  }

  await db.execute({
    sql: `UPDATE students SET
            nim = COALESCE(?, nim),
            name = COALESCE(?, name),
            phone = CASE WHEN ? = 1 THEN ? ELSE phone END,
            is_guest = COALESCE(?, is_guest),
            course_ids = ?,
            is_admin = CASE WHEN ? = 1 THEN ? ELSE is_admin END
          WHERE id = ?`,
    args: [
      nim ? String(nim).trim() : null,
      name ? String(name).trim() : null,
      phone !== undefined ? 1 : 0,
      phoneVal,
      isGuestVal,
      courseIds?.length ? JSON.stringify(courseIds) : null,
      isAdmin !== undefined ? 1 : 0,
      isAdminVal,
      id,
    ],
  });

  return res.status(200).json({ success: true, message: "Data mahasiswa berhasil diperbarui." });
}

async function handleDelete({ req, res, db, body }) {
  const id = getRequestId(req, body);
  if (!id) {
    return res.status(400).json({ success: false, message: "ID mahasiswa wajib disertakan." });
  }
  await db.execute({ sql: "DELETE FROM students WHERE id = ?", args: [id] });
  return res.status(200).json({ success: true, message: "Mahasiswa berhasil dihapus." });
}

export default createCrudHandler({
  handlers: {
    GET: handleGet,
    POST: handlePost,
    PUT: handlePut,
    DELETE: handleDelete,
  },
  auth: {
    authorize: (user) => Boolean(user.isAdmin || user.role === "pengurus" || user.role === "admin"),
    forbiddenStatus: 403,
    forbiddenMessage: "Akses ditolak: Hanya pengurus/admin yang memiliki izin mengelola data mahasiswa.",
  },
});
