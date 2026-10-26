<script setup>
import { useTelemetri } from "@/composables/useTelemetri";

defineEmits(["open-token-modal"]);

const { hasToken, userNim } = useTelemetri();
</script>

<template>
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
    <div class="space-y-1">
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
          <span class="material-symbols-outlined text-[24px]">explore</span>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Telemetri
            </h1>
            <span class="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800">
              Teleskop Mentari
            </span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Observatorium & Radar Keaktifan E-Learning Kelas 03SIFE003 UNPAM
          </p>
        </div>
      </div>
    </div>

    <!-- Right Controls: Token Status & Action -->
    <div class="flex items-center gap-2.5 shrink-0">
      <!-- Token Status Indicator -->
      <button
        type="button"
        @click="$emit('open-token-modal')"
        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs"
        :class="
          hasToken
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:border-emerald-400'
            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:border-amber-400'
        "
      >
        <span
          class="w-2 h-2 rounded-full"
          :class="hasToken ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'"
        ></span>
        <span>{{ hasToken ? 'Sesi Mentari Aktif' : 'Token Belum Diatur' }}</span>
        <span class="material-symbols-outlined text-[15px]">settings</span>
      </button>

      <button
        type="button"
        @click="$emit('open-token-modal')"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
      >
        <span class="material-symbols-outlined text-[16px]">key</span>
        <span class="hidden sm:inline">Atur Token</span>
      </button>
    </div>
  </div>
</template>

