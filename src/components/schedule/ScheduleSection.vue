<script setup>
import { computed } from "vue";
import { useSchedule } from "@/composables/useSchedule";
import WeekNavigator from "./WeekNavigator.vue";
import CourseCard from "./CourseCard.vue";

const {
  currentWeek,
  viewedWeekIndex,
  isCurrentWeek,
  isPastWeek,
  isFutureWeek,
  activeWeekStatus,
  partitionDaring,
  partitionLuring,
} = useSchedule();

const daringData = computed(() =>
  partitionDaring(currentWeek.value, viewedWeekIndex.value)
);

const luringData = computed(() =>
  partitionLuring(currentWeek.value)
);

const daringCount = computed(() => currentWeek.value?.daring?.length || 0);
const luringCount = computed(() => currentWeek.value?.luring?.length || 0);
</script>

<template>
  <section class="w-full mb-space-xl scroll-mt-20" id="jadwal">
    <!-- Header with Title & Week Navigator -->
    <div
      class="flex flex-col sm:flex-row sm:items-end justify-between mb-4 sm:mb-6 gap-4"
    >
      <div>
        <h2
          class="text-2xl font-bold text-primary-navy dark:text-slate-100 flex items-center gap-2"
        >
          Agenda Pekan Perkuliahan
        </h2>
      </div>

      <!-- Quick Pekan Navigator Controls -->
      <WeekNavigator />
    </div>

    <!-- Active Week Status Banner -->
    <div
      class="mb-4 p-3 sm:px-4 sm:py-3 rounded-xl bg-surface-card dark:bg-slate-900 border border-border-ui dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 transition-colors"
    >
      <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
        <!-- Week Status Badge -->
        <span
          v-if="isCurrentWeek && activeWeekStatus === 'upcoming'"
          class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 shadow-2xs"
        >
          <span class="relative flex h-2 w-2">
            <span
              class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"
            ></span>
          </span>
          <span>Pekan Mendatang (Upcoming)</span>
        </span>
        <span
          v-else-if="isCurrentWeek"
          class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-2xs"
        >
          <span class="relative flex h-2 w-2">
            <span
              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
            ></span>
            <span
              class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"
            ></span>
          </span>
          <span>Pekan Berjalan (Ongoing)</span>
        </span>
        <span
          v-else-if="isPastWeek"
          class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-text-muted dark:text-slate-300 border border-border-ui dark:border-slate-700"
        >
          <span class="material-symbols-outlined text-[13px]">history</span>
          <span>Pekan Lalu</span>
        </span>
        <span
          v-else
          class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-primary dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"
        >
          <span class="material-symbols-outlined text-[13px]">schedule</span>
          <span>Pekan Mendatang</span>
        </span>

        <!-- Week Title Heading -->
        <h3 class="text-sm sm:text-base font-bold text-text-main dark:text-slate-100">
          Pekan {{ currentWeek?.pekan }} ({{ currentWeek?.tanggal_daring }})
        </h3>
      </div>

      <div class="flex items-center gap-2 text-xs text-text-subtle dark:text-slate-400">
        <span class="hidden md:inline">Semester Ganjil 2026/2027</span>
      </div>
    </div>

    <!-- Dual Column Schedule Layout (Mentari vs Tatap Muka) -->
    <div
      class="bg-surface-card dark:bg-slate-900 rounded-2xl border border-border-ui dark:border-slate-800 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border-ui dark:divide-slate-800 transition-colors"
    >
      <!-- Column 1: Mentari (Online) -->
      <div class="p-5 md:p-6 flex flex-col justify-between">
        <div>
          <!-- Subhead -->
          <div
            class="flex items-center justify-between pb-4 mb-4 border-b border-border-ui dark:border-slate-800"
          >
            <div class="flex items-center gap-2.5">
              <div
                class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-gold-border dark:border-amber-800/40 flex items-center justify-center text-accent-gold dark:text-amber-200/90"
              >
                <span class="material-symbols-outlined text-[20px]">wb_sunny</span>
              </div>
              <div>
                <h4
                  class="text-sm font-bold text-text-main dark:text-slate-100 flex items-center gap-1.5"
                >
                  <span>🌞</span>
                  <span>Mentari (Online)</span>
                </h4>
                <p class="text-xs text-text-muted dark:text-slate-400">
                  {{ currentWeek?.tanggal_daring }}
                </p>
              </div>
            </div>
            <span
              class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200/90 border border-amber-200 dark:border-amber-800/40 text-[11px] font-bold"
            >
              {{ daringCount }} Matkul
            </span>
          </div>

          <!-- Daring Items List -->
          <div class="space-y-4">
            <!-- Empty state -->
            <div
              v-if="daringCount === 0"
              class="p-4 rounded-xl bg-surface dark:bg-slate-800/40 text-center text-xs text-text-muted dark:text-slate-400 border border-border-ui dark:border-slate-800"
            >
              Tidak ada agenda online Mentari pada pekan ini.
            </div>

            <!-- Other items (e.g. UTS / UAS aggregate) -->
            <div v-if="daringData.other.length > 0" class="space-y-2.5">
              <CourseCard
                v-for="(entry, oIdx) in daringData.other"
                :key="'other-' + oIdx"
                :item="entry.item"
                :master="entry.master"
                :is-luring="false"
                :week-index="viewedWeekIndex"
              />
            </div>

            <!-- Kelompok 1 (Mentari) -->
            <div v-if="daringData.k1.length > 0" class="flex flex-col gap-2.5">
              <div
                class="flex items-center justify-between pb-1.5 pt-0.5 border-b border-border-ui/80 dark:border-slate-800"
              >
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-500 dark:bg-amber-400/80"></span>
                  <span class="text-xs font-bold text-amber-900 dark:text-amber-200/90"
                    >Kelompok 1</span
                  >
                  <span class="text-[11px] font-medium text-text-subtle dark:text-slate-400"
                    >({{ daringData.k1Label }})</span
                  >
                </div>
                <span
                  class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200/90 border border-gold-border dark:border-amber-800/40"
                >
                  {{ daringData.k1.length }} Matkul
                </span>
              </div>
              <div class="space-y-2.5">
                <CourseCard
                  v-for="(entry, k1Idx) in daringData.k1"
                  :key="'k1-' + k1Idx"
                  :item="entry.item"
                  :master="entry.master"
                  :is-luring="false"
                  :week-index="viewedWeekIndex"
                />
              </div>
            </div>

            <!-- Kelompok 2 (Mentari) -->
            <div v-if="daringData.k2.length > 0" class="flex flex-col gap-2.5 pt-2">
              <div
                class="flex items-center justify-between pb-1.5 pt-0.5 border-b border-border-ui/80 dark:border-slate-800"
              >
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="w-2.5 h-2.5 rounded-full bg-yellow-500 dark:bg-amber-400/70"></span>
                  <span class="text-xs font-bold text-yellow-900 dark:text-amber-200/90"
                    >Kelompok 2</span
                  >
                  <span class="text-[11px] font-medium text-text-subtle dark:text-slate-400"
                    >({{ daringData.k2Label }})</span
                  >
                </div>
                <span
                  class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-50 dark:bg-amber-950/30 text-yellow-900 dark:text-amber-200/90 border border-yellow-200 dark:border-amber-800/40"
                >
                  {{ daringData.k2.length }} Matkul
                </span>
              </div>
              <div class="space-y-2.5">
                <CourseCard
                  v-for="(entry, k2Idx) in daringData.k2"
                  :key="'k2-' + k2Idx"
                  :item="entry.item"
                  :master="entry.master"
                  :is-luring="false"
                  :week-index="viewedWeekIndex"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Column 2: Tatap Muka di Kelas -->
      <div
        class="p-5 md:p-6 flex flex-col justify-between bg-surface-alt/40 dark:bg-slate-900/40"
      >
        <div>
          <!-- Subhead -->
          <div
            class="flex items-center justify-between pb-4 mb-4 border-b border-border-ui dark:border-slate-800"
          >
            <div class="flex items-center gap-2.5">
              <div
                class="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-primary dark:text-blue-400"
              >
                <span class="material-symbols-outlined text-[20px]">school</span>
              </div>
              <div>
                <h4
                  class="text-sm font-bold text-text-main dark:text-slate-100 flex items-center gap-1.5"
                >
                  <span>🏫</span>
                  <span>Tatap Muka di Kelas</span>
                </h4>
                <p class="text-xs text-text-muted dark:text-slate-400">
                  Sabtu, {{ currentWeek?.tanggal_luring }}
                </p>
              </div>
            </div>
            <span
              class="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-primary dark:text-blue-300 text-[11px] font-bold"
            >
              {{ luringCount }} Sesi
            </span>
          </div>

          <!-- Luring Items List -->
          <div class="space-y-4">
            <!-- Empty state -->
            <div
              v-if="luringCount === 0"
              class="p-4 rounded-xl bg-surface dark:bg-slate-800/40 text-center text-xs text-text-muted dark:text-slate-400 border border-border-ui dark:border-slate-800"
            >
              Tidak ada perkuliahan tatap muka pada pekan ini.
            </div>

            <!-- Other items (e.g. UTS / UAS aggregate) -->
            <div v-if="luringData.other.length > 0" class="space-y-2.5">
              <CourseCard
                v-for="(entry, oIdx) in luringData.other"
                :key="'luring-other-' + oIdx"
                :item="entry.item"
                :master="entry.master"
                :is-luring="true"
                :week-index="viewedWeekIndex"
              />
            </div>

            <!-- Kelompok 1 (Tatap Muka) -->
            <div v-if="luringData.k1.length > 0" class="flex flex-col gap-2.5">
              <div
                class="flex items-center justify-between pb-1.5 pt-0.5 border-b border-border-ui/80 dark:border-slate-800"
              >
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span class="text-xs font-bold text-primary dark:text-blue-300"
                    >Kelompok 1</span
                  >
                  <span class="text-[11px] font-medium text-text-subtle dark:text-slate-400"
                    >(Tatap Muka di Kelas)</span
                  >
                </div>
                <span
                  class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-primary dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"
                >
                  {{ luringData.k1.length }} Sesi
                </span>
              </div>
              <div class="space-y-2.5">
                <CourseCard
                  v-for="(entry, k1Idx) in luringData.k1"
                  :key="'luring-k1-' + k1Idx"
                  :item="entry.item"
                  :master="entry.master"
                  :is-luring="true"
                  :week-index="viewedWeekIndex"
                />
              </div>
            </div>

            <!-- Kelompok 2 (Tatap Muka) -->
            <div v-if="luringData.k2.length > 0" class="flex flex-col gap-2.5 pt-2">
              <div
                class="flex items-center justify-between pb-1.5 pt-0.5 border-b border-border-ui/80 dark:border-slate-800"
              >
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  <span class="text-xs font-bold text-indigo-700 dark:text-indigo-300"
                    >Kelompok 2</span
                  >
                  <span class="text-[11px] font-medium text-text-subtle dark:text-slate-400"
                    >(Tatap Muka di Kelas)</span
                  >
                </div>
                <span
                  class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
                >
                  {{ luringData.k2.length }} Sesi
                </span>
              </div>
              <div class="space-y-2.5">
                <CourseCard
                  v-for="(entry, k2Idx) in luringData.k2"
                  :key="'luring-k2-' + k2Idx"
                  :item="entry.item"
                  :master="entry.master"
                  :is-luring="true"
                  :week-index="viewedWeekIndex"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
