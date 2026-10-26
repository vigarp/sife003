<script setup>
import { ref, computed } from "vue";
import { useTelemetri } from "@/composables/useTelemetri";

const { classStats, isForumOpen, formatWhatsAppSummary } = useTelemetri();

const searchQuery = ref("");
const statusFilter = ref("all"); // 'all' | 'needs_reminder' | 'eligible'
const isCopied = ref(false);

const filteredStudents = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return classStats.value.students.filter((s) => {
    // Filter by query
    const matchQuery =
      !query ||
      s.nama.toLowerCase().includes(query) ||
      s.nim.toLowerCase().includes(query);

    // Filter by status tab
    let matchStatus = true;
    if (statusFilter.value === "needs_reminder") {
      matchStatus = s.status === "partial" || s.status === "none";
    } else if (statusFilter.value === "eligible") {
      matchStatus = s.status === "eligible";
    }

    return matchQuery && matchStatus;
  });
});

async function copyWhatsAppText() {
  const text = formatWhatsAppSummary();
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const input = document.createElement("textarea");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2500);
  } catch (err) {
    console.error("Gagal menyalin format WA:", err);
  }
}
</script>

<template>
  <div
    v-if="isForumOpen && classStats.totalStudents > 0"
    class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-xs space-y-5"
  >
    <!-- Section Header & WhatsApp Copy Button -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
      <div>
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-[20px]">groups</span>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">
            Radar Keaktifan Kelas (03SIFE003)
          </h2>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Monitoring pemenuhan syarat minimal 2x balasan forum per mahasiswa
        </p>
      </div>

      <button
        type="button"
        @click="copyWhatsAppText"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer border active:scale-95 shrink-0"
        :class="
          isCopied
            ? 'bg-emerald-600 text-white border-emerald-600'
            : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900'
        "
        :title="isCopied ? 'Tersalin ke clipboard!' : 'Salin format reminder WA'"
      >
        <span class="material-symbols-outlined text-[16px]">
          {{ isCopied ? 'done_all' : 'share' }}
        </span>
        <span>{{ isCopied ? 'Format WA Tersalin!' : 'Salin Rekap untuk WA' }}</span>
      </button>
    </div>

    <!-- Progress Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <!-- Total Progress Card -->
      <div class="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-1">
        <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Persentase Kelas</span>
        <div class="text-2xl font-black text-indigo-950 dark:text-indigo-200">
          {{ classStats.percentage }}%
        </div>
        <p class="text-[11px] text-indigo-800 dark:text-indigo-300/80">
          {{ classStats.eligibleCount }} dari {{ classStats.totalStudents }} mahasiswa
        </p>
      </div>

      <!-- Eligible Card -->
      <div class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-1">
        <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Lengkap (>= 2x)</span>
        <div class="text-2xl font-black text-emerald-950 dark:text-emerald-200">
          {{ classStats.eligibleCount }}
        </div>
        <p class="text-[11px] text-emerald-800 dark:text-emerald-300/80">
          Memenuhi syarat presensi
        </p>
      </div>

      <!-- Partial Card -->
      <div class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-1">
        <span class="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Kurang 1x Reply</span>
        <div class="text-2xl font-black text-amber-950 dark:text-amber-200">
          {{ classStats.partialCount }}
        </div>
        <p class="text-[11px] text-amber-800 dark:text-amber-300/80">
          Perlu 1 reply lagi
        </p>
      </div>

      <!-- None Card -->
      <div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 space-y-1">
        <span class="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Belum Reply</span>
        <div class="text-2xl font-black text-rose-950 dark:text-rose-200">
          {{ classStats.noneCount }}
        </div>
        <p class="text-[11px] text-rose-800 dark:text-rose-300/80">
          Belum berpartisipasi
        </p>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
      <!-- Status Tabs -->
      <div class="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs shrink-0 overflow-x-auto">
        <button
          type="button"
          @click="statusFilter = 'all'"
          class="px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap"
          :class="
            statusFilter === 'all'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          "
        >
          Semua ({{ classStats.totalStudents }})
        </button>
        <button
          type="button"
          @click="statusFilter = 'needs_reminder'"
          class="px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1"
          :class="
            statusFilter === 'needs_reminder'
              ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          "
        >
          <span>Perlu Diingatkan</span>
          <span class="px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-[10px] font-bold">
            {{ classStats.partialCount + classStats.noneCount }}
          </span>
        </button>
        <button
          type="button"
          @click="statusFilter = 'eligible'"
          class="px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap"
          :class="
            statusFilter === 'eligible'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          "
        >
          Lengkap ({{ classStats.eligibleCount }})
        </button>
      </div>

      <!-- Search Input -->
      <div class="relative flex-1 sm:max-w-xs">
        <label for="search-student" class="sr-only">Cari nama atau NIM mahasiswa</label>
        <span class="material-symbols-outlined text-[17px] text-slate-400 absolute left-3 top-2.5">
          search
        </span>
        <input
          id="search-student"
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama atau NIM..."
          aria-label="Cari nama atau NIM mahasiswa"
          class="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
        />
      </div>
    </div>

    <!-- Student Table -->
    <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table class="w-full text-left text-xs border-collapse">
        <thead class="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th class="py-2.5 px-3 w-12 text-center">No</th>
            <th class="py-2.5 px-3">Nama Mahasiswa</th>
            <th class="py-2.5 px-3 font-mono">NIM</th>
            <th class="py-2.5 px-3">Rincian Topik</th>
            <th class="py-2.5 px-3 text-center">Total Reply</th>
            <th class="py-2.5 px-3 text-center">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-800 dark:text-slate-200">
          <tr
            v-for="(s, idx) in filteredStudents"
            :key="s.nim"
            class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
          >
            <td class="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{{ idx + 1 }}</td>
            <td class="py-2 px-3 font-bold text-slate-900 dark:text-white">{{ s.nama }}</td>
            <td class="py-2 px-3 font-mono text-slate-500 text-[11px]">{{ s.nim }}</td>
            <td class="py-2 px-3">
              <div v-if="Object.keys(s.breakdown).length > 0" class="flex items-center gap-1.5 flex-wrap">
                <span
                  v-for="(count, topic) in s.breakdown"
                  :key="topic"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  <span class="truncate max-w-[90px]">{{ topic }}:</span>
                  <strong class="text-indigo-600 dark:text-indigo-400">{{ count }}x</strong>
                </span>
              </div>
              <span v-else class="text-slate-400 text-[11px] italic">-</span>
            </td>
            <td class="py-2 px-3 text-center font-bold text-sm">
              <span
                :class="
                  s.status === 'eligible'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : s.status === 'partial'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-400'
                "
              >
                {{ s.totalReplies }}x
              </span>
            </td>
            <td class="py-2 px-3 text-center">
              <span
                v-if="s.status === 'eligible'"
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold border border-emerald-300 dark:border-emerald-800"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Aman</span>
              </span>
              <span
                v-else-if="s.status === 'partial'"
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold border border-amber-300 dark:border-amber-800"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Kurang 1x</span>
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 text-[10px] font-extrabold border border-rose-300 dark:border-rose-800"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>Belum</span>
              </span>
            </td>
          </tr>

          <tr v-if="filteredStudents.length === 0">
            <td colspan="6" class="py-8 text-center text-slate-400 text-xs italic">
              Tidak ada data mahasiswa yang sesuai dengan filter atau pencarian.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

