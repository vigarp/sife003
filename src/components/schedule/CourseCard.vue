<script setup>
import { computed } from "vue";
import { useSchedule } from "@/composables/useSchedule";
import { useLastVisited } from "@/composables/useLastVisited";
import { useScheduleTime } from "@/composables/useScheduleTime";

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  master: {
    type: Object,
    default: null,
  },
  isLuring: {
    type: Boolean,
    default: false,
  },
  weekIndex: {
    type: Number,
    required: true,
  },
});

const { getLmsUrl, getPresensiUrl, activeWeekIndex, isCurrentWeek } = useSchedule();
const { setVisited, isVisited } = useLastVisited();
const { currentWib, isScheduleOngoing } = useScheduleTime();

const matkulKey = computed(() =>
  props.master?.kode || props.item.mata_kuliah.replace(/\s+/g, "_")
);

const mentariBtnKey = computed(
  () => `w${props.weekIndex}-${matkulKey.value}-${props.isLuring ? "luring" : "daring"}-mentari`
);

const presensiBtnKey = computed(
  () => `w${props.weekIndex}-${matkulKey.value}-${props.isLuring ? "luring" : "daring"}-presensi`
);

const isMentariVisited = computed(() => isVisited(mentariBtnKey.value));
const isPresensiVisited = computed(() => isVisited(presensiBtnKey.value));
const isCardVisited = computed(() => isMentariVisited.value || isPresensiVisited.value);

const pNum = computed(() => {
  if (props.item.pertemuan && props.item.pertemuan.length > 0) {
    return props.item.pertemuan.join(" & ");
  }
  return "";
});

const jam = computed(() => props.item.jam || props.master?.jam || null);
const lmsUrl = computed(() => getLmsUrl(props.item, props.master));
const presensiUrl = computed(() => getPresensiUrl(props.master));

const isOngoingSession = computed(() => {
  if (!props.isLuring || !jam.value) return false;
  const isCardInActiveWeek = props.weekIndex === activeWeekIndex;
  if (!isCardInActiveWeek || !isCurrentWeek.value) return false;

  return isScheduleOngoing(jam.value, {
    isLuring: true,
    isCurrentWeek: true,
    wibInfo: currentWib.value,
  });
});

defineExpose({
  isOngoingSession,
});
</script>

<template>
  <div
    class="matkul-card p-3 rounded-[8px] bg-[var(--bg)] border border-[var(--border)] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
    :class="{
      'card-last-visited': isCardVisited,
      'border-[var(--accent)] ring-1 ring-blue-500/20': isOngoingSession,
    }"
  >
    <!-- Left: Matkul Info -->
    <div class="flex flex-col gap-1 flex-1 min-w-0">
      <div class="flex items-center justify-between sm:justify-start gap-1.5 flex-wrap">
        <div class="flex items-center gap-1.5 flex-wrap">
          <!-- Time Badge (Luring) -->
          <span
            v-if="isLuring && jam"
            class="shrink-0 px-2 py-0.5 rounded-md text-xs font-mono tabular-nums flex items-center gap-1 transition-colors"
            :class="[
              isOngoingSession
                ? 'font-semibold bg-[var(--accent)] text-white'
                : 'font-medium bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)]',
            ]"
            :title="isOngoingSession ? 'Sesi ini sedang berlangsung sekarang (WIB)' : undefined"
          >
            <span class="material-symbols-outlined text-[13px]">schedule</span>
            <span>{{ jam }}</span>
          </span>

          <!-- Pertemuan / Ujian Badge -->
          <span
            v-if="item.pertemuan && item.pertemuan.length > 0"
            class="shrink-0 mk-badge"
            :class="
              isLuring
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-blue-200 dark:border-blue-800/60'
                : 'mk-badge-warn'
            "
          >
            Pertemuan {{ pNum }}
          </span>
          <span
            v-else
            class="shrink-0 mk-badge gap-1"
            :class="
              isLuring
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-blue-200 dark:border-blue-800/60'
                : 'mk-badge-warn'
            "
          >
            <span class="material-symbols-outlined text-[13px]">
              {{ isLuring ? 'school' : 'assignment' }}
            </span>
            <span>{{ isLuring ? 'Ujian Tatap Muka' : 'Ujian Mentari (Online)' }}</span>
          </span>
        </div>

        <!-- Mobile SKS Badge -->
        <div class="sm:hidden" v-if="master?.sks">
          <span
            class="text-[11px] font-mono tabular-nums font-medium text-[var(--muted)] px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] shrink-0"
          >
            {{ master.sks }} SKS
          </span>
        </div>
      </div>

      <!-- Course Title -->
      <h5 class="text-sm font-medium text-[var(--text)] leading-snug">
        {{ item.mata_kuliah }}
      </h5>

      <!-- Lecturer & Course Code -->
      <div class="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-[var(--muted)]">
        <span class="flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">person</span>
          <span>{{ master?.dosen || 'Dosen Pengampu' }}</span>
        </span>
        <template v-if="master?.kode">
          <span>•</span>
          <span class="font-mono text-[11px]">{{ master.kode }}</span>
        </template>
      </div>
    </div>

    <!-- Right: Desktop SKS & Action Buttons -->
    <div
      class="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]"
    >
      <div class="hidden sm:block" v-if="master?.sks">
        <span
          class="text-[11px] font-mono tabular-nums font-medium text-[var(--muted)] px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] shrink-0"
        >
          {{ master.sks }} SKS
        </span>
      </div>

      <div class="flex items-center gap-1.5 flex-wrap">
        <!-- Mentari Link Button (Online Only) -->
        <a
          v-if="!isLuring"
          :href="lmsUrl"
          target="_blank"
          rel="noopener noreferrer"
          @click="setVisited(mentariBtnKey)"
          :data-btn-key="mentariBtnKey"
          :aria-label="`Buka ${item.mata_kuliah} ${pNum ? 'Pertemuan ' + pNum : ''} di LMS Mentari`"
          :class="[
            'action-link-btn btn-mentari inline-flex items-center gap-1 px-2.5 py-1 mk-btn bg-[var(--surface)] cursor-pointer',
            { 'btn-last-visited': isMentariVisited },
          ]"
          :title="`Buka ${item.mata_kuliah} ${pNum ? 'Pertemuan ' + pNum : ''} di LMS Mentari${isMentariVisited ? ' • Terakhir Dikunjungi' : ''}`"
        >
          <span class="material-symbols-outlined text-[13px] text-amber-600 dark:text-amber-400">wb_sunny</span>
          <span>Mentari</span>
          <span class="material-symbols-outlined text-[12px] text-[var(--muted)]">open_in_new</span>
        </a>

        <!-- Cek Presensi Link Button (Online & Offline) -->
        <a
          v-if="master"
          :href="presensiUrl"
          target="_blank"
          rel="noopener noreferrer"
          @click="setVisited(presensiBtnKey)"
          :data-btn-key="presensiBtnKey"
          :aria-label="`Cek presensi ${item.mata_kuliah} di MyUNPAM`"
          :class="[
            'action-link-btn btn-presensi inline-flex items-center gap-1 px-2.5 py-1 mk-btn bg-[var(--surface)] cursor-pointer',
            { 'btn-last-visited': isPresensiVisited },
          ]"
          :title="`Cek Presensi ${item.mata_kuliah} di MyUNPAM${isPresensiVisited ? ' • Terakhir Dikunjungi' : ''}`"
        >
          <span class="material-symbols-outlined text-[13px] text-[var(--accent)]">how_to_reg</span>
          <span>Cek Presensi</span>
          <span class="material-symbols-outlined text-[12px] text-[var(--muted)]">open_in_new</span>
        </a>
      </div>
    </div>
  </div>
</template>
