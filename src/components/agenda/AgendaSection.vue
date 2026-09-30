<script setup>
import { onMounted, onUnmounted, computed, ref } from "vue";
import { useAgenda, formatAgendaDeadline } from "@/composables/useAgenda";
import { useSchedule } from "@/composables/useSchedule";
import { getLatestTimestamp, formatRelativeTime } from "@/utils/timeAgo";

const { agendas, loading, fetchAgendas } = useAgenda();
const { currentWeek, activeWeekStatus } = useSchedule();

const currentTime = ref(Date.now());
let timer = null;

// Compute active week number
const activeWeekNumber = computed(() => {
  const roman = currentWeek.value?.pekan;
  const romanMap = {
    I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8,
    IX: 9, X: 10, XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15, XVI: 16,
  };
  return romanMap[roman] || 5;
});

// Format range for display
const weekDateRange = computed(() => {
  return currentWeek.value?.tanggal_daring || "Senin – Jumat";
});

const isUpcoming = computed(() => activeWeekStatus.value === "upcoming");

const latestTimestamp = computed(() => getLatestTimestamp(agendas.value));
const lastUpdatedTime = computed(() => {
  if (!latestTimestamp.value) return "just now";
  return formatRelativeTime(latestTimestamp.value, currentTime.value);
});

onMounted(() => {
  fetchAgendas(activeWeekNumber.value);
  timer = setInterval(() => {
    currentTime.value = Date.now();
  }, 30000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <section
    id="agenda"
    aria-labelledby="agenda-heading"
    class="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 md:p-6 space-y-4 mb-space-xl transition-colors duration-200"
  >
    <!-- Section Header with Active Week Context -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800"
    >
      <div>
        <div class="flex items-center gap-2">
          <h2
            id="agenda-heading"
            class="text-xl font-bold text-slate-900 dark:text-white tracking-tight"
          >
            Agenda Kelas
          </h2>
          <!-- Upcoming Badge (Sunday Buffer Zone) -->
          <span
            v-if="isUpcoming"
            class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[11px] font-bold border border-amber-300 dark:border-amber-800 flex items-center gap-1"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Pekan {{ activeWeekNumber }} (Upcoming)</span>
          </span>
          <!-- Ongoing Badge (Mon-Sat Active Week) -->
          <span
            v-else
            class="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-1"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Pekan {{ activeWeekNumber }} (Ongoing)</span>
          </span>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {{ isUpcoming ? 'Target tugas yang akan dimulai pada pekan nanti' : 'Target tugas yang harus diselesaikan pada pekan ini' }}
        </p>
      </div>

      <div class="text-xs text-slate-400 dark:text-slate-500 shrink-0 font-medium">
        {{ weekDateRange }}
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading && agendas.length === 0" class="divide-y divide-slate-100 dark:divide-slate-800 animate-pulse py-2">
      <div v-for="i in 3" :key="i" class="py-3.5 space-y-2">
        <div class="flex justify-between items-center">
          <div class="h-3 w-36 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div class="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded"></div>
        </div>
        <div class="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div class="h-3 w-1/2 bg-slate-100 dark:bg-slate-850 rounded"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="agendas.length === 0"
      class="py-10 text-center flex flex-col items-center justify-center space-y-2"
    >
      <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">
        Tidak ada agenda tugas untuk pekan ini
      </p>
      <p class="text-xs text-slate-400 dark:text-slate-500">
        Semua tugas pekan ini telah terselesaikan atau belum ada tugas baru dari dosen.
      </p>
    </div>

    <!-- Agenda List Demonstrating All 3 Variations -->
    <div v-else class="divide-y divide-slate-100 dark:divide-slate-800/80">
      <article
        v-for="item in agendas"
        :key="item.id"
        class="py-3.5 first:pt-1 space-y-1 group"
      >
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold text-blue-600 dark:text-blue-400">
              {{ item.mata_kuliah }}
            </span>
            <span v-if="item.pertemuan" class="text-xs text-slate-400">
              • Pertemuan {{ item.pertemuan }}
            </span>
          </div>

          <!-- Deadline Display (Icon + Label) -->
          <!-- 1. Datetime (Ketat) -->
          <span
            v-if="item.tipe_deadline === 'datetime'"
            class="inline-flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ formatAgendaDeadline(item) }}</span>
          </span>

          <!-- 2. Date Only -->
          <span
            v-else-if="item.tipe_deadline === 'date_only'"
            class="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium"
          >
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{{ formatAgendaDeadline(item) }}</span>
          </span>

          <!-- 3. Week Only ("Pekan 5") -->
          <span
            v-else
            class="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{{ formatAgendaDeadline(item) }}</span>
          </span>
        </div>

        <h3 class="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug">
          {{ item.judul }}
        </h3>

        <p
          v-if="item.keterangan"
          class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line"
        >
          {{ item.keterangan }}
        </p>
      </article>
    </div>

    <!-- Section Footer Link to Pengurus Portal -->
    <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
      <span class="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
        <svg class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Last update: {{ lastUpdatedTime }}</span>
      </span>

      <router-link
        to="/pengurus"
        class="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
      >
        <span>Kelola di Zona Pengurus</span>
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </router-link>
    </div>
  </section>
</template>
