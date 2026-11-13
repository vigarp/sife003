<script setup>
import { useTelemetri } from "@/composables/useTelemetri";
import TelemetriForumBanner from "@/components/telemetri/TelemetriForumBanner.vue";
import TelemetriPersonalCard from "@/components/telemetri/TelemetriPersonalCard.vue";
import TelemetriClassMonitor from "@/components/telemetri/TelemetriClassMonitor.vue";

defineProps({
  isActive: {
    type: Boolean,
    default: true,
  },
  showToolbar: {
    type: Boolean,
    default: false,
  },
  toolbarLabel: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["open-token-modal", "refresh"]);

const {
  scanning,
  error,
  statusMessage,
  courseDetail,
} = useTelemetri();
</script>

<template>
  <div class="space-y-4">
    <!-- Optional Refresh Action -->
    <div v-if="showToolbar" class="flex items-center justify-end text-xs">
      <button
        type="button"
        @click="emit('refresh')"
        :disabled="scanning"
        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-colors disabled:opacity-50 cursor-pointer"
      >
        <span class="material-symbols-outlined text-[14px]">refresh</span>
        <span>Pindai Ulang</span>
      </button>
    </div>

    <!-- Scanning Loading State -->
    <div
      v-if="scanning && isActive"
      class="py-10 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5"
    >
      <div class="w-8 h-8 mx-auto border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs font-bold text-slate-900 dark:text-white">
        Sedang Meneropong Mentari...
      </p>
      <p class="text-[11px] text-slate-500 dark:text-slate-400">
        {{ statusMessage || "Menghubungkan ke API Mentari UNPAM" }}
      </p>
    </div>

    <!-- Error Banner -->
    <div
      v-else-if="error && isActive"
      class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-start gap-3 text-xs"
    >
      <span class="material-symbols-outlined text-rose-500 text-[18px] shrink-0 mt-0.5">error</span>
      <div class="space-y-1">
        <p class="font-bold">Terjadi Kendala Pemindaian</p>
        <p class="leading-relaxed">{{ error }}</p>
        <button
          v-if="error.includes('token') || error.includes('401')"
          type="button"
          @click="emit('open-token-modal')"
          class="underline font-bold mt-1 inline-block cursor-pointer"
        >
          Perbarui Token Mentari Sekarang &rarr;
        </button>
      </div>
    </div>

    <!-- Main Content when course detail is loaded -->
    <div v-else-if="courseDetail && isActive" class="space-y-5">
      <TelemetriForumBanner />
      <TelemetriPersonalCard @edit-nim="emit('open-token-modal')" />
      <TelemetriClassMonitor />
    </div>
  </div>
</template>
