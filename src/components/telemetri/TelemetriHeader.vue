<script setup>
import { useTelemetri } from "@/composables/useTelemetri";

defineEmits(["open-token-modal"]);

const { hasToken, userNim } = useTelemetri();
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[var(--border)]">
    <div class="space-y-0.5">
      <div class="flex flex-wrap items-center gap-2">
        <h1 class="text-[1.15rem] font-semibold tracking-tight text-[var(--text)]">
          Telemetri
        </h1>
        <span class="mk-badge bg-[var(--hover)] text-[var(--muted)] border border-[var(--border)]">
          Teleskop Mentari
        </span>
      </div>
      <p class="text-xs text-[var(--muted)]">
        Observatorium & Radar Keaktifan E-Learning Kelas 03SIFE003 UNPAM
      </p>
    </div>

    <!-- Right Controls: Token Status & Action -->
    <div class="flex items-center gap-2 shrink-0">
      <!-- Token Status Indicator -->
      <button
        type="button"
        @click="$emit('open-token-modal')"
        class="mk-badge cursor-pointer transition-colors"
        :class="hasToken ? 'mk-badge-ok' : 'mk-badge-warn'"
      >
        <span
          class="w-1.5 h-1.5 rounded-full"
          :class="hasToken ? 'bg-emerald-500' : 'bg-amber-500'"
        ></span>
        <span>{{ hasToken ? 'Sesi Mentari Aktif' : 'Token Belum Diatur' }}</span>
        <span class="material-symbols-outlined text-[14px]">settings</span>
      </button>

      <button
        type="button"
        @click="$emit('open-token-modal')"
        class="mk-btn bg-[var(--accent)] border-transparent text-white hover:opacity-90"
      >
        <span class="material-symbols-outlined text-[15px]">key</span>
        <span class="hidden sm:inline">Atur Token</span>
      </button>
    </div>
  </div>
</template>

