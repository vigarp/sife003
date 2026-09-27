export function formatIndonesianDate(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatStudentItem(student, includeNIM, includeGuestBadge) {
  let line = includeNIM && student?.nim ? `${student.nim} - ${student.name}` : student.name;
  if (includeGuestBadge && student?.isGuest) {
    line += " *(Revisi)*";
  }
  return line;
}

function buildHeaderLines({ course, date, meetingNo, customHeaderNote }) {
  const lines = ["*LAPORAN PRESENSI KELAS*"];

  if (course) {
    const courseTitle = [course.name, course.code].filter(Boolean).join(" ");
    if (courseTitle) lines.push(courseTitle);
    if (course.className) lines.push(course.className);
    if (course.lecturer) lines.push(course.lecturer);
  }

  const meetingSuffix = meetingNo ? ` (Pertemuan ${meetingNo})` : "";
  const dateLine = `${formatIndonesianDate(date)}${meetingSuffix}`;
  if (dateLine.trim()) lines.push(dateLine);
  if (course?.time) lines.push(course.time);

  if (customHeaderNote?.trim()) {
    lines.push(`Catatan: ${customHeaderNote.trim()}`);
  }

  lines.push("");
  return lines;
}

function groupStudentsByStatus(students, records) {
  const groups = { present: [], permit: [], sick: [], absent: [] };
  students.forEach((s) => {
    const status = records[s.id] || "present";
    if (groups[status]) {
      groups[status].push(s);
    } else {
      groups.present.push(s);
    }
  });
  return groups;
}

function buildCategoryLines(title, items, formatFn) {
  if (items.length === 0) return [];
  return [
    "",
    title,
    ...items.map((s, idx) => `${idx + 1}. ${formatFn(s)}`),
  ];
}

function buildAbsentSection(permit, sick, absent, formatFn) {
  const notPresentCount = permit.length + sick.length + absent.length;
  if (notPresentCount === 0) {
    return ["*DAFTAR TIDAK MASUK (0 orang):*", "Nihil (Semua mahasiswa hadir)"];
  }

  return [
    `*DAFTAR TIDAK MASUK (${notPresentCount} orang):*`,
    ...buildCategoryLines(`*Izin (${permit.length}):*`, permit, formatFn),
    ...buildCategoryLines(`*Sakit (${sick.length}):*`, sick, formatFn),
    ...buildCategoryLines(`*Tanpa Keterangan / Alpa (${absent.length}):*`, absent, formatFn),
  ];
}

function buildPresentSection(present, formatFn) {
  if (present.length === 0) {
    return ["*DAFTAR HADIR (0 orang):*", "Tidak ada mahasiswa hadir"];
  }
  return [
    `*DAFTAR HADIR (${present.length} orang):*`,
    ...present.map((s, idx) => `${idx + 1}. ${formatFn(s)}`),
  ];
}

function buildAllSection(present, permit, sick, absent, total, formatFn) {
  const presentLines =
    present.length === 0
      ? ["- Nihil"]
      : present.map((s, idx) => `${idx + 1}. ${formatFn(s)}`);

  return [
    `*REKAP LENGKAP PRESENSI (${total} Mahasiswa):*`,
    "",
    `*1. HADIR (${present.length}):*`,
    ...presentLines,
    ...buildCategoryLines(`*2. IZIN (${permit.length}):*`, permit, formatFn),
    ...buildCategoryLines(`*3. SAKIT (${sick.length}):*`, sick, formatFn),
    ...buildCategoryLines(`*4. ALPA / TANPA KETERANGAN (${absent.length}):*`, absent, formatFn),
  ];
}

function buildSummaryLines(total, present, permit, sick, absent) {
  return [
    "",
    "---",
    "*Ringkasan Kehadiran:*",
    `• Total Mahasiswa : ${total}`,
    `• Hadir            : ${present}`,
    `• Izin             : ${permit}`,
    `• Sakit            : ${sick}`,
    `• Alpa             : ${absent}`,
  ];
}

export function formatWhatsAppReport(opts) {
  const {
    course,
    date,
    meetingNo,
    students,
    records,
    filterMode,
    includeNIM = true,
    includeGuestBadge = true,
    includeSummary = true,
    customHeaderNote = "",
  } = opts;

  const header = buildHeaderLines({ course, date, meetingNo, customHeaderNote });
  const { present, permit, sick, absent } = groupStudentsByStatus(students, records);
  const formatFn = (s) => formatStudentItem(s, includeNIM, includeGuestBadge);

  let body = [];
  if (filterMode === "absent_only") {
    body = buildAbsentSection(permit, sick, absent, formatFn);
  } else if (filterMode === "present_only") {
    body = buildPresentSection(present, formatFn);
  } else {
    body = buildAllSection(present, permit, sick, absent, students.length, formatFn);
  }

  const summary = includeSummary
    ? buildSummaryLines(students.length, present.length, permit.length, sick.length, absent.length)
    : [];

  return [...header, ...body, ...summary].join("\n");
}
