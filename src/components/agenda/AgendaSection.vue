<script setup>
import { onMounted, onUnmounted, computed, ref, watch } from "vue";
import { useAgenda, formatAgendaDeadline } from "@/composables/useAgenda";
import { useSchedule, getPekanNumber, getPekanLabel } from "@/composables/useSchedule";
import { useAdminAuth } from "@/composables/useAdminAuth";
import { getLatestTimestamp, formatRelativeTime } from "@/utils/timeAgo";
import { formatAgendaShareText, copyToClipboard } from "@/utils/scheduleShare";

const { agendas, loading, fetchAgendas } = useAgenda();
const { currentWeek, activeWeekStatus } = useSchedule();
const { isAdmin } = useAdminAuth();

const currentTime = ref(Date.now());
const copiedAgenda = ref(false);
let timer = null;

async function handleCopyAgenda() {
  const text = formatAgendaShareText(agendas.value);
  const ok = await copyToClipboard(text);
  if (ok) {
    copiedAgenda.value = true;
    setTimeout(() => {
      copiedAgenda.value = false;
    }, 2000);
  }
}

// Compute active week number based on schedule configuration
const activeWeekNumber = computed(() => getPekanNumber(currentWeek.value));

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

// Watch activeWeekNumber to automatically re-fetch agendas if navigated
watch(activeWeekNumber, (newWeek) => {
  fetchAgendas(newWeek);
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
    class="w-full mk-card p-4 sm:p-5 space-y-3 mb-6 transition-colors duration-200"
  >
    <!-- Section Header with Active Week Context -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[var(--border)]"
    >
      <div>
        <div class="flex items-center gap-2 flex-wrap">
          <h2
            id="agenda-heading"
            class="mk-section-title"
          >
            Agenda Kelas
          </h2>
          <!-- Upcoming Badge (Sunday Buffer Zone) -->
          <span
            v-if="isUpcoming"
            class="mk-badge mk-badge-warn"
          >
            {{ getPekanLabel(activeWeekNumber) }} (Upcoming)
          </span>
          <!-- Ongoing Badge (Mon-Sat Active Week) -->
          <span
            v-else
            class="mk-badge mk-badge-ok"
          >
            {{ getPekanLabel(activeWeekNumber) }} (Ongoing)
          </span>
        </div>
        <p class="text-xs text-[var(--muted)] mt-1">
          {{ isUpcoming ? 'Target tugas yang akan dimulai pada pekan nanti' : 'Target tugas yang harus diselesaikan pada pekan ini' }}
        </p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs text-[var(--muted)] font-mono">
          {{ weekDateRange }}
        </span>
        <button
          v-if="isAdmin && agendas.length > 0"
          type="button"
          @click="handleCopyAgenda"
          class="inline-flex items-center gap-1 px-2.5 py-1 mk-btn cursor-pointer"
          :class="
            copiedAgenda
              ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300'
              : ''
          "
          :title="copiedAgenda ? 'Tersalin ke clipboard!' : 'Salin format tugas pekan ini'"
          :aria-label="copiedAgenda ? 'Agenda tugas tersalin' : 'Salin format tugas pekan ini'"
        >
          <svg aria-hidden="true" v-if="copiedAgenda" class="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <svg aria-hidden="true" v-else class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          <span>{{ copiedAgenda ? 'Tersalin' : 'Salin Tugas' }}</span>
        </button>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading && agendas.length === 0" class="divide-y divide-dashed divide-[var(--border)] animate-pulse py-2">
      <div v-for="i in 3" :key="i" class="py-3 space-y-2">
        <div class="flex justify-between items-center">
          <div class="h-3 w-36 bg-[var(--hover)] rounded"></div>
          <div class="h-3 w-28 bg-[var(--hover)] rounded"></div>
        </div>
        <div class="h-4 w-3/4 bg-[var(--hover)] rounded"></div>
        <div class="h-3 w-1/2 bg-[var(--hover)] rounded"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="agendas.length === 0"
      class="py-8 text-center flex flex-col items-center justify-center space-y-1.5"
    >
      <p class="text-sm font-medium text-[var(--text)]">
        Tidak ada agenda tugas untuk pekan ini
      </p>
      <p class="text-xs text-[var(--muted)]">
        Semua tugas pekan ini telah terselesaikan atau belum ada tugas baru dari dosen.
      </p>
    </div>

    <!-- Agenda List -->
    <div v-else class="divide-y divide-dashed divide-[var(--border)]">
      <article
        v-for="item in agendas"
        :key="item.id"
        class="py-3 first:pt-0.5 last:pb-0.5 space-y-1"
      >
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-semibold text-[var(--accent)]">
              {{ item.mata_kuliah }}
            </span>
            <span v-if="item.pertemuan" class="text-xs text-[var(--muted)] font-mono">
              • Pertemuan {{ item.pertemuan }}
            </span>
          </div>

          <!-- Deadline Display -->
          <span
            v-if="item.tipe_deadline === 'datetime'"
            class="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium tabular-nums"
          >
            <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ formatAgendaDeadline(item) }}</span>
          </span>

          <span
            v-else-if="item.tipe_deadline === 'date_only'"
            class="inline-flex items-center gap-1 text-xs text-[var(--muted)] font-medium tabular-nums"
          >
            <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{{ formatAgendaDeadline(item) }}</span>
          </span>

          <span
            v-else
            class="inline-flex items-center gap-1 text-xs text-[var(--muted)] font-medium px-2 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)]"
          >
            <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{{ formatAgendaDeadline(item) }}</span>
          </span>
        </div>

        <h3 class="text-sm font-medium text-[var(--text)] leading-snug">
          {{ item.judul }}
        </h3>

        <p
          v-if="item.keterangan"
          class="text-xs text-[var(--muted)] leading-relaxed whitespace-pre-line"
        >
          {{ item.keterangan }}
        </p>
      </article>
    </div>

    <!-- Section Footer Link to Pengurus Portal -->
    <div class="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted)]">
      <span class="inline-flex items-center gap-1.5">
        <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Last update: {{ lastUpdatedTime }}</span>
      </span>

      <router-link
        to="/pengurus"
        class="font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1"
      >
        <span>Kelola di Zona Pengurus</span>
        <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </router-link>
    </div>
  </section>
</template>
