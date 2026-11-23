<script setup>
const quickNavItems = [
  {
    href: "#jadwal",
    icon: "event_repeat",
    title: "Jadwal Perkuliahan",
    subtitle: "Mentari & Tatap Muka",
  },
  {
    href: "#agenda",
    icon: "assignment",
    title: "Agenda Kelas",
    subtitle: "Catatan & Deadline Tugas",
  },
  {
    href: "#kalender",
    icon: "today",
    title: "Kalender Akademik",
    subtitle: "Agenda Kampus & Libur",
  },
];
</script>

<template>
  <section class="w-full mb-5" id="home">
    <div
      class="mk-card px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
    >
      <h1 class="text-base font-semibold text-[var(--text)] leading-snug">
        Portal Kelas 03SIFE003
        <span class="text-xs font-normal text-[var(--muted)] sm:ml-1.5 block sm:inline">
          Calon Sarjana — Biar Ga bingung mau kemana
        </span>
      </h1>
      <span class="text-xs font-mono text-[var(--muted)] shrink-0">
        SI-KEMARI
      </span>
    </div>

    <nav
      aria-label="Navigasi cepat halaman"
      class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2.5"
    >
      <a
        v-for="item in quickNavItems"
        :key="item.href"
        :href="item.href"
        class="mk-card px-3.5 py-2.5 flex items-center justify-between gap-3 hover:border-[var(--accent)] hover:bg-[var(--hover)] transition-colors group"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            class="w-8 h-8 rounded-[8px] bg-[var(--accent-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0"
          >
            <span class="material-symbols-outlined text-[18px]">{{ item.icon }}</span>
          </span>
          <div class="min-w-0">
            <div class="text-xs font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors truncate">
              {{ item.title }}
            </div>
            <div class="text-[11px] text-[var(--muted)] truncate">
              {{ item.subtitle }}
            </div>
          </div>
        </div>
        <span
          aria-hidden="true"
          class="material-symbols-outlined text-[16px] text-[var(--muted)] group-hover:text-[var(--accent)] shrink-0 transition-colors"
        >
          arrow_downward
        </span>
      </a>
    </nav>
  </section>
</template>
