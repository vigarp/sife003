import { ref, computed } from "vue";
import { useAdminAuth } from "./useAdminAuth";

const STORAGE_KEYS = {
  COURSES: "mhadir_courses",
  STUDENTS: "mhadir_students",
  SESSIONS: "mhadir_sessions",
  PENDING_SYNC: "mhadir_pending_sync_ids",
};

// Global reactive states
const courses = ref([]);
const students = ref([]);
const sessions = ref([]);
const isOnline = ref(typeof navigator !== "undefined" ? navigator.onLine : true);
const isSyncing = ref(false);
const syncError = ref("");
const lastSyncedAt = ref(null);

function getLocal(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save to localStorage (${key}):`, e);
  }
}

export function useAttendance() {
  const { token, isAuthenticated } = useAdminAuth();

  // Pending sync IDs set
  const pendingSyncIds = ref(new Set(getLocal(STORAGE_KEYS.PENDING_SYNC, [])));

  const pendingCount = computed(() => pendingSyncIds.value.size);

  function markSessionPending(sessionId) {
    pendingSyncIds.value.add(sessionId);
    setLocal(STORAGE_KEYS.PENDING_SYNC, Array.from(pendingSyncIds.value));
  }

  function unmarkSessionPending(sessionId) {
    pendingSyncIds.value.delete(sessionId);
    setLocal(STORAGE_KEYS.PENDING_SYNC, Array.from(pendingSyncIds.value));
  }

  function loadLocalData() {
    courses.value = getLocal(STORAGE_KEYS.COURSES, []);
    students.value = getLocal(STORAGE_KEYS.STUDENTS, []);
    sessions.value = getLocal(STORAGE_KEYS.SESSIONS, []);
  }

  function saveLocalCourses(data) {
    courses.value = data;
    setLocal(STORAGE_KEYS.COURSES, data);
  }

  function saveLocalStudents(data) {
    students.value = data;
    setLocal(STORAGE_KEYS.STUDENTS, data);
  }

  function saveLocalSessions(data) {
    sessions.value = data;
    setLocal(STORAGE_KEYS.SESSIONS, data);
  }

  async function fetchRemoteData() {
    try {
      const res = await fetch("/api/presensi");
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data?.courses?.length) {
          saveLocalCourses(json.data.courses);
        }
        if (json.data?.students?.length) {
          saveLocalStudents(json.data.students);
        }
        if (json.data.sessions) {
          // Merge sessions: keep local if local is pending
          const remoteSessions = json.data.sessions;
          const merged = [...sessions.value];

          remoteSessions.forEach((rem) => {
            const localIdx = merged.findIndex((l) => l.id === rem.id);
            if (localIdx === -1) {
              merged.push(rem);
            } else if (!pendingSyncIds.value.has(rem.id)) {
              // Only overwrite local if it's not pending push
              if ((rem.updatedAt || 0) >= (merged[localIdx].updatedAt || 0)) {
                merged[localIdx] = rem;
              }
            }
          });

          saveLocalSessions(merged);
        }
        lastSyncedAt.value = new Date();
      }
    } catch (err) {
      console.warn("Could not fetch remote presensi data (offline?):", err);
    }
  }

  async function syncPendingSessions() {
    if (!navigator.onLine) {
      isOnline.value = false;
      return;
    }
    if (pendingSyncIds.value.size === 0) return;
    if (!token.value) return;

    isSyncing.value = true;
    syncError.value = "";

    try {
      const sessionsToSync = sessions.value.filter((s) => pendingSyncIds.value.has(s.id));
      if (sessionsToSync.length === 0) {
        pendingSyncIds.value.clear();
        setLocal(STORAGE_KEYS.PENDING_SYNC, []);
        isSyncing.value = false;
        return;
      }

      const res = await fetch("/api/presensi/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify({ sessions: sessionsToSync }),
      });

      const json = await res.json();
      if (json.success && json.data?.sessions) {
        // Clear synced pending IDs
        sessionsToSync.forEach((s) => unmarkSessionPending(s.id));
        saveLocalSessions(json.data.sessions);
        lastSyncedAt.value = new Date();
      } else {
        syncError.value = json.message || "Gagal sinkronisasi ke server.";
      }
    } catch (err) {
      syncError.value = err.message || "Gagal menghubungi server.";
    } finally {
      isSyncing.value = false;
    }
  }

  function getOrCreateSession(courseId, date, meetingNo = null) {
    const sessionId = `${courseId}_${date}`;
    let sess = sessions.value.find((s) => s.id === sessionId);

    if (!sess) {
      sess = {
        id: sessionId,
        courseId,
        date,
        meetingNo: meetingNo || undefined,
        records: {},
        updatedAt: Date.now(),
      };
      sessions.value = [sess, ...sessions.value];
      saveLocalSessions(sessions.value);
      markSessionPending(sessionId);
      if (isOnline.value && isAuthenticated.value) {
        syncPendingSessions();
      }
    }

    return sess;
  }

  function updateSessionRecord(sessionId, studentId, status) {
    const idx = sessions.value.findIndex((s) => s.id === sessionId);
    if (idx === -1) return;

    const updated = { ...sessions.value[idx] };
    updated.records = {
      ...updated.records,
      [studentId]: status,
    };
    updated.updatedAt = Date.now();

    sessions.value[idx] = updated;
    saveLocalSessions(sessions.value);
    markSessionPending(sessionId);

    // Auto-sync debounce
    if (isOnline.value && isAuthenticated.value) {
      syncPendingSessions();
    }
  }

  function markAllPresentForSession(sessionId, activeStudentList) {
    const idx = sessions.value.findIndex((s) => s.id === sessionId);
    if (idx === -1) return;

    const updated = { ...sessions.value[idx] };
    const newRecords = { ...updated.records };
    activeStudentList.forEach((st) => {
      newRecords[st.id] = "present";
    });

    updated.records = newRecords;
    updated.updatedAt = Date.now();

    sessions.value[idx] = updated;
    saveLocalSessions(sessions.value);
    markSessionPending(sessionId);

    if (isOnline.value && isAuthenticated.value) {
      syncPendingSessions();
    }
  }

  function deleteSession(sessionId) {
    sessions.value = sessions.value.filter((s) => s.id !== sessionId);
    saveLocalSessions(sessions.value);
    unmarkSessionPending(sessionId);
  }

  // Filter students relevant for a specific course (regular + guest taking this course)
  function getStudentsForCourse(courseId) {
    return students.value.filter((st) => {
      if (!st.isGuest) return true; // Regular student takes all courses
      return Array.isArray(st.courseIds) && st.courseIds.includes(courseId);
    });
  }

  // Lifecycle listeners
  function initListeners() {
    loadLocalData();

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        isOnline.value = true;
        if (isAuthenticated.value) {
          syncPendingSessions();
        }
      });
      window.addEventListener("offline", () => {
        isOnline.value = false;
      });
    }

    fetchRemoteData();
  }

  return {
    courses,
    students,
    sessions,
    isOnline,
    isSyncing,
    syncError,
    lastSyncedAt,
    pendingCount,
    loadLocalData,
    fetchRemoteData,
    syncPendingSessions,
    getOrCreateSession,
    updateSessionRecord,
    markAllPresentForSession,
    deleteSession,
    getStudentsForCourse,
    initListeners,
  };
}
