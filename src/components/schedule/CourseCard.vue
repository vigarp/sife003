<script setup>
import { computed } from "vue";
import { useSchedule } from "@/composables/useSchedule";
import { useLastVisited } from "@/composables/useLastVisited";

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

const { getLmsUrl, getPresensiUrl } = useSchedule();
const { setVisited, isVisited } = useLastVisited();

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
</script>

<template>
  <div
    class="matkul-card p-3.5 rounded-xl bg-surface dark:bg-slate-800/70 border border-border-ui dark:border-slate-700/60 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
    :class="{ 'card-last-visited': isCardVisited }"
  >
    <!-- Left: Matkul Info -->
    <div class="flex flex-col gap-1.5 flex-1 min-w-0">
      <div class="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Time Badge (Luring) -->
          <span
            v-if="isLuring && jam"
            class="shrink-0 px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 dark:bg-blue-950/70 text-primary dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 flex items-center gap-1"
          >
            <span class="material-symbols-outlined text-[14px]">schedule</span>
            <span>{{ jam }}</span>
          </span>

          <!-- Pertemuan / Ujian Badge -->
          <span
            v-if="item.pertemuan && item.pertemuan.length > 0"
            class="shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold"
            :class="
              isLuring
                ? 'bg-blue-50 dark:bg-blue-950/80 text-primary dark:text-blue-300 border border-blue-200 dark:border-blue-800/70'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200/90 border border-gold-border dark:border-amber-800/40'
            "
          >
            Pertemuan {{ pNum }}
          </span>
          <span
            v-else
            class="shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1"
            :class="
              isLuring
                ? 'bg-blue-50 dark:bg-blue-950/80 text-primary dark:text-blue-300 border border-blue-200 dark:border-blue-800/70'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200/90 border border-amber-200 dark:border-amber-800/40'
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
            class="text-xs font-semibold text-text-subtle dark:text-slate-400 px-2 py-0.5 rounded bg-surface-card dark:bg-slate-900 border border-border-ui dark:border-slate-700 shrink-0"
          >
            {{ master.sks }} SKS
          </span>
        </div>
      </div>

      <!-- Course Title -->
      <h5 class="text-sm font-semibold text-text-main dark:text-slate-100 leading-snug">
        {{ item.mata_kuliah }}
      </h5>

      <!-- Lecturer & Course Code -->
      <div class="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-xs text-text-muted dark:text-slate-400">
        <span class="flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px] text-text-subtle dark:text-slate-500">person</span>
          <span>{{ master?.dosen || 'Dosen Pengampu' }}</span>
        </span>
        <template v-if="master?.kode">
          <span class="text-text-subtle dark:text-slate-600">•</span>
          <span class="font-mono text-[11px] text-text-subtle dark:text-slate-400">{{ master.kode }}</span>
        </template>
      </div>
    </div>

    <!-- Right: Desktop SKS & Action Buttons -->
    <div
      class="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-ui/60 dark:border-slate-800"
    >
      <div class="hidden sm:block" v-if="master?.sks">
        <span
          class="text-xs font-semibold text-text-subtle dark:text-slate-400 px-2 py-0.5 rounded bg-surface-card dark:bg-slate-900 border border-border-ui dark:border-slate-700 shrink-0"
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
          :class="[
            'action-link-btn btn-mentari inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer',
            'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200/90 border border-gold-border dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-950/60 dark:hover:border-amber-700/60',
            { 'btn-last-visited': isMentariVisited },
          ]"
          :title="`Buka ${item.mata_kuliah} ${pNum ? 'Pertemuan ' + pNum : ''} di LMS Mentari${isMentariVisited ? ' • Terakhir Dikunjungi' : ''}`"
        >
          <span class="text-[12px]">🌞</span>
          <span>Mentari</span>
          <span class="material-symbols-outlined text-[13px] text-amber-700 dark:text-amber-300/70">open_in_new</span>
        </a>

        <!-- Cek Presensi Link Button (Online & Offline) -->
        <a
          v-if="master"
          :href="presensiUrl"
          target="_blank"
          rel="noopener noreferrer"
          @click="setVisited(presensiBtnKey)"
          :data-btn-key="presensiBtnKey"
          :class="[
            'action-link-btn btn-presensi inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer',
            'bg-surface-card dark:bg-slate-900 text-text-main dark:text-slate-200 border border-border-ui dark:border-slate-700 hover:text-primary dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700',
            { 'btn-last-visited': isPresensiVisited },
          ]"
          :title="`Cek Presensi ${item.mata_kuliah} di MyUNPAM${isPresensiVisited ? ' • Terakhir Dikunjungi' : ''}`"
        >
          <span class="material-symbols-outlined text-[14px] text-primary dark:text-blue-400">how_to_reg</span>
          <span>Cek Presensi</span>
          <span class="material-symbols-outlined text-[13px] text-text-subtle dark:text-slate-500">open_in_new</span>
        </a>
      </div>
    </div>
  </div>
</template>
