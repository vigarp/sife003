<script setup>
import { ref, computed } from "vue";
import { useSchedule } from "@/composables/useSchedule";
import { useAdminAuth } from "@/composables/useAdminAuth";
import { formatMentariShareText, copyToClipboard } from "@/utils/scheduleShare";
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

const { isAdmin } = useAdminAuth();
const copiedMentari = ref(false);

async function handleCopyMentari() {
  const text = formatMentariShareText(currentWeek.value, viewedWeekIndex.value);
  const ok = await copyToClipboard(text);
  if (ok) {
    copiedMentari.value = true;
    setTimeout(() => {
      copiedMentari.value = false;
    }, 2000);
  }
}

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
  <section class="w-full mb-6 scroll-mt-20" id="jadwal">
    <!-- Header with Title & Week Navigator -->
    <div
      class="flex flex-col sm:flex-row sm:items-end justify-between mb-3 gap-3"
    >
      <div>
        <h2 class="mk-section-title">
          Jadwal Perkuliahan
        </h2>
      </div>

      <!-- Quick Pekan Navigator Controls -->
      <WeekNavigator />
    </div>

    <!-- Active Week Status Banner -->
    <div
      class="mb-4 px-4 py-2.5 mk-card flex flex-wrap items-center justify-between gap-2.5 transition-colors"
    >
      <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
        <!-- Week Status Badge -->
        <span
          v-if="isCurrentWeek && activeWeekStatus === 'upcoming'"
          class="mk-badge mk-badge-warn"
        >
          Pekan Mendatang (Upcoming)
        </span>
        <span
          v-else-if="isCurrentWeek"
          class="mk-badge mk-badge-ok"
        >
          Pekan Berjalan (Ongoing)
        </span>
        <span
          v-else-if="isPastWeek"
          class="mk-badge bg-[var(--hover)] text-[var(--muted)] gap-1"
        >
          <span class="material-symbols-outlined text-[13px]">history</span>
          <span>Pekan Lalu</span>
        </span>
        <span
          v-else
          class="mk-badge bg-[var(--accent-soft)] text-[var(--accent)] gap-1"
        >
          <span class="material-symbols-outlined text-[13px]">schedule</span>
          <span>Pekan Mendatang</span>
        </span>

        <!-- Week Title Heading -->
        <h3 class="text-sm font-semibold text-[var(--text)]">
          Pekan {{ currentWeek?.pekan }} ({{ currentWeek?.tanggal_daring }})
        </h3>
      </div>

      <div class="flex items-center gap-2 text-xs text-[var(--muted)]">
        <span class="hidden md:inline">Semester Ganjil 2026/2027</span>
      </div>
    </div>

    <!-- Dual Column Schedule Layout (Mentari vs Tatap Muka) -->
    <div
      class="mk-card overflow-hidden grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)] transition-colors"
    >
      <!-- Column 1: Mentari (Online) -->
      <div class="p-4 sm:p-5 flex flex-col justify-between">
        <div>
          <!-- Subhead -->
          <div
            class="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border)]"
          >
            <div>
              <h4 class="mk-section-title flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[15px] text-amber-600 dark:text-amber-400">wb_sunny</span>
                <span>Mentari (Online)</span>
              </h4>
              <p class="text-xs text-[var(--muted)] mt-0.5">
                {{ currentWeek?.tanggal_daring }}
              </p>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="mk-badge mk-badge-warn tabular-nums">
                {{ daringCount }} Matkul
              </span>
              <button
                v-if="isAdmin"
                type="button"
                @click="handleCopyMentari"
                class="inline-flex items-center gap-1 px-2 py-1 mk-btn cursor-pointer"
                :class="
                  copiedMentari
                    ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300'
                    : ''
                "
                :title="copiedMentari ? 'Tersalin ke clipboard!' : 'Salin format jadwal Mentari pekan ini'"
                :aria-label="copiedMentari ? 'Jadwal Mentari tersalin' : 'Salin jadwal Mentari pekan ini'"
              >
                <svg aria-hidden="true" v-if="copiedMentari" class="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <svg aria-hidden="true" v-else class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <span>{{ copiedMentari ? 'Tersalin' : 'Salin' }}</span>
              </button>
            </div>
          </div>

          <!-- Daring Items List -->
          <div class="space-y-3.5">
            <!-- Empty state -->
            <div
              v-if="daringCount === 0"
              class="p-4 rounded-[8px] bg-[var(--bg)] text-center text-xs text-[var(--muted)] border border-[var(--border)]"
            >
              Tidak ada agenda online Mentari pada pekan ini.
            </div>

            <!-- Other items (e.g. UTS / UAS aggregate) -->
            <div v-if="daringData.other.length > 0" class="space-y-2">
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
            <div v-if="daringData.k1.length > 0" class="flex flex-col gap-2">
              <div
                class="flex items-center justify-between gap-2 pb-1.5 border-b border-dashed border-[var(--border)]"
              >
                <span class="text-xs font-semibold text-[var(--text)]"
                  >Kelompok 1</span
                >
                <span class="text-[11px] text-[var(--muted)] text-right"
                  >{{ daringData.k1Label }}</span
                >
              </div>
              <div class="space-y-2">
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
            <div v-if="daringData.k2.length > 0" class="flex flex-col gap-2 pt-1">
              <div
                class="flex items-center justify-between gap-2 pb-1.5 border-b border-dashed border-[var(--border)]"
              >
                <span class="text-xs font-semibold text-[var(--text)]"
                  >Kelompok 2</span
                >
                <span class="text-[11px] text-[var(--muted)] text-right"
                  >{{ daringData.k2Label }}</span
                >
              </div>
              <div class="space-y-2">
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
        class="p-4 sm:p-5 flex flex-col justify-between bg-[var(--surface)]"
      >
        <div>
          <!-- Subhead -->
          <div
            class="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border)]"
          >
            <div>
              <h4 class="mk-section-title flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[15px] text-[var(--accent)]">school</span>
                <span>Tatap Muka di Kelas</span>
              </h4>
              <p class="text-xs text-[var(--muted)] mt-0.5">
                Sabtu, {{ currentWeek?.tanggal_luring }}
              </p>
            </div>
            <span class="mk-badge bg-[var(--accent-soft)] text-[var(--accent)] tabular-nums">
              {{ luringCount }} Sesi
            </span>
          </div>

          <!-- Luring Items List -->
          <div class="space-y-3.5">
            <!-- Empty state -->
            <div
              v-if="luringCount === 0"
              class="p-4 rounded-[8px] bg-[var(--bg)] text-center text-xs text-[var(--muted)] border border-[var(--border)]"
            >
              Tidak ada perkuliahan tatap muka pada pekan ini.
            </div>

            <!-- Other items (e.g. UTS / UAS aggregate) -->
            <div v-if="luringData.other.length > 0" class="space-y-2">
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
            <div v-if="luringData.k1.length > 0" class="flex flex-col gap-2">
              <div
                class="flex items-center justify-between gap-2 pb-1.5 border-b border-dashed border-[var(--border)]"
              >
                <span class="text-xs font-semibold text-[var(--text)]"
                  >Kelompok 1</span
                >
                <span class="text-[11px] text-[var(--muted)] text-right"
                  >Tatap Muka di Kelas</span
                >
              </div>
              <div class="space-y-2">
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
            <div v-if="luringData.k2.length > 0" class="flex flex-col gap-2 pt-1">
              <div
                class="flex items-center justify-between gap-2 pb-1.5 border-b border-dashed border-[var(--border)]"
              >
                <span class="text-xs font-semibold text-[var(--text)]"
                  >Kelompok 2</span
                >
                <span class="text-[11px] text-[var(--muted)] text-right"
                  >Tatap Muka di Kelas</span
                >
              </div>
              <div class="space-y-2">
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
