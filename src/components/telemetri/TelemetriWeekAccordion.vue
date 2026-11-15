<script setup>
import { ref, computed } from "vue";
import { useSchedule } from "@/composables/useSchedule";
import { useTelemetri, COURSE_ORDER_PREFERENCE } from "@/composables/useTelemetri";
import TelemetriScanResult from "@/components/telemetri/TelemetriScanResult.vue";

const emit = defineEmits(["open-token-modal"]);

const {
  akademik,
  allWeeks,
  viewedWeekIndex,
  activeWeekStatus,
  currentWeek,
  isCurrentWeek,
  prevWeek,
  nextWeek,
  resetToCurrentWeek,
  getMaster,
  getPekanLabel,
} = useSchedule();

const {
  hasToken,
  scanning,
  scanningForum,
  selectedCourseKode,
  selectedPertemuanNum,
  loadCourseDetail,
  resolveCourseKode,
} = useTelemetri();

function openMentariLms(course, pertemuan) {
  const base = "https://mentari.unpam.ac.id/u-courses";
  const url = course?.kodeCourse
    ? `${base}/${encodeURIComponent(String(course.kodeCourse))}?accord_pertemuan=PERTEMUAN_${encodeURIComponent(String(pertemuan))}`
    : base;
  if (typeof window !== "undefined" && url.startsWith("https://mentari.unpam.ac.id/")) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

const expandedCourseKey = ref(null);
const expandedSessionKey = ref(null);

const semesterCode = akademik?.semester?.match(/\((\d+)\)/)?.[1] || "20261";
const kelasCode = akademik?.kelas || "03SIFE003";

function getOrderIndex(kode) {
  const idx = COURSE_ORDER_PREFERENCE.indexOf(kode);
  return idx === -1 ? 999 : idx;
}

function appendCourseSessions(group, entry, master, mode) {
  const list = Array.isArray(entry.pertemuan) ? entry.pertemuan : [];
  for (const p of list) {
    const num = Number.parseInt(p, 10);
    if (Number.isNaN(num) || String(num) !== String(p).trim()) continue;
    if (!group.sessions.some((s) => s.pertemuan === num)) {
      group.sessions.push({
        pertemuan: num,
        mode,
        jam: entry.jam || master?.jam || "",
      });
    }
  }
}

function buildSectionCourses(entries, mode) {
  if (!Array.isArray(entries)) return [];
  const grouped = new Map();

  for (const entry of entries) {
    const master = getMaster(entry.mata_kuliah);
    const baseKey = master?.kode || entry.mata_kuliah;
    const key = `${mode}::${baseKey}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        name: master?.nama || entry.mata_kuliah,
        kode: master?.kode || "",
        sks: master?.sks || 2,
        dosen: master?.dosen || "",
        mode,
        kodeCourse: resolveCourseKode(
          master || { nama: entry.mata_kuliah },
          semesterCode,
          kelasCode
        ),
        sessions: [],
      });
    }

    appendCourseSessions(grouped.get(key), entry, master, mode);
  }

  return Array.from(grouped.values())
    .map((c) => ({
      ...c,
      sessions: c.sessions.sort((a, b) => a.pertemuan - b.pertemuan),
    }))
    .filter((c) => c.sessions.length > 0)
    .sort((a, b) => getOrderIndex(a.kode) - getOrderIndex(b.kode));
}

const courseSections = computed(() => {
  const week = currentWeek.value;
  if (!week) return [];

  const mentariCourses = buildSectionCourses(week.daring, "Daring");
  const tatapMukaCourses = buildSectionCourses(week.luring, "Luring");

  return [
    {
      id: "daring",
      title: "Mentari (Online)",
      subtitle: week.tanggal_daring || "",
      icon: "wb_sunny",
      theme: "amber",
      courses: mentariCourses,
    },
    {
      id: "luring",
      title: "Tatap Muka di Kelas",
      subtitle: week.tanggal_luring || "",
      icon: "school",
      theme: "blue",
      courses: tatapMukaCourses,
    },
  ].filter((sec) => sec.courses.length > 0);
});

const isExamWeek = computed(() => {
  const pekan = String(currentWeek.value?.pekan || "").toUpperCase();
  return (pekan === "UTS" || pekan === "UAS") && courseSections.value.length === 0;
});

function getSessionKey(courseKey, pertemuan) {
  return `${courseKey}::${pertemuan}`;
}

function isCourseExpanded(courseKey) {
  return expandedCourseKey.value === courseKey;
}

function isSessionExpanded(courseKey, pertemuan) {
  return expandedSessionKey.value === getSessionKey(courseKey, pertemuan);
}

function isActiveTarget(course, pertemuan) {
  return (
    selectedCourseKode.value === course.kodeCourse &&
    selectedPertemuanNum.value === pertemuan
  );
}

async function triggerScan(course, session, forceRefresh = false) {
  if (!hasToken.value) {
    emit("open-token-modal");
    return;
  }
  await loadCourseDetail(course.kodeCourse, session.pertemuan, { forceRefresh });
}

async function toggleCourse(course) {
  if (isCourseExpanded(course.key)) {
    expandedCourseKey.value = null;
    expandedSessionKey.value = null;
    return;
  }

  expandedCourseKey.value = course.key;

  if (course.sessions.length === 1) {
    const onlySession = course.sessions[0];
    expandedSessionKey.value = getSessionKey(course.key, onlySession.pertemuan);
    await triggerScan(course, onlySession);
  } else {
    expandedSessionKey.value = null;
  }
}

async function toggleSession(course, session) {
  const sKey = getSessionKey(course.key, session.pertemuan);
  if (expandedSessionKey.value === sKey) {
    expandedSessionKey.value = null;
    return;
  }
  expandedSessionKey.value = sKey;
  await triggerScan(course, session);
}

function handlePrevWeek() {
  expandedCourseKey.value = null;
  expandedSessionKey.value = null;
  prevWeek();
}

function handleNextWeek() {
  expandedCourseKey.value = null;
  expandedSessionKey.value = null;
  nextWeek();
}

function handleResetWeek() {
  expandedCourseKey.value = null;
  expandedSessionKey.value = null;
  resetToCurrentWeek();
}
</script>

<template>
  <div class="space-y-4">
    <!-- Week Navigator Bar -->
    <div
      class="mk-card p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-semibold text-[var(--text)]">
            {{ getPekanLabel(currentWeek?.pekan) }}
          </h2>
          <span
            v-if="isCurrentWeek"
            class="mk-badge mk-badge-ok"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {{ activeWeekStatus === "upcoming" ? "Pekan Berikutnya" : "Pekan Berjalan" }}
          </span>
          <span
            v-else
            class="mk-badge bg-[var(--hover)] text-[var(--muted)] border border-[var(--border)]"
          >
            Arsip / Rencana Pekan
          </span>
        </div>
        <p class="text-xs text-[var(--muted)] mt-0.5 tabular-nums">
          {{ currentWeek?.tanggal_daring || "Jadwal Pekan" }}
        </p>
      </div>

      <div class="flex items-center gap-1.5 self-end sm:self-center">
        <button
          v-if="!isCurrentWeek"
          type="button"
          @click="handleResetWeek"
          class="mk-btn !border-[var(--accent)] !text-[var(--accent)]"
        >
          Pekan Ini
        </button>
        <div class="inline-flex items-center gap-1">
          <button
            type="button"
            @click="handlePrevWeek"
            :disabled="viewedWeekIndex <= 0"
            aria-label="Pekan Sebelumnya"
            class="mk-btn !px-2 !py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span class="material-symbols-outlined text-[16px] block">chevron_left</span>
          </button>
          <button
            type="button"
            @click="handleNextWeek"
            :disabled="viewedWeekIndex >= allWeeks.length - 1"
            aria-label="Pekan Berikutnya"
            class="mk-btn !px-2 !py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span class="material-symbols-outlined text-[16px] block">chevron_right</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Exam Week Banner (UTS / UAS) -->
    <div
      v-if="isExamWeek"
      class="mk-card border-amber-500/40 p-5 text-center space-y-2"
    >
      <span class="material-symbols-outlined text-amber-500 text-[28px]">assignment</span>
      <div class="space-y-1">
        <p class="text-sm font-semibold text-[var(--text)]">
          {{ getPekanLabel(currentWeek?.pekan) }}
        </p>
        <p class="text-xs text-[var(--muted)] max-w-md mx-auto">
          Pekan ujian tidak memiliki sesi pertemuan forum reguler. Gunakan tombol navigasi pekan (&lsaquo; / &rsaquo;) untuk melihat pekan perkuliahan lainnya.
        </p>
      </div>
    </div>

    <!-- Vertical Sections: Mentari (Online) & Tatap Muka di Kelas -->
    <template v-else>
      <section
        v-for="section in courseSections"
        :key="section.id"
        class="space-y-2.5"
      >
        <!-- Section Subhead -->
        <div class="flex items-center justify-between gap-2 px-0.5">
          <div class="flex items-center gap-2 min-w-0">
            <span
              class="material-symbols-outlined text-[16px] shrink-0"
              :class="section.theme === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--accent)]'"
            >{{ section.icon }}</span>
            <div class="min-w-0">
              <h3 class="mk-section-title">
                {{ section.title }}
              </h3>
              <p v-if="section.subtitle" class="text-[11px] text-[var(--muted)]">
                {{ section.subtitle }}
              </p>
            </div>
          </div>

          <span
            class="mk-badge bg-[var(--hover)] text-[var(--muted)] border border-[var(--border)] shrink-0 tabular-nums"
          >
            {{ section.courses.length }} Matkul
          </span>
        </div>

        <!-- Accordion List of Courses -->
        <div class="space-y-2">
          <div
            v-for="course in section.courses"
            :key="course.key"
            class="mk-card overflow-hidden transition-colors"
            :class="isCourseExpanded(course.key) ? 'border-[var(--accent)]' : ''"
          >
            <!-- Level 1: Course Header -->
            <button
              type="button"
              @click="toggleCourse(course)"
              :aria-expanded="isCourseExpanded(course.key)"
              class="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2.5 text-left cursor-pointer hover:bg-[var(--hover)] transition-colors"
            >
              <div class="min-w-0 flex-1 space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold text-[var(--text)] truncate">
                    {{ course.name }}
                  </span>
                  <span
                    class="mk-badge bg-[var(--hover)] text-[var(--muted)] border border-[var(--border)] font-mono !text-[10px]"
                  >
                    {{ course.sks }} SKS
                  </span>
                </div>

                <div class="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                  <span v-if="course.dosen" class="truncate max-w-[260px] sm:max-w-none">
                    {{ course.dosen }}
                  </span>
                  <span v-if="course.dosen">&bull;</span>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span
                      v-for="s in course.sessions"
                      :key="s.pertemuan"
                      class="mk-badge !rounded-[6px] !text-[11px]"
                      :class="
                        section.theme === 'amber'
                          ? 'mk-badge-warn'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25'
                      "
                    >
                      Pertemuan {{ s.pertemuan }}
                    </span>
                  </div>
                </div>
              </div>

              <span
                class="material-symbols-outlined text-[var(--muted)] transition-transform duration-200 shrink-0 text-[20px]"
                :class="{ 'rotate-180 text-[var(--accent)]': isCourseExpanded(course.key) }"
              >
                expand_more
              </span>
            </button>

            <!-- Level 1 Body: Pertemuan Accordions (Level 2) -->
            <div
              v-if="isCourseExpanded(course.key)"
              class="border-t border-[var(--border)] bg-[var(--bg)] p-2 sm:p-3 space-y-2"
            >
              <div
                v-for="session in course.sessions"
                :key="session.pertemuan"
                class="rounded-[8px] border bg-[var(--surface)] overflow-hidden transition-colors"
                :class="
                  isSessionExpanded(course.key, session.pertemuan)
                    ? 'border-[var(--accent)]'
                    : 'border-[var(--border)]'
                "
              >
                <!-- Level 2: Pertemuan Header + Actions (Pindai Ulang & Buka di Mentari) -->
                <div class="w-full px-3 sm:px-3.5 flex items-center justify-between gap-2 hover:bg-[var(--hover)] transition-colors">
                  <button
                    type="button"
                    @click="toggleSession(course, session)"
                    :aria-expanded="isSessionExpanded(course.key, session.pertemuan)"
                    class="flex-1 py-2 text-left text-xs font-semibold text-[var(--text)] cursor-pointer"
                  >
                    Pertemuan {{ session.pertemuan }}
                  </button>

                  <div class="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      @click="triggerScan(course, session, true)"
                      :disabled="scanning || scanningForum"
                      class="mk-btn !py-1 !px-2 !text-[11px] disabled:opacity-50"
                    >
                      <span
                        class="material-symbols-outlined text-[14px]"
                        :class="{ 'animate-spin': (scanning || scanningForum) && isActiveTarget(course, session.pertemuan) }"
                      >
                        refresh
                      </span>
                      <span class="hidden sm:inline">Pindai Ulang</span>
                    </button>

                    <button
                      type="button"
                      @click="openMentariLms(course, session.pertemuan)"
                      class="mk-btn !py-1 !px-2 !text-[11px] !border-amber-500/35 !text-amber-700 dark:!text-amber-300"
                    >
                      <span class="hidden sm:inline">Buka di Mentari</span>
                      <span class="sm:hidden">Mentari</span>
                      <span class="material-symbols-outlined text-[13px]">open_in_new</span>
                    </button>

                    <button
                      type="button"
                      @click="toggleSession(course, session)"
                      :aria-expanded="isSessionExpanded(course.key, session.pertemuan)"
                      :aria-label="`Toggle Pertemuan ${session.pertemuan}`"
                      class="p-0.5 rounded-[6px] text-[var(--muted)] cursor-pointer"
                    >
                      <span
                        class="material-symbols-outlined text-[18px] transition-transform duration-200 block"
                        :class="{ 'rotate-180 text-[var(--accent)]': isSessionExpanded(course.key, session.pertemuan) }"
                      >
                        expand_more
                      </span>
                    </button>
                  </div>
                </div>

                <!-- Level 2 Body: Level 3 Stage Tabs -->
                <div
                  v-if="isSessionExpanded(course.key, session.pertemuan)"
                  class="border-t border-[var(--border)] p-2.5 sm:p-3.5"
                >
                  <TelemetriScanResult
                    :is-active="isActiveTarget(course, session.pertemuan)"
                    @open-token-modal="emit('open-token-modal')"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
