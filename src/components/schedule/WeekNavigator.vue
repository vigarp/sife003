<script setup>
import { useSchedule } from "@/composables/useSchedule";

const {
  allWeeks,
  activeWeekIndex,
  activeWeekStatus,
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
  <div class="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
    <!-- Reset to Active Week Button (shown when viewing non-current week) -->
    <button
      v-if="!isCurrentWeek"
      type="button"
      @click="resetToCurrentWeek"
      class="shrink-0 px-2.5 py-1.5 rounded-md border border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
      title="Kembali ke Pekan Sedang Berjalan"
    >
      <span class="material-symbols-outlined text-[15px] text-[var(--accent)]">today</span>
      <span class="hidden min-[380px]:inline sm:inline">Pekan Ini</span>
    </button>

    <!-- Prev Week Button -->
    <button
      type="button"
      @click="prevWeek"
      :disabled="viewedWeekIndex === 0"
      class="shrink-0 w-8 h-8 rounded-md bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      title="Pekan Sebelumnya"
      aria-label="Pekan Sebelumnya"
    >
      <span class="material-symbols-outlined text-[18px]">chevron_left</span>
    </button>

    <!-- Week Select Dropdown -->
    <div class="relative flex-1 min-w-0 sm:w-72 sm:flex-initial">
      <select
        :value="viewedWeekIndex"
        @change="(e) => setWeek(parseInt(e.target.value, 10))"
        class="w-full appearance-none truncate bg-[var(--surface)] text-[var(--text)] text-xs font-medium rounded-md border border-[var(--border)] hover:border-[var(--accent)] pl-2.5 sm:pl-3 py-1.5 pr-7 sm:pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
        aria-label="Pilih Pekan Kuliah"
      >
        <option
          v-for="(pekan, idx) in allWeeks"
          :key="idx"
          :value="idx"
        >
          Pekan {{ pekan.pekan }} ({{ pekan.tanggal_daring }}){{ idx === activeWeekIndex ? (activeWeekStatus === 'upcoming' ? ' • Upcoming' : ' • Aktif') : '' }}
        </option>
      </select>
      <div
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 sm:px-2 text-[var(--muted)]"
      >
        <span class="material-symbols-outlined text-[18px]">unfold_more</span>
      </div>
    </div>

    <!-- Next Week Button -->
    <button
      type="button"
      @click="nextWeek"
      :disabled="viewedWeekIndex === allWeeks.length - 1"
      class="shrink-0 w-8 h-8 rounded-md bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      title="Pekan Selanjutnya"
      aria-label="Pekan Selanjutnya"
    >
      <span class="material-symbols-outlined text-[18px]">chevron_right</span>
    </button>
  </div>
</template>
