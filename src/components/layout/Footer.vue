<script setup>
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer
    class="w-full bg-surface-card dark:bg-slate-900 border-t border-border-ui dark:border-slate-800 mt-space-xl transition-colors"
  >
    <div
      class="py-space-md bg-surface-alt dark:bg-slate-950 transition-colors"
    >
      <div
        class="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-space-sm text-center sm:text-left"
      >
        <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span class="text-xs text-slate-700 dark:text-slate-300 font-semibold"
            >© {{ currentYear }} SI-KEMARI (Sistem Informasi Kelas 03SIFE003)</span
          >
          <span class="hidden sm:inline text-xs text-slate-400 dark:text-slate-600">•</span>
          <span class="text-xs text-slate-500 dark:text-slate-400 italic"
            >"Sistem Informasi Kelas: Biar Ga Usah Kesana-Kemari"</span
          >
        </div>
        <span class="text-xs text-slate-600 dark:text-slate-400 font-medium"
          >Universitas Pamulang</span
        >
      </div>
    </div>
  </footer>
</template>
