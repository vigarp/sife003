<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAdminAuth } from "@/composables/useAdminAuth";
import { useAttendance } from "@/composables/useAttendance";
import { formatWhatsAppReport, formatIndonesianDate } from "@/utils/whatsappFormatter";
import { normalizeWhatsAppNumber, getWhatsAppLink } from "@/utils/phoneUtils";

const router = useRouter();
const { user, isAuthenticated } = useAdminAuth();
const {
  courses,
  students,
  sessions,
  isOnline,
  isSyncing,
  syncError,
  lastSyncedAt,
  pendingCount,
  initListeners,
  syncPendingSessions,
  getOrCreateSession,
  updateSessionRecord,
  markAllPresentForSession,
  getStudentsForCourse,
} = useAttendance();

// Today in YYYY-MM-DD format
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const selectedCourseId = ref("");
const selectedDate = ref(getTodayString());
const meetingNo = ref(4);
const searchQuery = ref("");
const statusFilter = ref("all"); // 'all' | 'present' | 'permit' | 'sick' | 'absent'

// Toast state
const toast = ref({ show: false, message: "", type: "success" });
function showToast(msg, type = "success") {
  toast.value = { show: true, message: msg, type };
  setTimeout(() => {
    toast.value.show = false;
  }, 3000);
}

// WhatsApp Modal state
const isWaModalOpen = ref(false);
const waFilterMode = ref("absent_only");
const waIncludeNIM = ref(true);
const waCustomNote = ref("");

// Current session computed
const currentSession = computed(() => {
  if (!selectedCourseId.value || !selectedDate.value) return null;
  return getOrCreateSession(selectedCourseId.value, selectedDate.value, meetingNo.value);
});

// Selected course details
const currentCourse = computed(() => {
  return courses.value.find((c) => c.id === selectedCourseId.value) || null;
});

// Filtered student list for the selected course
const courseStudents = computed(() => {
  if (!selectedCourseId.value) return [];
  return getStudentsForCourse(selectedCourseId.value);
});

// Stats summary for current session
const sessionStats = computed(() => {
  const records = currentSession.value?.records || {};
  const activeStudents = courseStudents.value;

  let present = 0;
  let permit = 0;
  let sick = 0;
  let absent = 0;

  activeStudents.forEach((st) => {
    const s = records[st.id] || "present";
    if (s === "present") present++;
    else if (s === "permit") permit++;
    else if (s === "sick") sick++;
    else if (s === "absent") absent++;
  });

  return {
    total: activeStudents.length,
    present,
    permit,
    sick,
    absent,
  };
});

// Visible students according to search and status filter
const visibleStudents = computed(() => {
  const records = currentSession.value?.records || {};
  const q = searchQuery.value.trim().toLowerCase();

  return courseStudents.value.filter((st) => {
    // Search filter
    if (q) {
      const matchName = st.name.toLowerCase().includes(q);
      const matchNim = st.nim.toLowerCase().includes(q);
      if (!matchName && !matchNim) return false;
    }

    // Status filter
    if (statusFilter.value !== "all") {
      const s = records[st.id] || "present";
      if (s !== statusFilter.value) return false;
    }

    return true;
  });
});

function handleSetStatus(studentId, status) {
  if (!currentSession.value) return;
  updateSessionRecord(currentSession.value.id, studentId, status);
}

function handleMarkAllPresent() {
  if (!currentSession.value) return;
  markAllPresentForSession(currentSession.value.id, courseStudents.value);
  showToast("Semua mahasiswa berhasil ditandai Hadir.");
}

async function handleManualSync() {
  if (!isOnline.value) {
    showToast("Anda sedang offline. Data tersimpan aman di perangkat.", "warning");
    return;
  }
  await syncPendingSessions();
  if (syncError.value) {
    showToast(syncError.value, "error");
  } else {
    showToast("Data presensi berhasil disinkronkan ke Turso Cloud!");
  }
}

// WhatsApp report text computed
const generatedWaText = computed(() => {
  if (!currentSession.value || !currentCourse.value) return "";
  return formatWhatsAppReport({
    course: currentCourse.value,
    date: selectedDate.value,
    meetingNo: meetingNo.value,
    students: courseStudents.value,
    records: currentSession.value.records || {},
    filterMode: waFilterMode.value,
    includeNIM: waIncludeNIM.value,
    includeGuestBadge: true,
    includeSummary: true,
    customHeaderNote: waCustomNote.value,
  });
});

async function copyWaText() {
  try {
    await navigator.clipboard.writeText(generatedWaText.value);
    showToast("Format WhatsApp berhasil disalin ke clipboard!");
  } catch {
    showToast("Gagal menyalin teks.", "error");
  }
}

function openWhatsAppUrl() {
  const encoded = encodeURIComponent(generatedWaText.value);
  window.open(`https://wa.me/?text=${encoded}`, "_blank");
}

onMounted(async () => {
  initListeners();
  if (!selectedCourseId.value && courses.value.length > 0) {
    selectedCourseId.value = courses.value[0].id;
  }
});

// Auto-select first course when courses loaded
watch(
  courses,
  (newCourses) => {
    if (!selectedCourseId.value && newCourses.length > 0) {
      selectedCourseId.value = newCourses[0].id;
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="w-full space-y-4 pb-16">
    <!-- Toast Alert -->
    <div
      v-if="toast.show"
      class="fixed top-4 right-4 z-50 mk-card p-3 shadow-lg text-xs font-medium flex items-center gap-3"
      :class="[
        toast.type === 'error'
          ? '!border-red-500/50 text-red-700 dark:text-red-300'
          : toast.type === 'warning'
          ? '!border-amber-500/50 text-amber-700 dark:text-amber-300'
          : '!border-emerald-500/50 text-emerald-700 dark:text-emerald-300',
      ]"
    >
      <span>{{ toast.message }}</span>
      <button @click="toast.show = false" class="cursor-pointer font-bold">✕</button>
    </div>

    <!-- Header & Navigation -->
    <header class="mk-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4">
      <div class="flex items-center gap-2.5">
        <router-link
          to="/pengurus"
          class="mk-btn !p-2"
          title="Kembali ke Zona Pengurus"
        >
          <span class="material-symbols-outlined text-[18px]">arrow_back</span>
        </router-link>

        <div>
          <h1 class="text-base sm:text-lg font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
            <span>m-hadir</span>
            <span class="mk-badge bg-[var(--hover)] text-[var(--accent)] border border-[var(--border)]">
              Offline-First
            </span>
          </h1>
          <p class="text-xs text-[var(--muted)]">
            Presensi Kelas Cepat • Generator Format WhatsApp Dosen
          </p>
        </div>
      </div>

      <!-- Sync Status & Manual Sync Button -->
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Online / Offline Badge -->
        <span
          class="mk-badge"
          :class="[
            !isOnline
              ? 'mk-badge-warn'
              : pendingCount > 0
              ? 'bg-blue-500/10 text-[var(--accent)] border border-blue-500/25'
              : 'mk-badge-ok',
          ]"
        >
          <span
            class="w-1.5 h-1.5 rounded-full"
            :class="[
              !isOnline
                ? 'bg-amber-500'
                : pendingCount > 0
                ? 'bg-blue-500'
                : 'bg-emerald-500',
            ]"
          ></span>
          <span>
            {{
              !isOnline
                ? `Offline (${pendingCount} tertunda)`
                : pendingCount > 0
                ? `${pendingCount} sesi belum sinkron`
                : "Tersinkron (Turso Cloud)"
            }}
          </span>
        </span>

        <!-- Manual Sync Button -->
        <button
          @click="handleManualSync"
          :disabled="isSyncing"
          class="mk-btn disabled:opacity-50"
        >
          <span
            class="material-symbols-outlined text-[15px]"
            :class="{ 'animate-spin': isSyncing }"
          >sync</span>
          <span>{{ isSyncing ? "Menyinkronkan..." : "Sinkronkan" }}</span>
        </button>
      </div>
    </header>

    <!-- Session Picker Form -->
    <div class="mk-card p-3.5 sm:p-4 space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <!-- Mata Kuliah -->
        <div class="sm:col-span-1">
          <label for="select-course" class="block font-semibold text-[var(--text)] mb-1">
            Mata Kuliah
          </label>
          <select
            id="select-course"
            v-model="selectedCourseId"
            class="w-full p-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] font-medium focus:border-[var(--accent)] focus:outline-none"
          >
            <option v-for="c in courses" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>

        <!-- Pertemuan Ke- -->
        <div>
          <label for="meeting-number" class="block font-semibold text-[var(--text)] mb-1">
            Pertemuan Ke-
          </label>
          <input
            id="meeting-number"
            v-model.number="meetingNo"
            type="number"
            min="1"
            max="21"
            class="w-full p-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] font-medium tabular-nums focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        <!-- Tanggal -->
        <div>
          <label for="meeting-date" class="block font-semibold text-[var(--text)] mb-1">
            Tanggal Pertemuan
          </label>
          <input
            id="meeting-date"
            v-model="selectedDate"
            type="date"
            class="w-full p-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] font-medium focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
      </div>

      <!-- Course info pill if selected -->
      <div v-if="currentCourse" class="pt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] text-xs text-[var(--muted)]">
        <div>
          <strong class="text-[var(--text)]">{{ currentCourse.name }}</strong>
          <span v-if="currentCourse.lecturer"> • Dosen: {{ currentCourse.lecturer }}</span>
          <span v-if="currentCourse.time"> • {{ currentCourse.time }}</span>
        </div>
        <div class="text-[11px] font-mono tabular-nums">
          {{ formatIndonesianDate(selectedDate) }} (Pertemuan {{ meetingNo }})
        </div>
      </div>
    </div>

    <!-- Quick Action Bar & Summary Counters -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <!-- Counters -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold tabular-nums">
        <span class="mk-badge bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]">
          Total: {{ sessionStats.total }}
        </span>
        <span class="mk-badge mk-badge-ok">
          H: {{ sessionStats.present }}
        </span>
        <span class="mk-badge mk-badge-warn">
          I: {{ sessionStats.permit }}
        </span>
        <span class="mk-badge bg-blue-500/10 text-[var(--accent)] border border-blue-500/25">
          S: {{ sessionStats.sick }}
        </span>
        <span class="mk-badge mk-badge-down">
          A: {{ sessionStats.absent }}
        </span>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <button
          @click="handleMarkAllPresent"
          class="px-3.5 py-2 rounded-[6px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span class="material-symbols-outlined text-[15px]">check</span>
          <span>Semua Hadir</span>
        </button>

        <button
          @click="isWaModalOpen = true"
          class="px-3.5 py-2 rounded-[6px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span class="material-symbols-outlined text-[15px]">chat</span>
          <span>Laporan WA</span>
        </button>
      </div>
    </div>

    <!-- Student Search & Filter Tabs -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <div class="relative flex-1 max-w-md">
        <label for="search-student-input" class="sr-only">Cari nama atau NIM</label>
        <input
          id="search-student-input"
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama atau NIM..."
          class="w-full pl-8 pr-3 py-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
        />
        <span class="material-symbols-outlined text-[16px] text-[var(--muted)] absolute left-2.5 top-2">search</span>
      </div>

      <div class="flex items-center gap-1.5 text-xs overflow-x-auto">
        <button
          v-for="f in [
            { key: 'all', label: 'Semua' },
            { key: 'present', label: 'Hadir' },
            { key: 'permit', label: 'Izin' },
            { key: 'sick', label: 'Sakit' },
            { key: 'absent', label: 'Alpa' },
          ]"
          :key="f.key"
          @click="statusFilter = f.key"
          :class="[
            'mk-subtab whitespace-nowrap',
            { 'mk-subtab-active': statusFilter === f.key },
          ]"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Student List Cards -->
    <div class="space-y-2">
      <div v-if="visibleStudents.length === 0" class="mk-card p-8 text-center text-xs text-[var(--muted)]">
        Tidak ada mahasiswa ditemukan.
      </div>

      <div
        v-for="st in visibleStudents"
        :key="st.id"
        class="mk-card p-3 flex items-center justify-between gap-3 hover:border-[var(--accent)] transition-colors"
      >
        <!-- Student Info -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="text-xs font-semibold text-[var(--text)] truncate">
              {{ st.name }}
            </h3>
            <span
              v-if="st.isGuest"
              class="mk-badge bg-blue-500/10 text-[var(--accent)] border border-blue-500/25 !text-[10px]"
            >
              Revisi
            </span>
          </div>
          <div class="flex items-center gap-2 mt-0.5 tabular-nums">
            <span class="text-[11px] text-[var(--muted)] font-mono">
              {{ st.nim }}
            </span>
            <a
              v-if="st.phone"
              :href="getWhatsAppLink(st.phone)"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline"
              title="Chat WhatsApp"
            >
              <span>wa.me/+{{ normalizeWhatsAppNumber(st.phone) }}</span>
            </a>
          </div>
        </div>

        <!-- 4-Button Attendance Toggle: H, I, S, A -->
        <div class="flex items-center gap-1 shrink-0">
          <!-- H (Hadir) -->
          <button
            @click="handleSetStatus(st.id, 'present')"
            :class="[
              'w-8 h-8 rounded-[6px] font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center border',
              (currentSession?.records?.[st.id] || 'present') === 'present'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-[var(--bg)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--hover)]',
            ]"
            title="Hadir"
          >
            H
          </button>

          <!-- I (Izin) -->
          <button
            @click="handleSetStatus(st.id, 'permit')"
            :class="[
              'w-8 h-8 rounded-[6px] font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center border',
              currentSession?.records?.[st.id] === 'permit'
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-[var(--bg)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--hover)]',
            ]"
            title="Izin"
          >
            I
          </button>

          <!-- S (Sakit) -->
          <button
            @click="handleSetStatus(st.id, 'sick')"
            :class="[
              'w-8 h-8 rounded-[6px] font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center border',
              currentSession?.records?.[st.id] === 'sick'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-[var(--bg)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--hover)]',
            ]"
            title="Sakit"
          >
            S
          </button>

          <!-- A (Alpa) -->
          <button
            @click="handleSetStatus(st.id, 'absent')"
            :class="[
              'w-8 h-8 rounded-[6px] font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center border',
              currentSession?.records?.[st.id] === 'absent'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-[var(--bg)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--hover)]',
            ]"
            title="Alpa / Tanpa Keterangan"
          >
            A
          </button>
        </div>
      </div>
    </div>

    <!-- WhatsApp Generator Modal -->
    <div
      v-if="isWaModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="mk-card max-w-lg w-full p-4 sm:p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-2.5 border-b border-[var(--border)]">
          <h2 class="text-sm font-semibold text-[var(--text)]">
            Generator Format WhatsApp
          </h2>
          <button
            @click="isWaModalOpen = false"
            class="mk-btn !p-1"
          >
            ✕
          </button>
        </div>

        <!-- Mode Selection -->
        <div class="space-y-3 text-xs">
          <p class="block font-semibold text-[var(--text)]">
            Format Laporan:
          </p>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="m in [
                { key: 'absent_only', label: 'Hanya Tidak Masuk' },
                { key: 'present_only', label: 'Hanya Hadir' },
                { key: 'all', label: 'Rekap Lengkap' },
              ]"
              :key="m.key"
              @click="waFilterMode = m.key"
              :class="[
                'mk-subtab !py-2 text-center',
                { 'mk-subtab-active': waFilterMode === m.key },
              ]"
            >
              {{ m.label }}
            </button>
          </div>

          <div class="flex items-center gap-2 pt-1">
            <input
              id="include-nim-check"
              v-model="waIncludeNIM"
              type="checkbox"
              class="rounded border-[var(--border)] text-blue-600"
            />
            <label for="include-nim-check" class="text-[var(--text)] font-medium">
              Sertakan NIM Mahasiswa
            </label>
          </div>

          <div>
            <label for="wa-custom-note" class="block font-semibold text-[var(--text)] mb-1">
              Catatan Tambahan (Opsional):
            </label>
            <input
              id="wa-custom-note"
              v-model="waCustomNote"
              type="text"
              placeholder="Contoh: Dosen berhalangan hadir, tugas menyusul"
              class="w-full p-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <!-- Preview Textarea -->
          <div>
            <label for="wa-preview-text" class="block font-semibold text-[var(--text)] mb-1">
              Pratinjau Pesan:
            </label>
            <textarea
              id="wa-preview-text"
              readonly
              :value="generatedWaText"
              rows="8"
              class="w-full p-2.5 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] font-mono text-[11px] leading-relaxed resize-none focus:outline-none"
            ></textarea>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-2 pt-2.5 border-t border-[var(--border)]">
          <button
            @click="isWaModalOpen = false"
            class="mk-btn"
          >
            Tutup
          </button>

          <button
            @click="copyWaText"
            class="mk-btn"
          >
            <span class="material-symbols-outlined text-[15px]">content_copy</span>
            <span>Salin Teks</span>
          </button>

          <button
            @click="openWhatsAppUrl"
            class="px-3.5 py-2 rounded-[6px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span class="material-symbols-outlined text-[15px]">chat</span>
            <span>Buka WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
