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

const {
  hasToken,
  loading,
  scanning,
  error,
  statusMessage,
  courseDetail,
  loadCourses,
  scanForum,
} = useTelemetri();

onMounted(async () => {
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
</script>

<template>
  <div class="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin py-6 space-y-6">
    <!-- Header -->
    <TelemetriHeader @open-token-modal="isModalOpen = true" />

    <!-- Error Banner -->
    <div
      v-if="error"
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

