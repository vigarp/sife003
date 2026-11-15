<script setup>
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer
    class="w-full bg-[var(--surface)] border-t border-[var(--border)] mt-8 py-4 transition-colors"
  >
    <div
      class="max-w-[1140px] mx-auto px-3.5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left"
    >
      <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
        <span class="text-xs text-[var(--text)] font-medium"
          >© {{ currentYear }} SI-KEMARI (Sistem Informasi Kelas 03SIFE003)</span
        >
        <span class="hidden sm:inline text-xs text-[var(--muted)]">•</span>
        <span class="text-xs text-[var(--muted)]"
          >"Sistem Informasi Kelas: Biar Ga Usah Kesana-Kemari"</span
        >
      </div>
      <span class="text-xs text-[var(--muted)] font-medium"
        >Universitas Pamulang</span
      >
    </div>
  </footer>
</template>
