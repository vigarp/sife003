<script setup>
import { computed } from "vue";
import { useTelemetri } from "@/composables/useTelemetri";
import { useSchedule, parsePekanDateRange } from "@/composables/useSchedule";

const { topicReplies, isForumOpen } = useTelemetri();
const { currentWeek } = useSchedule();

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function toLocalDateKey(dateInput) {
  if (!dateInput) return null;
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildWeekDayBuckets(range) {
  const todayKey = toLocalDateKey(new Date());
  const dayMap = new Map();
  const days = [];

  const startDate = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
  const endDate = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate());
  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);

  for (let offset = 0; offset <= totalDays; offset++) {
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + offset);
    const key = toLocalDateKey(cursor);
    const entry = {
      key,
      dayName: DAY_NAMES[cursor.getDay()],
      dateNum: cursor.getDate(),
      isToday: key === todayKey,
      studentCount: 0,
      lecturerCount: 0,
      total: 0,
      topicCounts: {},
    };
    dayMap.set(key, entry);
    days.push(entry);
  }

  return { dayMap, days };
}

function classifyAndAccumulateReply(reply, idx, dayMap, seenStudentIds, seenLecturerIds) {
  const isLecturer = !reply.nim && ((reply.id_dosen !== null && reply.id_dosen !== undefined) || Boolean(reply.dosen));
  const isStudent = Boolean(reply.nim);
  if (!isLecturer && !isStudent) return { studentDelta: 0, lecturerDelta: 0 };

  const uniqueKey = reply.id ? String(reply.id) : `idx-${idx}`;
  const seenSet = isStudent ? seenStudentIds : seenLecturerIds;
  if (seenSet.has(uniqueKey)) return { studentDelta: 0, lecturerDelta: 0 };
  seenSet.add(uniqueKey);

  const dateKey = toLocalDateKey(reply.createdAt || reply.created_at || reply.tanggal || reply.updatedAt);
  const bucket = dateKey ? dayMap.get(dateKey) : null;
  if (!bucket) return { studentDelta: 0, lecturerDelta: 0 };

  const topicTitle = reply._topicJudul || "Diskusi";
  if (!bucket.topicCounts[topicTitle]) {
    bucket.topicCounts[topicTitle] = { student: 0, lecturer: 0 };
  }

  if (isStudent) {
    bucket.studentCount += 1;
    bucket.topicCounts[topicTitle].student += 1;
  } else {
    bucket.lecturerCount += 1;
    bucket.topicCounts[topicTitle].lecturer += 1;
  }
  bucket.total = bucket.studentCount + bucket.lecturerCount;

  return {
    studentDelta: isStudent ? 1 : 0,
    lecturerDelta: isLecturer ? 1 : 0,
  };
}

const chartData = computed(() => {
  const range = parsePekanDateRange(currentWeek.value?.tanggal_daring);
  if (!range) {
    return { days: [], maxTotal: 1, totalStudent: 0, totalLecturer: 0, totalAll: 0 };
  }

  const { dayMap, days } = buildWeekDayBuckets(range);
  const seenStudentIds = new Set();
  const seenLecturerIds = new Set();
  let totalStudent = 0;
  let totalLecturer = 0;

  topicReplies.value.forEach((reply, idx) => {
    const { studentDelta, lecturerDelta } = classifyAndAccumulateReply(
      reply,
      idx,
      dayMap,
      seenStudentIds,
      seenLecturerIds
    );
    totalStudent += studentDelta;
    totalLecturer += lecturerDelta;
  });

  const maxTotal = Math.max(1, ...days.map((d) => d.total));

  return {
    days,
    maxTotal,
    totalStudent,
    totalLecturer,
    totalAll: totalStudent + totalLecturer,
  };
});

function getSegmentHeight(count, maxTotal) {
  if (!count || maxTotal <= 0) return "0%";
  const pct = (count / maxTotal) * 100;
  return `${Math.max(pct, 6)}%`;
}

function getTooltipAlignClass(idx, totalDays) {
  if (idx === 0) return "left-0";
  if (idx === totalDays - 1) return "right-0";
  return "left-1/2 -translate-x-1/2";
}
</script>

<template>
  <div
    v-if="isForumOpen && chartData.days.length > 0"
    class="mk-card p-3 sm:p-4 space-y-3"
  >
    <!-- Header & Legend -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <h3 class="mk-section-title flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[15px]">bar_chart</span>
          <span>Aktivitas Reply Pekan Ini</span>
        </h3>
        <p class="text-[11px] text-[var(--muted)] mt-0.5 tabular-nums">
          Total {{ chartData.totalAll }} balasan ({{ chartData.totalStudent }} Mahasiswa, {{ chartData.totalLecturer }} Dosen)
        </p>
      </div>

      <div class="flex items-center gap-3 text-[11px] font-medium text-[var(--muted)]">
        <span class="inline-flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-[2px] bg-blue-600 dark:bg-blue-400"></span>
          <span>Mahasiswa</span>
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-[2px] bg-amber-500 dark:bg-amber-400"></span>
          <span>Dosen</span>
        </span>
      </div>
    </div>

    <!-- Bar Chart -->
    <div class="pt-1.5">
      <div
        class="grid gap-2 sm:gap-3 items-end h-36 border-b border-[var(--border)] pb-2"
        :style="{ gridTemplateColumns: `repeat(${chartData.days.length}, minmax(0, 1fr))` }"
      >
        <div
          v-for="(day, idx) in chartData.days"
          :key="day.key"
          class="relative flex flex-col items-center justify-end h-full gap-1.5 group"
        >
          <!-- Hover Tooltip (Role + Per-Topic Student/Lecturer Breakdown) -->
          <div
            v-if="day.total > 0"
            class="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute bottom-full mb-2 z-20 w-max max-w-[260px] rounded-[8px] bg-slate-900 dark:bg-slate-800 text-slate-100 border border-slate-700 px-2.5 py-2 text-[11px] space-y-1.5"
            :class="getTooltipAlignClass(idx, chartData.days.length)"
          >
            <div class="flex items-center gap-3 font-semibold tabular-nums">
              <span class="inline-flex items-center gap-1 text-blue-300">
                <span class="w-2 h-2 rounded-[2px] bg-blue-400"></span>
                <span>{{ day.studentCount }} Mahasiswa</span>
              </span>
              <span class="inline-flex items-center gap-1 text-amber-300">
                <span class="w-2 h-2 rounded-[2px] bg-amber-400"></span>
                <span>{{ day.lecturerCount }} Dosen</span>
              </span>
            </div>

            <div class="border-t border-slate-700 pt-1 space-y-1">
              <div
                v-for="(tCount, topicName) in day.topicCounts"
                :key="topicName"
                class="flex items-center justify-between gap-3 text-[10px] text-slate-300"
              >
                <span class="truncate max-w-[135px]">{{ topicName }}</span>
                <span class="flex items-center gap-1.5 font-semibold shrink-0 tabular-nums">
                  <span class="text-blue-300">{{ tCount.student }} Mhs</span>
                  <span class="text-slate-600">&bull;</span>
                  <span class="text-amber-300">{{ tCount.lecturer }} Dsn</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Total label above bar -->
          <span
            class="text-[11px] font-semibold tabular-nums"
            :class="day.total > 0 ? 'text-[var(--text)]' : 'text-[var(--muted)] opacity-60'"
          >
            {{ day.total }}
          </span>

          <!-- Stacked Bar Track -->
          <div class="w-full max-w-[40px] flex-1 flex flex-col justify-end items-center">
            <div
              v-if="day.total > 0"
              class="w-full flex flex-col justify-end rounded-t-[4px] overflow-hidden transition-opacity duration-200 group-hover:opacity-85"
              :style="{ height: getSegmentHeight(day.total, chartData.maxTotal) }"
            >
              <!-- Lecturer Segment (Top) -->
              <div
                v-if="day.lecturerCount > 0"
                class="w-full bg-amber-500 dark:bg-amber-400"
                :style="{ height: `${(day.lecturerCount / day.total) * 100}%` }"
              ></div>
              <!-- Student Segment (Bottom) -->
              <div
                v-if="day.studentCount > 0"
                class="w-full bg-blue-600 dark:bg-blue-400"
                :style="{ height: `${(day.studentCount / day.total) * 100}%` }"
              ></div>
            </div>
            <div
              v-else
              class="w-full h-1 rounded-full bg-[var(--border)]"
            ></div>
          </div>
        </div>
      </div>

      <!-- X-Axis Day Labels -->
      <div
        class="grid gap-2 sm:gap-3 pt-2"
        :style="{ gridTemplateColumns: `repeat(${chartData.days.length}, minmax(0, 1fr))` }"
      >
        <div
          v-for="day in chartData.days"
          :key="`label-${day.key}`"
          class="text-center"
        >
          <span
            class="inline-flex flex-col items-center px-1.5 py-0.5 rounded-[4px] text-[11px] leading-tight tabular-nums"
            :class="
              day.isToday
                ? 'bg-blue-500/10 text-[var(--accent)] font-semibold'
                : 'text-[var(--muted)] font-medium'
            "
          >
            <span>{{ day.dayName }}</span>
            <span class="text-[10px] opacity-80">{{ day.dateNum }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
