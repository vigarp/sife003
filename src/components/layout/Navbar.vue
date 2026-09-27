<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useTheme } from "@/composables/useTheme";

const { isDark, toggleTheme } = useTheme();
const isDropdownOpen = ref(false);
const dropdownContainer = ref(null);

function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value;
}

function closeDropdown() {
  isDropdownOpen.value = false;
}

function handleOutsideClick(e) {
  if (dropdownContainer.value && !dropdownContainer.value.contains(e.target)) {
    closeDropdown();
  }
}

function handleKeydown(e) {
  if (e.key === "Escape") {
    closeDropdown();
  }
}

onMounted(() => {
  document.addEventListener("click", handleOutsideClick);
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("click", handleOutsideClick);
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <header
    class="sticky top-0 z-50 w-full bg-surface-card/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-border-ui dark:border-slate-800 shadow-xs transition-colors"
  >
    <div
      class="h-16 w-full max-w-[1440px] mx-auto px-margin-mobile lg:px-margin flex items-center justify-between"
    >
      <!-- Brand / Identity -->
      <div class="flex items-center gap-space-sm">
        <div
          class="flex items-center gap-space-xs px-2.5 py-1 bg-primary-subtle/80 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/70 rounded-lg shadow-2xs"
        >
          <span class="text-xs font-bold text-primary dark:text-blue-400 tracking-tight"
            >03SIFE003</span
          >
          <span class="text-xs text-blue-300 dark:text-blue-600">•</span>
          <span class="text-xs font-semibold text-primary-dark dark:text-blue-200"
            >Portal Kelas</span
          >
        </div>
      </div>

      <!-- Right Menu: Links Dropdown & Dark Mode Toggle -->
      <div class="flex items-center gap-2">
        <!-- Links Dropdown -->
        <div class="relative" ref="dropdownContainer">
          <button
            type="button"
            @click.stop="toggleDropdown"
            class="px-3 py-1.5 rounded-lg bg-surface-card dark:bg-slate-800 text-text-main dark:text-slate-200 hover:text-primary dark:hover:text-blue-400 border border-border-ui dark:border-slate-700/80 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
            :aria-expanded="isDropdownOpen"
            aria-haspopup="true"
            aria-label="Menu navigasi tautan cepat"
          >
            <span class="material-symbols-outlined text-[17px] text-primary dark:text-blue-400">link</span>
            <span>Tautan</span>
            <span
              class="material-symbols-outlined text-[15px] transition-transform duration-200"
              :class="{ 'rotate-180': isDropdownOpen }"
              >expand_more</span
            >
          </button>

          <!-- Dropdown Menu Box -->
          <div
            v-show="isDropdownOpen"
            class="absolute right-0 mt-2 w-56 rounded-xl bg-surface-card dark:bg-slate-900 border border-border-ui dark:border-slate-800 shadow-xl py-1.5 z-50 transition-all duration-150 animate-in fade-in-50 zoom-in-95"
            role="menu"
          >
            <!-- Navigation items -->
            <a
              href="#jadwal"
              @click="closeDropdown"
              class="flex items-center gap-2.5 px-3 py-2 text-sm text-text-main dark:text-slate-200 hover:bg-surface-alt dark:hover:bg-slate-800 hover:text-primary dark:hover:text-blue-400 transition-colors"
              role="menuitem"
            >
              <span class="material-symbols-outlined text-[18px] text-primary dark:text-blue-400"
                >event_repeat</span
              >
              <span>Jadwal Pekan Ini</span>
            </a>

            <a
              href="#kalender"
              @click="closeDropdown"
              class="flex items-center gap-2.5 px-3 py-2 text-sm text-text-main dark:text-slate-200 hover:bg-surface-alt dark:hover:bg-slate-800 hover:text-primary dark:hover:text-blue-400 transition-colors"
              role="menuitem"
            >
              <span class="material-symbols-outlined text-[18px] text-accent-gold"
                >calendar_month</span
              >
              <span>Agenda Kelas</span>
            </a>

            <div class="my-1.5 border-t border-border-ui dark:border-slate-800"></div>

            <div
              class="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-text-subtle dark:text-slate-400"
            >
              Tautan Akademik
            </div>

            <a
              href="https://siakad.unpam.ac.id"
              target="_blank"
              rel="noopener noreferrer"
              @click="closeDropdown"
              class="flex items-center justify-between px-3 py-1.5 text-xs text-text-muted dark:text-slate-300 hover:bg-surface-alt dark:hover:bg-slate-800 hover:text-primary dark:hover:text-blue-400 transition-colors"
            >
              <span>SIAKAD UNPAM</span>
              <span class="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>

            <a
              href="https://mentari.unpam.ac.id"
              target="_blank"
              rel="noopener noreferrer"
              @click="closeDropdown"
              class="flex items-center justify-between px-3 py-1.5 text-xs text-text-muted dark:text-slate-300 hover:bg-surface-alt dark:hover:bg-slate-800 hover:text-primary dark:hover:text-blue-400 transition-colors"
            >
              <span>LMS Mentari</span>
              <span class="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>

            <a
              href="https://my.unpam.ac.id"
              target="_blank"
              rel="noopener noreferrer"
              @click="closeDropdown"
              class="flex items-center justify-between px-3 py-1.5 text-xs text-text-muted dark:text-slate-300 hover:bg-surface-alt dark:hover:bg-slate-800 hover:text-primary dark:hover:text-blue-400 transition-colors"
            >
              <span>MyUNPAM Presensi</span>
              <span class="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>

            <a
              href="https://library.unpam.ac.id"
              target="_blank"
              rel="noopener noreferrer"
              @click="closeDropdown"
              class="flex items-center justify-between px-3 py-1.5 text-xs text-text-muted dark:text-slate-300 hover:bg-surface-alt dark:hover:bg-slate-800 hover:text-primary dark:hover:text-blue-400 transition-colors"
            >
              <span>Perpustakaan UNPAM</span>
              <span class="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>

            <a
              href="https://spm.unpam.ac.id"
              target="_blank"
              rel="noopener noreferrer"
              @click="closeDropdown"
              class="flex items-center justify-between px-3 py-1.5 text-xs text-text-muted dark:text-slate-300 hover:bg-surface-alt dark:hover:bg-slate-800 hover:text-primary dark:hover:text-blue-400 transition-colors"
            >
              <span>SPM UNPAM</span>
              <span class="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
          </div>
        </div>

        <!-- Dark / Light Theme Switcher Button -->
        <button
          type="button"
          @click="toggleTheme"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          :title="isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'"
          class="w-9 h-9 rounded-lg bg-surface-alt dark:bg-slate-800 text-text-muted dark:text-slate-300 hover:text-primary dark:hover:text-accent-gold border border-border-ui dark:border-slate-700/80 flex items-center justify-center transition-colors shadow-2xs cursor-pointer focus:outline-none"
        >
          <span
            v-if="isDark"
            class="material-symbols-outlined text-[19px] text-accent-gold"
            >light_mode</span
          >
          <span
            v-else
            class="material-symbols-outlined text-[19px] text-text-muted"
            >dark_mode</span
          >
        </button>
      </div>
    </div>
  </header>
</template>
