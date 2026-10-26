<script setup>
import { useTelemetri } from "@/composables/useTelemetri";

const emit = defineEmits(["scan", "open-token-modal", "copy-script", "paste-snapshot"]);

const {
  courses,
  selectedCourseKode,
  selectedPertemuanNum,
  scanning,
  hasToken,
  scanForum,
  loadCourses,
} = useTelemetri();

function handleScan() {
  if (!hasToken.value) {
    emit("open-token-modal");
    return;
  }
  scanForum(selectedCourseKode.value, selectedPertemuanNum.value);
}
</script>

<template>
  <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
    <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
      <!-- Course Selector -->
      <div class="sm:col-span-6 space-y-1">
        <label for="select-course" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Target Mata Kuliah (03SIFE003)
        </label>
        <div class="relative">
          <select
            id="select-course"
            v-model="selectedCourseKode"
            class="w-full appearance-none truncate bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-semibold rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
          >
            <option v-if="courses.length === 0" value="" disabled>
              {{ hasToken ? 'Memuat mata kuliah...' : '-- Belum ada mata kuliah (Atur Token) --' }}
            </option>
            <option
              v-for="c in courses"
              :key="c.kode_course"
              :value="c.kode_course"
            >
              {{ c.coursename || c.nama_mata_kuliah }}
            </option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
            <span class="material-symbols-outlined text-[18px]">unfold_more</span>
          </div>
        </div>
      </div>

      <!-- Pertemuan Selector -->
      <div class="sm:col-span-3 space-y-1">
        <label for="select-pertemuan" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Sesi Pertemuan
        </label>
        <div class="relative">
          <select
            id="select-pertemuan"
            v-model="selectedPertemuanNum"
            class="w-full appearance-none bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-semibold rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
          >
            <option v-for="p in 14" :key="p" :value="p">
              Pertemuan {{ p }}
            </option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
            <span class="material-symbols-outlined text-[18px]">unfold_more</span>
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <div class="sm:col-span-3">
        <button
          type="button"
          @click="handleScan"
          :disabled="scanning"
          class="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98"
        >
          <span
            v-if="scanning"
            class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
          ></span>
          <span v-else class="material-symbols-outlined text-[18px]">radar</span>
          <span>{{ scanning ? 'Memindai...' : 'Pindai Telemetri' }}</span>
        </button>
      </div>
    </div>

    <!-- Quick Browser Scanner Sub-Bar (Cloudflare Bypass) -->
    <div class="flex flex-wrap items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] gap-2">
      <div class="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <span class="material-symbols-outlined text-[15px] text-amber-500">bolt</span>
        <span>Kena blokir Cloudflare di Vercel? Gunakan Mode Script Browser:</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="$emit('copy-script')"
          class="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
        >
          <span class="material-symbols-outlined text-[14px]">content_copy</span>
          <span>Salin Script Scanner</span>
        </button>
        <span class="text-slate-300 dark:text-slate-700">•</span>
        <button
          type="button"
          @click="$emit('paste-snapshot')"
          class="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
        >
          <span class="material-symbols-outlined text-[14px]">content_paste</span>
          <span>Tempel Data Scan</span>
        </button>
      </div>
    </div>
  </div>
</template>

