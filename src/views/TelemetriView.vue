<script setup>
import { ref, onMounted } from "vue";
import { useTelemetri } from "@/composables/useTelemetri";
import TelemetriHeader from "@/components/telemetri/TelemetriHeader.vue";
import TelemetriControls from "@/components/telemetri/TelemetriControls.vue";
import TelemetriForumBanner from "@/components/telemetri/TelemetriForumBanner.vue";
import TelemetriPersonalCard from "@/components/telemetri/TelemetriPersonalCard.vue";
import TelemetriClassMonitor from "@/components/telemetri/TelemetriClassMonitor.vue";
import TelemetriTokenModal from "@/components/telemetri/TelemetriTokenModal.vue";

const isModalOpen = ref(false);
const scriptCopied = ref(false);
const importSuccessMessage = ref("");

const {
  hasToken,
  loading,
  scanning,
  error,
  statusMessage,
  courseDetail,
  selectedCourseKode,
  selectedPertemuanNum,
  isCloudflareBlocked,
  loadCourses,
  scanForum,
  importSnapshot,
  generateBrowserScript,
} = useTelemetri();

onMounted(async () => {
  // 1. Check if opened via Bookmarklet / URL hash snapshot (#snapshot=...)
  if (typeof window !== "undefined" && window.location.hash.includes("snapshot=")) {
    try {
      const hashStr = window.location.hash.substring(1);
      const params = new URLSearchParams(hashStr);
      const snapData = params.get("snapshot");
      if (snapData) {
        importSnapshot(decodeURIComponent(snapData));
        importSuccessMessage.value = "Data berhasil dimuat otomatis via Bookmarklet Mentari!";
        history.replaceState(null, "", window.location.pathname);
        return;
      }
    } catch (e) {
      console.warn("Gagal membaca snapshot dari URL hash:", e);
    }
  }

  // 2. Fallback to normal token API scan
  if (hasToken.value) {
    await loadCourses();
    // Auto scan initial course & pertemuan
    await scanForum();
  } else {
    // Prompt token modal if not configured
    isModalOpen.value = true;
  }
});

async function handleTokenSaved() {
  await loadCourses();
  await scanForum();
}

async function handleCopyScript() {
  const script = generateBrowserScript(
    selectedCourseKode.value,
    selectedPertemuanNum.value
  );
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(script);
    } else {
      window.prompt("Salin script berikut:", script);
    }
    scriptCopied.value = true;
    setTimeout(() => {
      scriptCopied.value = false;
    }, 2500);
  } catch {
    window.prompt("Salin script berikut:", script);
  }
}

async function handlePasteSnapshot() {
  try {
    let text = "";
    if (navigator?.clipboard?.readText) {
      text = await navigator.clipboard.readText();
    }
    if (!text || !text.includes("courseDetail")) {
      text = window.prompt(
        "Tempel data snapshot JSON hasil scan browser di sini:"
      );
    }
    if (text) {
      importSnapshot(text);
      importSuccessMessage.value = "Data berhasil dimuat dari browser Mentari!";
      setTimeout(() => {
        importSuccessMessage.value = "";
      }, 4000);
    }
  } catch (err) {
    alert("Gagal membaca data: " + err.message);
  }
}
</script>

<template>
  <div class="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin py-6 space-y-6">
    <!-- Header -->
    <TelemetriHeader @open-token-modal="isModalOpen = true" />

    <!-- Import Success Banner -->
    <div
      v-if="importSuccessMessage"
      class="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in duration-200"
    >
      <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[20px]">verified</span>
      <span>{{ importSuccessMessage }}</span>
    </div>

    <!-- Cloudflare Warning & 100% Anti-Blokir Browser Scanner Helper -->
    <div
      v-if="isCloudflareBlocked || (error && error.includes('Cloudflare'))"
      class="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 border border-amber-300 dark:border-amber-700/80 space-y-3 text-xs shadow-xs"
    >
      <div class="flex items-start gap-3">
        <div class="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          <span class="material-symbols-outlined text-[22px]">shield_lock</span>
        </div>
        <div class="space-y-1 flex-1">
          <h2 class="text-sm font-bold text-amber-900 dark:text-amber-200">
            Terdeteksi Proteksi Cloudflare WAF di Server Vercel
          </h2>
          <p class="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
            Cloudflare Mentari membatasi akses dari IP cloud serverless Vercel. Gunakan <strong>Mode Script Browser</strong> untuk memindai langsung dari browser Anda (100% lolos WAF & bebas kendala CORS) lalu tempel hasilnya ke sini:
          </p>
        </div>
      </div>

      <div class="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/80 dark:border-amber-800/60 flex flex-wrap items-center justify-between gap-2.5">
        <div class="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
          <span class="font-bold text-slate-900 dark:text-white">Langkah 1-Klik:</span>
          <p class="text-[10px] text-slate-500 dark:text-slate-400">
            1. Salin Script &rarr; 2. Buka Console tab Mentari (<kbd class="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[9px]">F12</kbd>) &rarr; Paste & Enter &rarr; 3. Klik tombol tempel di samping.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="handleCopyScript"
            class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 text-xs"
          >
            <span class="material-symbols-outlined text-[15px] text-amber-400">content_copy</span>
            <span>{{ scriptCopied ? 'Script Tersalin!' : '1. Salin Script Scanner' }}</span>
          </button>

          <button
            type="button"
            @click="handlePasteSnapshot"
            class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 text-xs"
          >
            <span class="material-symbols-outlined text-[15px]">content_paste</span>
            <span>2. Tempel Data Hasil Scan</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Error Banner (if not already handled by Cloudflare banner) -->
    <div
      v-else-if="error"
      class="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-start gap-3 text-xs"
    >
      <span class="material-symbols-outlined text-rose-500 text-[20px] shrink-0 mt-0.5">error</span>
      <div class="space-y-1">
        <p class="font-bold">Terjadi Kendala Pemindaian</p>
        <p class="leading-relaxed">{{ error }}</p>
        <button
          v-if="error.includes('token') || error.includes('401')"
          type="button"
          @click="isModalOpen = true"
          class="underline font-bold mt-1 inline-block cursor-pointer"
        >
          Perbarui Token Mentari Sekarang &rarr;
        </button>
      </div>
    </div>

    <!-- Controls Selector -->
    <TelemetriControls
      @open-token-modal="isModalOpen = true"
      @scan="scanForum"
      @copy-script="handleCopyScript"
      @paste-snapshot="handlePasteSnapshot"
    />

    <!-- Scanning Loading State -->
    <div
      v-if="scanning"
      class="py-14 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
    >
      <div class="w-10 h-10 mx-auto border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-sm font-bold text-slate-900 dark:text-white">
        Sedang Meneropong Mentari...
      </p>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        {{ statusMessage || 'Menghubungkan ke API Mentari UNPAM' }}
      </p>
    </div>

    <!-- Main Content when course detail is loaded -->
    <div v-else-if="courseDetail" class="space-y-6">
      <!-- 1. Forum Status Banner -->
      <TelemetriForumBanner />

      <!-- 2. Personal Insight Card -->
      <TelemetriPersonalCard @edit-nim="isModalOpen = true" />

      <!-- 3. Class Participation Monitor -->
      <TelemetriClassMonitor />
    </div>

    <!-- Empty State when no scan has run yet -->
    <div
      v-else-if="!hasToken"
      class="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 px-4"
    >
      <div class="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
        <span class="material-symbols-outlined text-[32px]">sensors</span>
      </div>
      <div class="space-y-1 max-w-md mx-auto">
        <h2 class="text-base font-bold text-slate-900 dark:text-white">
          Hubungkan Token Sesi Mentari Anda
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Masukkan token JWT Mentari untuk mulai meneropong status fordis, memantau balasan dosen, dan melihat keaktifan kelas 03SIFE003.
        </p>
      </div>
      <button
        type="button"
        @click="isModalOpen = true"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
      >
        <span class="material-symbols-outlined text-[18px]">key</span>
        <span>Atur Token Mentari Sekarang</span>
      </button>
    </div>

    <!-- Token Settings Modal -->
    <TelemetriTokenModal
      :is-open="isModalOpen"
      @close="isModalOpen = false"
      @saved="handleTokenSaved"
    />
  </div>
</template>

