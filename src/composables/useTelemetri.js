import { ref, computed } from "vue";

export const STORAGE_TOKEN_KEY = "telemetri_mentari_jwt";
export const STORAGE_NIM_KEY = "telemetri_user_nim";
export const STORAGE_NAME_KEY = "telemetri_user_name";

// Desired order based on Shift (E-1 followed by E-2)
export const COURSE_ORDER_PREFERENCE = [
  // E-1
  "22SIF0103", // Pemrograman Berorientasi Obyek (Java I)
  "22SIF0132", // Rekayasa Web
  "22SIF0123", // Design Grafis
  "22SIF0112", // Analisa Proses Bisnis
  // E-2
  "22SIF0142", // Arsitektur dan Infrastruktur IT (AIIT)
  "22SIF0152", // Pengantar Big Data
  "22ILK0042", // Aljabar Linier dan Matriks
  "22SIF0162", // Komunikasi Data
  "22SIF0092", // Pengantar Ekonomi, Manajemen & Bisnis (PEMB)
];

export function getCourseSortRank(course) {
  const code = course.id_mata_kuliah || course.kode || "";
  const fullCode = course.kode_course || "";
  const name = (course.coursename || course.nama_mata_kuliah || "").toUpperCase();

  for (let i = 0; i < COURSE_ORDER_PREFERENCE.length; i++) {
    const targetCode = COURSE_ORDER_PREFERENCE[i];
    if (code === targetCode || fullCode.includes(targetCode)) {
      return i;
    }
  }

  // Fallback keyword matching
  if (name.includes("JAVA")) return 0;
  if (name.includes("REKAYASA WEB")) return 1;
  if (name.includes("DESIGN GRAFIS") || name.includes("DESAIN GRAFIS")) return 2;
  if (name.includes("ANALISA PROSES")) return 3;
  if (name.includes("ARSITEKTUR")) return 4;
  if (name.includes("BIG DATA")) return 5;
  if (name.includes("ALJABAR")) return 6;
  if (name.includes("EKONOMI")) return 7;
  if (name.includes("KOMUNIKASI DATA")) return 8;

  return 999;
}

export function sortCourses(courseList) {
  if (!Array.isArray(courseList)) return [];
  return [...courseList].sort((a, b) => getCourseSortRank(a) - getCourseSortRank(b));
}

/**
 * Robust parser for Mentari session data
 * Supports:
 * 1. JSON array from localStorage.getItem("access"): [{"role":"MAHASISWA","token":"..."}]
 * 2. JSON object: {"role":"MAHASISWA","token":"..."} or {"token":"..."}
 * 3. Raw JWT token (with or without 'Bearer ' prefix)
 */
export function parseMentariAuth(rawInput) {
  if (!rawInput || typeof rawInput !== "string") {
    return { token: "", nim: "", fullname: "", role: "", exp: null, valid: false };
  }

  let text = rawInput.trim();

  // Strip 'Bearer ' if present
  if (text.startsWith("Bearer ")) {
    text = text.slice(7).trim();
  }

  // Handle JSON array or object from localStorage "access"
  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        const mhs =
          parsed.find((item) => item?.role === "MAHASISWA" && item?.token) ||
          parsed.find((item) => item?.token);
        if (mhs?.token) {
          text = String(mhs.token).trim();
        }
      } else if (parsed && typeof parsed === "object") {
        if (parsed.token) {
          text = String(parsed.token).trim();
        } else if (parsed.access_token) {
          text = String(parsed.access_token).trim();
        }
      }
    } catch {
      // not valid JSON, proceed as raw text
    }
  }

  // Strip wrapping double or single quotes
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }

  let nim = "";
  let fullname = "";
  let role = "";
  let exp = null;
  let valid = false;

  try {
    const parts = text.split(".");
    if (parts.length === 3) {
      let base64Url = parts[1];
      while (base64Url.length % 4) {
        base64Url += "=";
      }
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = atob(base64);
      let payload;
      try {
        const jsonPayload = decodeURIComponent(
          decoded
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        payload = JSON.parse(jsonPayload);
      } catch {
        payload = JSON.parse(decoded);
      }

      if (payload.username) nim = String(payload.username).trim();
      if (payload.fullname) fullname = String(payload.fullname).trim();
      if (payload.role) role = String(payload.role).trim();
      if (payload.exp) exp = payload.exp;
      valid = Boolean(nim || fullname || payload.id);
    }
  } catch {
    valid = false;
  }

  return {
    token: text,
    nim,
    fullname,
    role,
    exp,
    valid,
  };
}

export function extractNimFromJwt(jwtToken) {
  return parseMentariAuth(jwtToken).nim;
}

// State is kept at module level for reactivity across components
const token = ref(
  typeof localStorage !== "undefined"
    ? localStorage.getItem(STORAGE_TOKEN_KEY) || ""
    : ""
);
const userNim = ref(
  typeof localStorage !== "undefined"
    ? localStorage.getItem(STORAGE_NIM_KEY) || ""
    : ""
);
const userName = ref(
  typeof localStorage !== "undefined"
    ? localStorage.getItem(STORAGE_NAME_KEY) || ""
    : ""
);

const courses = ref([]);
const selectedCourseKode = ref("");
const selectedPertemuanNum = ref(8); // Default Pertemuan 8
const courseDetail = ref(null);
const forumTopics = ref([]);
const topicReplies = ref([]); // Flattened array of all replies across all topics in current forum

const loading = ref(false);
const scanning = ref(false);
const error = ref(null);
const statusMessage = ref("");

/**
 * Standardized API client for calling Mentari proxy
 * Tries the dedicated residential gateway (https://telescope.vigarp.web.id/api) first,
 * with automatic graceful fallback to the local / serverless proxy (/api/mentari).
 */
async function apiFetch(path, params = {}) {
  if (!token.value) {
    throw new Error("Token Mentari belum dimasukkan. Silakan atur token terlebih dahulu.");
  }

  const cleanPath = String(path).replace(/^\/+/, "");
  const query = new URLSearchParams(params).toString();
  const querySuffix = query ? `?${query}` : "";

  // 1. Try dedicated residential gateway if in browser
  const isBrowser = typeof window !== "undefined";
  if (isBrowser) {
    try {
      const res = await fetch(`https://telescope.vigarp.web.id/api/${cleanPath}${querySuffix}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token.value.trim()}`,
          Accept: "application/json",
        },
      });

      if (res.status === 401) {
        throw new Error("Sesi token Mentari telah kadaluarsa (401). Silakan perbarui token Anda.");
      }

      if (res.ok) {
        return await res.json();
      }
    } catch (gatewayErr) {
      if (gatewayErr.message.includes("401")) throw gatewayErr;
    }
  }

  // 2. Fallback to /api/mentari
  const fallbackQuery = new URLSearchParams({ path: cleanPath, ...params });
  const res = await fetch(`/api/mentari?${fallbackQuery.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token.value.trim()}`,
      Accept: "application/json",
    },
  });

  if (res.status === 401) {
    throw new Error("Sesi token Mentari telah kadaluarsa (401). Silakan perbarui token Anda.");
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = errData.message || `Gagal memuat data dari Mentari (${res.status}).`;
    throw new Error(msg);
  }

  return await res.json();
}

export function useTelemetri() {
  const hasToken = computed(() => Boolean(token.value && token.value.trim().length > 10));

  function saveToken(input) {
    const parsed = parseMentariAuth(input);
    const clean = parsed.token || (typeof input === "string" ? input.trim() : "");
    token.value = clean;
    if (typeof localStorage !== "undefined") {
      if (clean) {
        localStorage.setItem(STORAGE_TOKEN_KEY, clean);
      } else {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
      }
    }

    // Auto extract NIM and Name from parsed session
    if (parsed.nim) {
      saveUserNim(parsed.nim);
    }
    if (parsed.fullname) {
      saveUserName(parsed.fullname);
    }
  }

  function saveUserName(newName) {
    const clean = (newName || "").trim();
    userName.value = clean;
    if (typeof localStorage !== "undefined") {
      if (clean) {
        localStorage.setItem(STORAGE_NAME_KEY, clean);
      } else {
        localStorage.removeItem(STORAGE_NAME_KEY);
      }
    }
  }

  function clearToken() {
    saveToken("");
    saveUserName("");
    courses.value = [];
    selectedCourseKode.value = "";
    courseDetail.value = null;
    forumTopics.value = [];
    topicReplies.value = [];
  }

  function saveUserNim(newNim) {
    const clean = (newNim || "").trim();
    userNim.value = clean;
    if (typeof localStorage !== "undefined") {
      if (clean) {
        localStorage.setItem(STORAGE_NIM_KEY, clean);
      } else {
        localStorage.removeItem(STORAGE_NIM_KEY);
      }
    }
  }

  // Selected course object
  const selectedCourse = computed(() => {
    return courses.value.find((c) => c.kode_course === selectedCourseKode.value) || null;
  });

  // Current selected section (e.g. PERTEMUAN_8)
  const currentSection = computed(() => {
    if (!courseDetail.value?.data) return null;
    const targetCode = `PERTEMUAN_${selectedPertemuanNum.value}`;
    return courseDetail.value.data.find((s) => s.kode_section === targetCode) || null;
  });

  // Current forum sub_section in the current section
  const forumSubsection = computed(() => {
    if (!currentSection.value?.sub_section) return null;
    return (
      currentSection.value.sub_section.find(
        (sub) => sub.kode_template === "FORUM_DISKUSI"
      ) || null
    );
  });

  // Check if forum is open (has valid ID and no warning alert)
  const isForumOpen = computed(() => {
    const f = forumSubsection.value;
    return Boolean(f?.id && !f?.warningAlert);
  });

  const forumWarning = computed(() => {
    return forumSubsection.value?.warningAlert || null;
  });

  // 1. Personal Insight (Status Mahasiswa Pribadi)
  const personalStats = computed(() => {
    const nimTarget = userNim.value.trim();
    const myReplies = topicReplies.value.filter((r) => r.nim === nimTarget);
    const myReplyIds = new Set(myReplies.map((r) => r.id));

    // Calculate breakdown per topic
    const topicBreakdown = {};
    myReplies.forEach((r) => {
      const topicTitle = r._topicJudul || "Diskusi";
      topicBreakdown[topicTitle] = (topicBreakdown[topicTitle] || 0) + 1;
    });

    // Detect if lecturer replied to student's answer (reply_level: 2, id_parent matches student's reply ID)
    const lecturerReplies = topicReplies.value.filter(
      (r) => myReplyIds.has(r.id_parent) && (r.id_dosen !== null || r.dosen)
    );

    return {
      nim: nimTarget,
      myReplies,
      myReplyCount: myReplies.length,
      isEligible: myReplies.length >= 2,
      topicBreakdown,
      hasLecturerFeedback: lecturerReplies.length > 0,
      lecturerReplies: lecturerReplies.map((lr) => ({
        id: lr.id,
        konten: lr.konten,
        dosen: lr.dosen?.nama_gelar || lr.dosen?.nama_dosen || "Dosen Pengampu",
        createdAt: lr.createdAt,
      })),
    };
  });

  // 2. Class-wide Participation Analytics (Target >= 2x reply)
  const classStats = computed(() => {
    const rawPeserta = courseDetail.value?.peserta || [];
    // Build reply count per NIM
    const studentReplyMap = {}; // { [nim]: { total: number, breakdown: { [topic]: count } } }

    topicReplies.value.forEach((r) => {
      if (!r.nim) return; // Skip lecturer replies
      if (!studentReplyMap[r.nim]) {
        studentReplyMap[r.nim] = { total: 0, breakdown: {} };
      }
      studentReplyMap[r.nim].total += 1;
      const topicName = r._topicJudul || "Diskusi";
      studentReplyMap[r.nim].breakdown[topicName] =
        (studentReplyMap[r.nim].breakdown[topicName] || 0) + 1;
    });

    // Aggregate status for all students in class
    let eligibleCount = 0;
    let partialCount = 0;
    let noneCount = 0;

    const students = rawPeserta.map((p, idx) => {
      const stat = studentReplyMap[p.nim] || { total: 0, breakdown: {} };
      const total = stat.total;
      let status;

      if (total >= 2) {
        status = "eligible";
        eligibleCount++;
      } else if (total === 1) {
        status = "partial";
        partialCount++;
      } else {
        status = "none";
        noneCount++;
      }

      return {
        index: idx + 1,
        nim: p.nim,
        nama: p.nama_mahasiswa,
        email: p.alamat_email,
        totalReplies: total,
        breakdown: stat.breakdown,
        status, // 'eligible' | 'partial' | 'none'
        isEligible: total >= 2,
      };
    });

    const totalStudents = students.length;
    const percentage =
      totalStudents > 0
        ? ((eligibleCount / totalStudents) * 100).toFixed(1)
        : "0.0";

    return {
      totalStudents,
      eligibleCount,
      partialCount,
      noneCount,
      percentage,
      students,
    };
  });

  /**
   * Load courses list of logged-in user
   */
  async function loadCourses() {
    if (!hasToken.value) return;
    loading.value = true;
    error.value = null;
    try {
      const res = await apiFetch("user-course", { page: 1, limit: 100 });
      if (res.data && Array.isArray(res.data)) {
        courses.value = sortCourses(res.data);
        if (!selectedCourseKode.value && res.data.length > 0) {
          selectedCourseKode.value = courses.value[0].kode_course;
        }
      }
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Scan forum for selected course and pertemuan
   */
  async function scanForum(kodeCourse = selectedCourseKode.value, pertemuanNum = selectedPertemuanNum.value) {
    if (!hasToken.value) {
      error.value = "Silakan masukkan token Mentari terlebih dahulu.";
      return;
    }

    let targetCourse = kodeCourse || selectedCourseKode.value;
    if (!targetCourse) {
      if (courses.value.length > 0) {
        targetCourse = courses.value[0].kode_course;
      } else {
        return;
      }
    }

    selectedCourseKode.value = targetCourse;
    selectedPertemuanNum.value = pertemuanNum;
    scanning.value = true;
    error.value = null;
    statusMessage.value = "Mengambil modul perkuliahan...";

    try {
      // 1. Fetch Course Detail
      const detailRes = await apiFetch(`user-course/${targetCourse}`);
      courseDetail.value = detailRes;

      // 2. Identify target section & forum sub_section
      const targetSectionCode = `PERTEMUAN_${pertemuanNum}`;
      const sec = detailRes.data?.find((s) => s.kode_section === targetSectionCode);
      const forum = sec?.sub_section?.find((sub) => sub.kode_template === "FORUM_DISKUSI");

      if (!forum?.id || forum.warningAlert) {
        // Forum is closed or not available
        forumTopics.value = [];
        topicReplies.value = [];
        statusMessage.value = forum?.warningAlert || "Forum diskusi belum dibuka oleh dosen.";
        return;
      }

      // 3. Fetch Forum Topics
      statusMessage.value = "Memeriksa topik forum...";
      const topicsRes = await apiFetch(`forum/topic/${forum.id}`);
      const topics = topicsRes.topics || [];
      forumTopics.value = topics;

      if (topics.length === 0) {
        topicReplies.value = [];
        statusMessage.value = "Forum telah dibuat namun belum ada topik dari dosen.";
        return;
      }

      // 4. Fetch Replies for all topics in parallel
      statusMessage.value = `Mengumpulkan balasan dari ${topics.length} topik...`;
      const allFetchedReplies = [];

      await Promise.all(
        topics.map(async (topic) => {
          try {
            const replyRes = await apiFetch(`forum/reply/${topic.id}`);
            const replies = replyRes.data || [];
            replies.forEach((r) => {
              r._topicJudul = topic.judul;
              r._topicId = topic.id;
              allFetchedReplies.push(r);
            });
          } catch (err) {
            console.error(`Gagal memuat balasan topik ${topic.judul}:`, err);
          }
        })
      );

      topicReplies.value = allFetchedReplies;
      statusMessage.value = "Pemindaian Telemetri selesai!";
    } catch (err) {
      error.value = err.message;
    } finally {
      scanning.value = false;
    }
  }

  /**
   * Format message for WhatsApp class group reminders
   */
  function formatWhatsAppSummary() {
    const c = selectedCourse.value;
    const courseName = c?.coursename || c?.nama_mata_kuliah || "Mata Kuliah";
    const pertemuan = `Pertemuan ${selectedPertemuanNum.value}`;
    const stats = classStats.value;

    const partialList = stats.students
      .filter((s) => s.status === "partial")
      .map((s, i) => `${i + 1}. ${s.nama} (baru ${s.totalReplies}x reply)`);

    const noneList = stats.students
      .filter((s) => s.status === "none")
      .map((s, i) => `${i + 1}. ${s.nama}`);

    const lines = [
      `🔭 *TELEMETRI — TELESKOP MENTARI*`,
      `*Kelas 03SIFE003 • Universitas Pamulang*`,
      `---------------------------------------`,
      `📚 *Matkul:* ${courseName}`,
      `📅 *Sesi:* ${pertemuan}`,
      `📊 *Progres Kelas:* ${stats.eligibleCount}/${stats.totalStudents} Mahasiswa (${stats.percentage}%) Memenuhi Syarat (>= 2x Reply)`,
      ``,
    ];

    if (partialList.length > 0) {
      lines.push(`⚠️ *Kurang 1x Reply Lagi (${partialList.length} orang):*`, ...partialList, "");
    }

    if (noneList.length > 0) {
      lines.push(`❌ *Belum Reply Sama Sekali (${noneList.length} orang):*`, ...noneList, "");
    }

    if (partialList.length === 0 && noneList.length === 0) {
      lines.push(`🎉 *Luar biasa! Seluruh mahasiswa kelas telah menyelesaikan kewajiban fordis!*`, "");
    }

    lines.push(`_Catatan: Syarat presensi otomatis dan pembukaan post-test/kuesioner adalah minimal 2x reply pada fordis pertemuan ini._`);

    return lines.join("\n");
  }

  return {
    token,
    userNim,
    userName,
    hasToken,
    saveToken,
    clearToken,
    saveUserNim,
    saveUserName,
    parseMentariAuth,
    courses,
    selectedCourseKode,
    selectedPertemuanNum,
    selectedCourse,
    courseDetail,
    currentSection,
    forumSubsection,
    isForumOpen,
    forumWarning,
    forumTopics,
    topicReplies,
    personalStats,
    classStats,
    loading,
    scanning,
    error,
    statusMessage,
    loadCourses,
    scanForum,
    formatWhatsAppSummary,
    sortCourses,
  };
}
