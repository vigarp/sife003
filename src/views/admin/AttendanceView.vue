<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAdminAuth } from "@/composables/useAdminAuth";
import { useAttendance } from "@/composables/useAttendance";
import { formatWhatsAppReport, formatIndonesianDate } from "@/utils/whatsappFormatter";

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
  <div class="w-full space-y-5 pb-20">
    <!-- Toast Alert -->
    <div
      v-if="toast.show"
      class="fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-3 transition-all border"
      :class="[
        toast.type === 'error'
          ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800'
          : toast.type === 'warning'
          ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
          : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800',
      ]"
    >
      <span>{{ toast.message }}</span>
      <button @click="toast.show = false" class="cursor-pointer font-bold">✕</button>
    </div>

    <!-- Header & Navigation -->
    <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-xs">
      <div class="flex items-center gap-3">
        <router-link
          to="/pengurus"
          class="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title="Kembali ke Zona Pengurus"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </router-link>

        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>m-hadir</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                Offline-First
              </span>
            </h1>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Presensi Kelas Cepat • Generator Format WhatsApp Dosen
          </p>
        </div>
      </div>

      <!-- Sync Status & Manual Sync Button -->
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Online / Offline Badge -->
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border"
          :class="[
            !isOnline
              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              : pendingCount > 0
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          ]"
        >
          <span
            class="w-2 h-2 rounded-full"
            :class="[
              !isOnline
                ? 'bg-amber-500'
                : pendingCount > 0
                ? 'bg-blue-500 animate-pulse'
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
          class="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <svg
            class="w-3.5 h-3.5"
            :class="{ 'animate-spin': isSyncing }"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{{ isSyncing ? "Menyinkronkan..." : "Sinkronkan" }}</span>
        </button>
      </div>
    </header>

    <!-- Session Picker Form -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <!-- Mata Kuliah -->
        <div class="sm:col-span-1">
          <label for="select-course" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Mata Kuliah
          </label>
          <select
            id="select-course"
            v-model="selectedCourseId"
            class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
          >
            <option v-for="c in courses" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>

        <!-- Pertemuan Ke- -->
        <div>
          <label for="meeting-number" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Pertemuan Ke-
          </label>
          <input
            id="meeting-number"
            v-model.number="meetingNo"
            type="number"
            min="1"
            max="16"
            class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
          />
        </div>

        <!-- Tanggal -->
        <div>
          <label for="meeting-date" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Tanggal Pertemuan
          </label>
          <input
            id="meeting-date"
            v-model="selectedDate"
            type="date"
            class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
          />
        </div>
      </div>

      <!-- Course info pill if selected -->
      <div v-if="currentCourse" class="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div>
          <strong class="text-slate-800 dark:text-slate-200">{{ currentCourse.name }}</strong>
          <span v-if="currentCourse.lecturer"> • Dosen: {{ currentCourse.lecturer }}</span>
          <span v-if="currentCourse.time"> • {{ currentCourse.time }}</span>
        </div>
        <div class="text-[11px] font-medium text-slate-400">
          {{ formatIndonesianDate(selectedDate) }} (Pertemuan {{ meetingNo }})
        </div>
      </div>
    </div>

    <!-- Quick Action Bar & Summary Counters -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <!-- Counters -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
        <span class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          Total: {{ sessionStats.total }}
        </span>
        <span class="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          H: {{ sessionStats.present }}
        </span>
        <span class="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          I: {{ sessionStats.permit }}
        </span>
        <span class="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          S: {{ sessionStats.sick }}
        </span>
        <span class="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          A: {{ sessionStats.absent }}
        </span>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <button
          @click="handleMarkAllPresent"
          class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Semua Hadir</span>
        </button>

        <button
          @click="isWaModalOpen = true"
          class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Laporan WA</span>
        </button>
      </div>
    </div>

    <!-- Student Search & Filter Tabs -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="relative flex-1 max-w-md">
        <label for="search-student-input" class="sr-only">Cari nama atau NIM</label>
        <input
          id="search-student-input"
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama atau NIM..."
          class="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
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
            'px-3 py-1 rounded-lg transition-colors cursor-pointer',
            statusFilter === f.key
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
          ]"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Student List Cards -->
    <div class="space-y-2">
      <div v-if="visibleStudents.length === 0" class="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
        Tidak ada mahasiswa ditemukan.
      </div>

      <div
        v-for="st in visibleStudents"
        :key="st.id"
        class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
      >
        <!-- Student Info -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="text-xs font-bold text-slate-900 dark:text-white truncate">
              {{ st.name }}
            </h3>
            <span
              v-if="st.isGuest"
              class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
            >
              Revisi
            </span>
          </div>
          <p class="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            {{ st.nim }}
          </p>
        </div>

        <!-- 4-Button Attendance Toggle: H, I, S, A -->
        <div class="flex items-center gap-1 shrink-0">
          <!-- H (Hadir) -->
          <button
            @click="handleSetStatus(st.id, 'present')"
            :class="[
              'w-8 h-8 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center border',
              (currentSession?.records?.[st.id] || 'present') === 'present'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750',
            ]"
            title="Hadir"
          >
            H
          </button>

          <!-- I (Izin) -->
          <button
            @click="handleSetStatus(st.id, 'permit')"
            :class="[
              'w-8 h-8 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center border',
              currentSession?.records?.[st.id] === 'permit'
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750',
            ]"
            title="Izin"
          >
            I
          </button>

          <!-- S (Sakit) -->
          <button
            @click="handleSetStatus(st.id, 'sick')"
            :class="[
              'w-8 h-8 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center border',
              currentSession?.records?.[st.id] === 'sick'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750',
            ]"
            title="Sakit"
          >
            S
          </button>

          <!-- A (Alpa) -->
          <button
            @click="handleSetStatus(st.id, 'absent')"
            :class="[
              'w-8 h-8 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center border',
              currentSession?.records?.[st.id] === 'absent'
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750',
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
      <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">
            Generator Format WhatsApp
          </h2>
          <button
            @click="isWaModalOpen = false"
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Mode Selection -->
        <div class="space-y-3 text-xs">
          <p class="block font-semibold text-slate-700 dark:text-slate-300">
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
                'p-2 rounded-xl border text-center font-semibold transition-all cursor-pointer',
                waFilterMode === m.key
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400',
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
              class="rounded border-slate-300 text-blue-600"
            />
            <label for="include-nim-check" class="text-slate-700 dark:text-slate-300 font-medium">
              Sertakan NIM Mahasiswa
            </label>
          </div>

          <div>
            <label for="wa-custom-note" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Tambahan (Opsional):
            </label>
            <input
              id="wa-custom-note"
              v-model="waCustomNote"
              type="text"
              placeholder="Contoh: Dosen berhalangan hadir, tugas menyusul"
              class="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <!-- Preview Textarea -->
          <div>
            <label for="wa-preview-text" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pratinjau Pesan:
            </label>
            <textarea
              id="wa-preview-text"
              readonly
              :value="generatedWaText"
              rows="8"
              class="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200 font-mono text-[11px] leading-relaxed resize-none focus:outline-none"
            ></textarea>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            @click="isWaModalOpen = false"
            class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Tutup
          </button>

          <button
            @click="copyWaText"
            class="px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span>Salin Teks</span>
          </button>

          <button
            @click="openWhatsAppUrl"
            class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>Buka WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
