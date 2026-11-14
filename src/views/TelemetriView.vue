<script setup>
import { ref, onMounted } from "vue";
import { useTelemetri } from "@/composables/useTelemetri";
import TelemetriHeader from "@/components/telemetri/TelemetriHeader.vue";
import TelemetriWeekAccordion from "@/components/telemetri/TelemetriWeekAccordion.vue";
import TelemetriTokenModal from "@/components/telemetri/TelemetriTokenModal.vue";

const isModalOpen = ref(false);

const {
  hasToken,
  loadCourses,
} = useTelemetri();

onMounted(async () => {
  if (hasToken.value) {
    // Hanya muat daftar mata kuliah; pemindaian fordis dilakukan lazy saat user klik accordion
    await loadCourses();
  } else {
    isModalOpen.value = true;
  }
});

async function handleTokenSaved() {
  await loadCourses();
}
</script>

<template>
  <div class="max-w-[1440px] mx-auto lg:px-margin py-4 sm:py-6 space-y-4 sm:space-y-6">
    <!-- Header -->
    <TelemetriHeader @open-token-modal="isModalOpen = true" />

    <!-- Empty State when no token is configured -->
    <div
      v-if="!hasToken"
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

    <!-- Main Telemetri Workspace (Week Accordion, Lazy-Load on Expand) -->
    <TelemetriWeekAccordion
      v-else
      @open-token-modal="isModalOpen = true"
    />

    <!-- Token Settings Modal -->
    <TelemetriTokenModal
      :is-open="isModalOpen"
      @close="isModalOpen = false"
      @saved="handleTokenSaved"
    />
  </div>
</template>
