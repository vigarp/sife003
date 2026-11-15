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
  <div class="space-y-4 pb-8">
    <!-- Header -->
    <TelemetriHeader @open-token-modal="isModalOpen = true" />

    <!-- Empty State when no token is configured -->
    <div
      v-if="!hasToken"
      class="mk-card py-10 px-4 text-center space-y-3"
    >
      <div class="space-y-1 max-w-md mx-auto">
        <h2 class="text-sm font-semibold text-[var(--text)]">
          Hubungkan Token Sesi Mentari Anda
        </h2>
        <p class="text-xs text-[var(--muted)] leading-relaxed">
          Masukkan token JWT Mentari untuk mulai meneropong status fordis, memantau balasan dosen, dan melihat keaktifan kelas 03SIFE003.
        </p>
      </div>
      <button
        type="button"
        @click="isModalOpen = true"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-xs transition-colors cursor-pointer"
      >
        <span class="material-symbols-outlined text-[16px]">key</span>
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
