import { createCrudHandler, getRequestId } from "../_lib/http.js";

async function handleGet({ res, db }) {
  const lecturersRes = await db.execute(`
    SELECT
      l.id,
      l.name,
      l.phone,
      l.email,
      l.note,
      (
        SELECT json_group_array(
          json_object('id', c.id, 'name', c.name, 'code', c.code)
        )
        FROM courses c
        WHERE c.lecturer_id = l.id
      ) as courses_json
    FROM lecturers l
    ORDER BY l.name ASC
  `);

  const lecturers = lecturersRes.rows.map((row) => {
    let courses = [];
    if (row.courses_json) {
      try {
        const parsed = JSON.parse(row.courses_json);
        courses = Array.isArray(parsed) ? parsed.filter((c) => c?.id) : [];
      } catch {
        courses = [];
      }
    }
    return {
      id: row.id,
      name: row.name,
      phone: row.phone || null,
      email: row.email || null,
      note: row.note || null,
      courses,
    };
  });

  return res.status(200).json({ success: true, data: lecturers });
}

async function syncLecturerCourses(db, lecturerId, courseIds) {
  if (!Array.isArray(courseIds)) return;

  // Clear previous assignments for this lecturer
  await db.execute({
    sql: "UPDATE courses SET lecturer_id = NULL WHERE lecturer_id = ?",
    args: [lecturerId],
  });

  // Assign selected courses
  const validIds = courseIds.filter(Boolean);
  await Promise.all(
    validIds.map((cid) =>
      db.execute({
        sql: "UPDATE courses SET lecturer_id = ? WHERE id = ?",
        args: [lecturerId, cid],
      })
    )
  );
}

async function handlePost({ res, db, body }) {
  const { name, phone, email, note, courseIds } = body;

  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: "Nama dosen wajib diisi." });
  }

  const id = body.id || `d-${Date.now()}-${Date.now().toString(36)}`;
  await db.execute({
    sql: `INSERT INTO lecturers (id, name, phone, email, note)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      id,
      name.trim(),
      phone?.trim() || null,
      email?.trim() || null,
      note?.trim() || null,
    ],
  });

  if (Array.isArray(courseIds)) {
    await syncLecturerCourses(db, id, courseIds);
  }

  return res.status(201).json({
    success: true,
    message: "Dosen baru berhasil ditambahkan.",
    data: { id },
  });
}

async function handlePut({ req, res, db, body }) {
  const id = getRequestId(req, body);
  if (!id) {
    return res.status(400).json({ success: false, message: "ID dosen wajib disertakan." });
  }

  const { name, phone, email, note, courseIds } = body;
  let phoneVal = null;
  if (phone !== undefined) {
    phoneVal = phone?.trim() || null;
  }
  let emailVal = null;
  if (email !== undefined) {
    emailVal = email?.trim() || null;
  }
  let noteVal = null;
  if (note !== undefined) {
    noteVal = note?.trim() || null;
  }

  await db.execute({
    sql: `UPDATE lecturers SET
            name = COALESCE(?, name),
            phone = CASE WHEN ? = 1 THEN ? ELSE phone END,
            email = CASE WHEN ? = 1 THEN ? ELSE email END,
            note = CASE WHEN ? = 1 THEN ? ELSE note END
          WHERE id = ?`,
    args: [
      name?.trim() || null,
      phone !== undefined ? 1 : 0,
      phoneVal,
      email !== undefined ? 1 : 0,
      emailVal,
      note !== undefined ? 1 : 0,
      noteVal,
      id,
    ],
  });

  if (Array.isArray(courseIds)) {
    await syncLecturerCourses(db, id, courseIds);
  }

  return res.status(200).json({ success: true, message: "Data dosen berhasil diperbarui." });
}

async function handleDelete({ req, res, db, body }) {
  const id = getRequestId(req, body);
  if (!id) {
    return res.status(400).json({ success: false, message: "ID dosen wajib disertakan." });
  }

  // Unlink assigned courses
  await db.execute({
    sql: "UPDATE courses SET lecturer_id = NULL WHERE lecturer_id = ?",
    args: [id],
  });

  await db.execute({
    sql: "DELETE FROM lecturers WHERE id = ?",
    args: [id],
  });

  return res.status(200).json({ success: true, message: "Data dosen berhasil dihapus." });
}

export default createCrudHandler({
  handlers: {
    GET: handleGet,
    POST: handlePost,
    PUT: handlePut,
    DELETE: handleDelete,
  },
});
