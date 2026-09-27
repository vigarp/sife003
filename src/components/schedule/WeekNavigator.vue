<script setup>
import { useSchedule } from "@/composables/useSchedule";

const {
  allWeeks,
  activeWeekIndex,
  viewedWeekIndex,
  isCurrentWeek,
  isPastWeek,
  isFutureWeek,
  setWeek,
  prevWeek,
  nextWeek,
  resetToCurrentWeek,
} = useSchedule();
</script>

<template>
  <div class="flex items-center gap-2 flex-wrap">
    <!-- Reset to Active Week Button (shown when viewing non-current week) -->
    <button
      v-if="!isCurrentWeek"
      type="button"
      @click="resetToCurrentWeek"
      class="px-2.5 py-1.5 rounded-lg bg-primary-subtle dark:bg-blue-950/80 text-primary dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
      title="Kembali ke Pekan Sedang Berjalan"
    >
      <span class="material-symbols-outlined text-[15px]">today</span>
      <span>Pekan Ini</span>
    </button>

    <!-- Prev Week Button -->
    <button
      type="button"
      @click="prevWeek"
      :disabled="viewedWeekIndex === 0"
      class="w-8 h-8 rounded-lg bg-surface-card dark:bg-slate-800 text-text-muted dark:text-slate-300 hover:text-primary dark:hover:text-blue-400 border border-border-ui dark:border-slate-700/80 flex items-center justify-center transition-colors shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      title="Pekan Sebelumnya"
      aria-label="Pekan Sebelumnya"
    >
      <span class="material-symbols-outlined text-[18px]">chevron_left</span>
    </button>

    <!-- Week Select Dropdown -->
    <div class="relative min-w-[200px] sm:min-w-[240px]">
      <select
        :value="viewedWeekIndex"
        @change="(e) => setWeek(parseInt(e.target.value, 10))"
        class="w-full appearance-none bg-surface-card dark:bg-slate-900 text-text-main dark:text-slate-100 text-xs font-semibold rounded-lg border border-border-ui dark:border-slate-700/80 px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
        aria-label="Pilih Pekan Kuliah"
      >
        <option
          v-for="(pekan, idx) in allWeeks"
          :key="idx"
          :value="idx"
        >
          Pekan {{ pekan.pekan }} ({{ pekan.tanggal_daring }}){{ idx === activeWeekIndex ? ' • Aktif' : '' }}
        </option>
      </select>
      <div
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-subtle dark:text-slate-400"
      >
        <span class="material-symbols-outlined text-[18px]">unfold_more</span>
      </div>
    </div>

    <!-- Next Week Button -->
    <button
      type="button"
      @click="nextWeek"
      :disabled="viewedWeekIndex === allWeeks.length - 1"
      class="w-8 h-8 rounded-lg bg-surface-card dark:bg-slate-800 text-text-muted dark:text-slate-300 hover:text-primary dark:hover:text-blue-400 border border-border-ui dark:border-slate-700/80 flex items-center justify-center transition-colors shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      title="Pekan Selanjutnya"
      aria-label="Pekan Selanjutnya"
    >
      <span class="material-symbols-outlined text-[18px]">chevron_right</span>
    </button>
  </div>
</template>
