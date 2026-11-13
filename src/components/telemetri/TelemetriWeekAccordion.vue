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
  selectedCourseKode,
  selectedPertemuanNum,
  scanForum,
  resolveCourseKode,
} = useTelemetri();

const expandedCourseKey = ref(null);
const expandedSessionKey = ref(null);

const semesterCode = akademik?.semester?.match(/\((\d+)\)/)?.[1] || "20261";
const kelasCode = akademik?.kelas || "03SIFE003";

function getOrderIndex(kode) {
  const idx = COURSE_ORDER_PREFERENCE.indexOf(kode);
  return idx === -1 ? 999 : idx;
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

    const group = grouped.get(key);
    const list = Array.isArray(entry.pertemuan) ? entry.pertemuan : [];
    for (const p of list) {
      const num = Number.parseInt(p, 10);
      if (!Number.isNaN(num) && String(num) === String(p).trim()) {
        if (!group.sessions.some((s) => s.pertemuan === num)) {
          group.sessions.push({
            pertemuan: num,
            mode,
            jam: entry.jam || master?.jam || "",
          });
        }
      }
    }
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
  await scanForum(course.kodeCourse, session.pertemuan, { forceRefresh });
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
  <div class="space-y-5">
    <!-- Week Navigator Bar -->
    <div
      class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div class="flex items-start sm:items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0"
        >
          <span class="material-symbols-outlined text-[20px]">calendar_view_week</span>
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-sm font-bold text-slate-900 dark:text-white">
              {{ getPekanLabel(currentWeek?.pekan) }}
            </h2>
            <span
              v-if="isCurrentWeek"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {{ activeWeekStatus === "upcoming" ? "Pekan Berikutnya" : "Pekan Berjalan" }}
            </span>
            <span
              v-else
              class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              Arsip / Rencana Pekan
            </span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {{ currentWeek?.tanggal_daring || "Jadwal Pekan" }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 self-end sm:self-center">
        <button
          v-if="!isCurrentWeek"
          type="button"
          @click="handleResetWeek"
          class="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
        >
          Pekan Ini
        </button>
        <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            @click="handlePrevWeek"
            :disabled="viewedWeekIndex <= 0"
            aria-label="Pekan Sebelumnya"
            class="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined text-[18px] block">chevron_left</span>
          </button>
          <button
            type="button"
            @click="handleNextWeek"
            :disabled="viewedWeekIndex >= allWeeks.length - 1"
            aria-label="Pekan Berikutnya"
            class="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined text-[18px] block">chevron_right</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Exam Week Banner (UTS / UAS) -->
    <div
      v-if="isExamWeek"
      class="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 text-center space-y-3"
    >
      <span class="material-symbols-outlined text-amber-500 text-[32px]">assignment</span>
      <div class="space-y-1">
        <p class="text-sm font-bold text-amber-900 dark:text-amber-200">
          {{ getPekanLabel(currentWeek?.pekan) }}
        </p>
        <p class="text-xs text-amber-700 dark:text-amber-300 max-w-md mx-auto">
          Pekan ujian tidak memiliki sesi pertemuan forum reguler. Gunakan tombol navigasi pekan (&lsaquo; / &rsaquo;) untuk melihat pekan perkuliahan lainnya.
        </p>
      </div>
    </div>

    <!-- Vertical Sections: Mentari (Online) & Tatap Muka di Kelas -->
    <template v-else>
      <section
        v-for="section in courseSections"
        :key="section.id"
        class="space-y-3"
      >
        <!-- Section Subhead -->
        <div class="flex items-center justify-between gap-2 px-1">
          <div class="flex items-center gap-2.5">
            <div
              class="w-7 h-7 rounded-lg flex items-center justify-center border shrink-0"
              :class="
                section.theme === 'amber'
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80 text-amber-600 dark:text-amber-400'
                  : 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/80 text-blue-600 dark:text-blue-400'
              "
            >
              <span class="material-symbols-outlined text-[16px]">{{ section.icon }}</span>
            </div>
            <div>
              <h3 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {{ section.title }}
              </h3>
              <p v-if="section.subtitle" class="text-[11px] text-slate-500 dark:text-slate-400">
                {{ section.subtitle }}
              </p>
            </div>
          </div>

          <span
            class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
            :class="
              section.theme === 'amber'
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70'
                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/70'
            "
          >
            {{ section.courses.length }} Matkul
          </span>
        </div>

        <!-- Accordion List of Courses -->
        <div class="space-y-2.5">
          <div
            v-for="course in section.courses"
            :key="course.key"
            class="bg-white dark:bg-slate-900 rounded-2xl border transition-all overflow-hidden shadow-xs"
            :class="
              isCourseExpanded(course.key)
                ? section.theme === 'amber'
                  ? 'border-amber-400/70 dark:border-amber-700 ring-1 ring-amber-500/20'
                  : 'border-blue-400/70 dark:border-blue-700 ring-1 ring-blue-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            "
          >
            <!-- Level 1: Course Header -->
            <button
              type="button"
              @click="toggleCourse(course)"
              :aria-expanded="isCourseExpanded(course.key)"
              class="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div class="min-w-0 flex-1 space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {{ course.name }}
                  </span>
                  <span
                    class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {{ course.sks }} SKS
                  </span>
                </div>

                <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span v-if="course.dosen" class="truncate max-w-[260px] sm:max-w-none">
                    {{ course.dosen }}
                  </span>
                  <span v-if="course.dosen">&bull;</span>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span
                      v-for="s in course.sessions"
                      :key="s.pertemuan"
                      class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border"
                      :class="
                        section.theme === 'amber'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/60'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/70 dark:border-blue-800/60'
                      "
                    >
                      Pertemuan {{ s.pertemuan }}
                    </span>
                  </div>
                </div>
              </div>

              <span
                class="material-symbols-outlined text-slate-400 transition-transform duration-200 shrink-0"
                :class="{ 'rotate-180': isCourseExpanded(course.key) }"
              >
                expand_more
              </span>
            </button>

            <!-- Level 1 Body -->
            <div
              v-if="isCourseExpanded(course.key)"
              class="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-3 sm:p-4 space-y-3"
            >
              <!-- Case A: 2+ sessions (e.g. 3 SKS -> Sub-Accordion per Pertemuan) -->
              <template v-if="course.sessions.length > 1">
                <div
                  v-for="session in course.sessions"
                  :key="session.pertemuan"
                  class="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden transition-colors"
                  :class="
                    isSessionExpanded(course.key, session.pertemuan)
                      ? 'border-indigo-300 dark:border-indigo-700'
                      : 'border-slate-200 dark:border-slate-800'
                  "
                >
                  <!-- Level 2: Sub-Accordion Header -->
                  <button
                    type="button"
                    @click="toggleSession(course, session)"
                    :aria-expanded="isSessionExpanded(course.key, session.pertemuan)"
                    class="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <span class="text-xs font-bold text-slate-900 dark:text-white">
                      Pertemuan {{ session.pertemuan }}
                    </span>

                    <span
                      class="material-symbols-outlined text-[20px] text-slate-400 transition-transform duration-200"
                      :class="{ 'rotate-180 text-indigo-500': isSessionExpanded(course.key, session.pertemuan) }"
                    >
                      expand_more
                    </span>
                  </button>

                  <!-- Level 2: Leaf Content -->
                  <div
                    v-if="isSessionExpanded(course.key, session.pertemuan)"
                    class="border-t border-slate-100 dark:border-slate-800 p-3 sm:p-4"
                  >
                    <TelemetriScanResult
                      :is-active="isActiveTarget(course, session.pertemuan)"
                      :show-toolbar="true"
                      @refresh="triggerScan(course, session, true)"
                      @open-token-modal="emit('open-token-modal')"
                    />
                  </div>
                </div>
              </template>

              <!-- Case B: Single session in this week (2 SKS -> direct leaf content) -->
              <template v-else-if="course.sessions.length === 1">
                <TelemetriScanResult
                  :is-active="isActiveTarget(course, course.sessions[0].pertemuan)"
                  :show-toolbar="true"
                  @refresh="triggerScan(course, course.sessions[0], true)"
                  @open-token-modal="emit('open-token-modal')"
                />
              </template>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
