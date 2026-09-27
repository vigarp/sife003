<script setup>
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer
    class="w-full bg-surface-card dark:bg-slate-900 border-t border-border-ui dark:border-slate-800 mt-space-xl transition-colors"
  >
    <div
      class="border-t border-border-ui dark:border-slate-800 py-space-md bg-surface-alt dark:bg-slate-950 transition-colors"
    >
      <div
        class="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin flex flex-col sm:flex-row items-center justify-between gap-space-sm text-center sm:text-left"
      >
        <span class="text-xs text-text-subtle dark:text-slate-500"
          >© {{ currentYear }} Sistem Informasi Kelas 03SIFE003.</span
        >
        <span class="text-xs text-text-subtle dark:text-slate-500 font-medium"
          >Universitas Pamulang</span
        >
      </div>
    </div>
  </footer>
</template>
