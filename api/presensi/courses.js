import { createCrudHandler, getRequestId } from "../_lib/http.js";

async function handleGet({ res, db }) {
  const coursesRes = await db.execute(`
    SELECT
      c.id, c.code, c.name, c.class_name, c.lecturer_id,
      COALESCE(l.name, c.lecturer) as lecturer,
      l.phone as lecturer_phone,
      c.time
    FROM courses c
    LEFT JOIN lecturers l ON c.lecturer_id = l.id
    ORDER BY c.name ASC
  `);
  const courses = coursesRes.rows.map((c) => ({
    id: c.id,
    code: c.code || "",
    name: c.name,
    className: c.class_name || "03SIFE003",
    lecturerId: c.lecturer_id || null,
    lecturer: c.lecturer || "",
    lecturerPhone: c.lecturer_phone || null,
    time: c.time || "",
  }));
  return res.status(200).json({ success: true, data: courses });
}

async function handlePost({ res, db, body }) {
  const { code, name, className, lecturer, lecturerId, time } = body;

  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: "Nama mata kuliah wajib diisi." });
  }

  const id = body.id || `c-${Date.now()}-${Date.now().toString(36)}`;
  await db.execute({
    sql: `INSERT INTO courses (id, code, name, class_name, lecturer, lecturer_id, time)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      code ? code.trim() : null,
      name.trim(),
      className ? className.trim() : "03SIFE003",
      lecturer ? lecturer.trim() : null,
      lecturerId ? lecturerId.trim() : null,
      time ? time.trim() : null,
    ],
  });

  return res.status(201).json({
    success: true,
    message: "Mata kuliah berhasil ditambahkan.",
    data: { id },
  });
}

async function handlePut({ req, res, db, body }) {
  const id = getRequestId(req, body);
  if (!id) {
    return res.status(400).json({ success: false, message: "ID mata kuliah wajib disertakan." });
  }

  const { code, name, className, lecturer, lecturerId, time } = body;
  await db.execute({
    sql: `UPDATE courses SET
            code = COALESCE(?, code),
            name = COALESCE(?, name),
            class_name = COALESCE(?, class_name),
            lecturer = COALESCE(?, lecturer),
            lecturer_id = CASE WHEN ? = 1 THEN ? ELSE lecturer_id END,
            time = COALESCE(?, time)
          WHERE id = ?`,
    args: [
      code !== undefined ? code?.trim() : null,
      name !== undefined ? name?.trim() : null,
      className !== undefined ? className?.trim() : null,
      lecturer !== undefined ? lecturer?.trim() : null,
      lecturerId !== undefined ? 1 : 0,
      lecturerId ? lecturerId.trim() : null,
      time !== undefined ? time?.trim() : null,
      id,
    ],
  });

  return res.status(200).json({ success: true, message: "Mata kuliah berhasil diperbarui." });
}

async function handleDelete({ req, res, db, body }) {
  const id = getRequestId(req, body);
  if (!id) {
    return res.status(400).json({ success: false, message: "ID mata kuliah wajib disertakan." });
  }

  await db.execute({ sql: "DELETE FROM courses WHERE id = ?", args: [id] });
  return res.status(200).json({ success: true, message: "Mata kuliah berhasil dihapus." });
}

export default createCrudHandler({
  handlers: {
    GET: handleGet,
    POST: handlePost,
    PUT: handlePut,
    DELETE: handleDelete,
  },
});
