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
  if (!navigator?.clipboard?.writeText) return;
  const text = formatWhatsAppSummary();
  try {
    await navigator.clipboard.writeText(text);
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
    class="mk-card p-3 sm:p-4 space-y-3.5"
  >
    <!-- Section Header & WhatsApp Copy Button -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[var(--border)]">
      <div>
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[var(--accent)] text-[18px]">groups</span>
          <h2 class="text-sm font-semibold text-[var(--text)]">
            Radar Keaktifan Kelas (03SIFE003)
          </h2>
        </div>
        <p class="text-xs text-[var(--muted)] mt-0.5">
          Monitoring pemenuhan syarat minimal 2x balasan forum per mahasiswa
        </p>
      </div>

      <button
        type="button"
        @click="copyWhatsAppText"
        class="mk-btn shrink-0"
        :class="
          isCopied
            ? '!bg-emerald-600 !text-white !border-emerald-600'
            : '!border-emerald-500/40 !text-emerald-700 dark:!text-emerald-300'
        "
        :title="isCopied ? 'Tersalin ke clipboard!' : 'Salin format reminder WA'"
      >
        <span class="material-symbols-outlined text-[15px]">
          {{ isCopied ? 'done_all' : 'share' }}
        </span>
        <span>{{ isCopied ? 'Format WA Tersalin!' : 'Salin Rekap untuk WA' }}</span>
      </button>
    </div>

    <!-- Progress Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <!-- Total Progress Card -->
      <div class="p-3 rounded-[8px] bg-[var(--bg)] border border-[var(--border)] space-y-1">
        <span class="mk-section-title !text-[10px]">Persentase Kelas</span>
        <div class="text-2xl font-semibold text-[var(--text)] tabular-nums">
          {{ classStats.percentage }}%
        </div>
        <p class="text-[11px] text-[var(--muted)] tabular-nums">
          {{ classStats.eligibleCount }} dari {{ classStats.totalStudents }} mahasiswa
        </p>
      </div>

      <!-- Eligible Card -->
      <div class="p-3 rounded-[8px] bg-[var(--bg)] border border-emerald-500/35 space-y-1">
        <span class="mk-section-title !text-[10px] !text-emerald-700 dark:!text-emerald-400">Lengkap (>= 2x)</span>
        <div class="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
          {{ classStats.eligibleCount }}
        </div>
        <p class="text-[11px] text-[var(--muted)]">
          Memenuhi syarat presensi
        </p>
      </div>

      <!-- Partial Card -->
      <div class="p-3 rounded-[8px] bg-[var(--bg)] border border-amber-500/35 space-y-1">
        <span class="mk-section-title !text-[10px] !text-amber-700 dark:!text-amber-400">Kurang 1x Reply</span>
        <div class="text-2xl font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
          {{ classStats.partialCount }}
        </div>
        <p class="text-[11px] text-[var(--muted)]">
          Perlu 1 reply lagi
        </p>
      </div>

      <!-- None Card -->
      <div class="p-3 rounded-[8px] bg-[var(--bg)] border border-red-500/35 space-y-1">
        <span class="mk-section-title !text-[10px] !text-red-700 dark:!text-red-400">Belum Reply</span>
        <div class="text-2xl font-semibold text-red-600 dark:text-red-400 tabular-nums">
          {{ classStats.noneCount }}
        </div>
        <p class="text-[11px] text-[var(--muted)]">
          Belum berpartisipasi
        </p>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
      <!-- Status Tabs -->
      <div class="flex items-center gap-1.5 shrink-0 overflow-x-auto">
        <button
          type="button"
          @click="statusFilter = 'all'"
          class="mk-subtab whitespace-nowrap"
          :class="{ 'mk-subtab-active': statusFilter === 'all' }"
        >
          Semua ({{ classStats.totalStudents }})
        </button>
        <button
          type="button"
          @click="statusFilter = 'needs_reminder'"
          class="mk-subtab whitespace-nowrap inline-flex items-center gap-1.5"
          :class="{ 'mk-subtab-active': statusFilter === 'needs_reminder' }"
        >
          <span>Perlu Diingatkan</span>
          <span
            class="mk-badge !py-0 !px-1.5 !text-[10px] tabular-nums"
            :class="statusFilter === 'needs_reminder' ? 'bg-white/20 text-white' : 'mk-badge-warn'"
          >
            {{ classStats.partialCount + classStats.noneCount }}
          </span>
        </button>
        <button
          type="button"
          @click="statusFilter = 'eligible'"
          class="mk-subtab whitespace-nowrap"
          :class="{ 'mk-subtab-active': statusFilter === 'eligible' }"
        >
          Lengkap ({{ classStats.eligibleCount }})
        </button>
      </div>

      <!-- Search Input -->
      <div class="relative flex-1 sm:max-w-xs">
        <label for="search-student" class="sr-only">Cari nama atau NIM mahasiswa</label>
        <span class="material-symbols-outlined text-[16px] text-[var(--muted)] absolute left-2.5 top-2">
          search
        </span>
        <input
          id="search-student"
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama atau NIM..."
          aria-label="Cari nama atau NIM mahasiswa"
          class="w-full pl-8 pr-3 py-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
        />
      </div>
    </div>

    <!-- Student Table -->
    <div class="overflow-x-auto rounded-[8px] border border-[var(--border)]">
      <table class="w-full text-left text-xs border-collapse">
        <thead class="bg-[var(--bg)] text-[var(--muted)] font-semibold border-b border-[var(--border)]">
          <tr>
            <th class="py-2 px-3 w-12 text-center">No</th>
            <th class="py-2 px-3">Nama Mahasiswa</th>
            <th class="py-2 px-3 font-mono">NIM</th>
            <th class="py-2 px-3">Rincian Topik</th>
            <th class="py-2 px-3 text-center">Total Reply</th>
            <th class="py-2 px-3 text-center">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--border)] text-[var(--text)]">
          <tr
            v-for="(s, idx) in filteredStudents"
            :key="s.nim"
            class="hover:bg-[var(--hover)] transition-colors"
          >
            <td class="py-2 px-3 text-center text-[var(--muted)] font-mono text-[11px] tabular-nums">{{ idx + 1 }}</td>
            <td class="py-2 px-3 font-semibold text-[var(--text)]">{{ s.nama }}</td>
            <td class="py-2 px-3 font-mono text-[var(--muted)] text-[11px] tabular-nums">{{ s.nim }}</td>
            <td class="py-2 px-3">
              <div v-if="Object.keys(s.breakdown).length > 0" class="flex items-center gap-1 flex-wrap">
                <span
                  v-for="(count, topic) in s.breakdown"
                  :key="topic"
                  class="mk-badge !py-0.5 !px-1.5 !rounded-[4px] !text-[10px] bg-[var(--bg)] text-[var(--muted)] border border-[var(--border)]"
                >
                  <span class="truncate max-w-[90px]">{{ topic }}:</span>
                  <strong class="text-[var(--accent)] tabular-nums">{{ count }}x</strong>
                </span>
              </div>
              <span v-else class="text-[var(--muted)] text-[11px] italic">-</span>
            </td>
            <td class="py-2 px-3 text-center font-semibold text-xs tabular-nums">
              <span
                :class="
                  s.status === 'eligible'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : s.status === 'partial'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-[var(--muted)]'
                "
              >
                {{ s.totalReplies }}x
              </span>
            </td>
            <td class="py-2 px-3 text-center">
              <span
                v-if="s.status === 'eligible'"
                class="mk-badge mk-badge-ok"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Aman</span>
              </span>
              <span
                v-else-if="s.status === 'partial'"
                class="mk-badge mk-badge-warn"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Kurang 1x</span>
              </span>
              <span
                v-else
                class="mk-badge mk-badge-down"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                <span>Belum</span>
              </span>
            </td>
          </tr>

          <tr v-if="filteredStudents.length === 0">
            <td colspan="6" class="py-8 text-center text-[var(--muted)] text-xs italic">
              Tidak ada data mahasiswa yang sesuai dengan filter atau pencarian.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

