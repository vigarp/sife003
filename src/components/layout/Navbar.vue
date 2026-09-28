<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useTheme } from "@/composables/useTheme";
import { useAdminAuth } from "@/composables/useAdminAuth";

const { isDark, toggleTheme } = useTheme();
const { user, isAuthenticated, isAdmin, logout } = useAdminAuth();
const isDropdownOpen = ref(false);
const dropdownContainer = ref(null);
const isCopied = ref(false);
const WA_GROUP_INVITE_URL = "https://chat.whatsapp.com/C2kXOlWaZxmDHzRdKsDJTh";

async function copyWaGroupInvite() {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(WA_GROUP_INVITE_URL);
    } else {
      const input = document.createElement("textarea");
      input.value = WA_GROUP_INVITE_URL;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (err) {
    console.error("Gagal menyalin link undangan WA:", err);
  }
}

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
      <router-link to="/" class="flex items-center gap-space-sm group">
        <div
          class="flex items-center gap-space-xs px-2.5 py-1 bg-primary-subtle/80 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/70 rounded-lg shadow-2xs group-hover:border-primary/50 transition-colors"
        >
          <span class="text-xs font-bold text-primary dark:text-blue-400 tracking-tight"
            >03SIFE003</span
          >
          <span class="text-xs text-blue-300 dark:text-blue-600">•</span>
          <span class="text-xs font-semibold text-primary-dark dark:text-blue-200"
            >Portal Kelas</span
          >
        </div>
      </router-link>

      <!-- Right Menu: Links Dropdown & Dark Mode Toggle -->
      <div class="flex items-center gap-2">
        <!-- User Badge when authenticated -->
        <router-link
          v-if="isAuthenticated && isAdmin"
          to="/pengurus"
          class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors shadow-2xs"
          title="Buka Zona Pengurus"
        >
          <span class="material-symbols-outlined text-[15px]">admin_panel_settings</span>
          <span class="max-w-[110px] truncate">{{ user?.nama_lengkap?.split(' ')[0] || "Pengurus" }}</span>
        </router-link>

        <div
          v-else-if="isAuthenticated"
          class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs"
        >
          <span class="material-symbols-outlined text-[15px] text-slate-500">person</span>
          <span class="max-w-[110px] truncate">{{ user?.nama_lengkap?.split(' ')[0] || "Mahasiswa" }}</span>
        </div>

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
            <!-- User Status in Dropdown -->
            <div v-if="isAuthenticated" class="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-border-ui dark:border-slate-800 mb-1">
              <p class="text-xs font-bold text-slate-900 dark:text-white truncate">
                {{ user?.nama_lengkap || user?.username }}
              </p>
              <div class="flex items-center justify-between text-[11px] mt-0.5">
                <span :class="isAdmin ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'">
                  {{ isAdmin ? '🛡️ Pengurus Kelas' : '👤 Mahasiswa' }}
                </span>
                <span class="font-mono text-[10px] text-slate-400" v-if="user?.nim">{{ user.nim }}</span>
              </div>
            </div>
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
              href="#agenda"
              @click="closeDropdown"
              class="flex items-center gap-2.5 px-3 py-2 text-sm text-text-main dark:text-slate-200 hover:bg-surface-alt dark:hover:bg-slate-800 hover:text-primary dark:hover:text-blue-400 transition-colors"
              role="menuitem"
            >
              <span class="material-symbols-outlined text-[18px] text-accent-gold"
                >calendar_month</span
              >
              <span>Agenda Kelas</span>
            </a>

            <a
              href="#kalender"
              @click="closeDropdown"
              class="flex items-center gap-2.5 px-3 py-2 text-sm text-text-main dark:text-slate-200 hover:bg-surface-alt dark:hover:bg-slate-800 hover:text-primary dark:hover:text-blue-400 transition-colors"
              role="menuitem"
            >
              <span class="material-symbols-outlined text-[18px] text-blue-500"
                >today</span
              >
              <span>Kalender</span>
            </a>

            <router-link
              to="/pengurus"
              @click="closeDropdown"
              class="flex items-center gap-2.5 px-3 py-2 text-sm text-text-main dark:text-slate-200 hover:bg-surface-alt dark:hover:bg-slate-800 hover:text-primary dark:hover:text-blue-400 transition-colors"
              role="menuitem"
            >
              <span class="material-symbols-outlined text-[18px] text-emerald-500"
                >admin_panel_settings</span
              >
              <span>Zona Pengurus</span>
            </router-link>

            <div class="my-1.5 border-t border-border-ui dark:border-slate-800"></div>

            <!-- KAMPUS -->
            <div
              class="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-text-subtle dark:text-slate-400"
            >
              Kampus
            </div>

            <a
              href="https://satu.unpam.ac.id/"
              target="_blank"
              rel="noopener noreferrer"
              @click="closeDropdown"
              class="flex items-center justify-between px-3 py-1.5 text-xs text-text-muted dark:text-slate-300 hover:bg-surface-alt dark:hover:bg-slate-800 hover:text-primary dark:hover:text-blue-400 transition-colors"
            >
              <span>Satu UNPAM</span>
              <span class="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>

            <div class="my-1.5 border-t border-border-ui dark:border-slate-800"></div>

            <!-- PRODI -->
            <div
              class="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-text-subtle dark:text-slate-400"
            >
              Prodi
            </div>

            <a
              href="https://link.si-unpam.my.id/"
              target="_blank"
              rel="noopener noreferrer"
              @click="closeDropdown"
              class="flex items-center justify-between px-3 py-1.5 text-xs text-text-muted dark:text-slate-300 hover:bg-surface-alt dark:hover:bg-slate-800 hover:text-primary dark:hover:text-blue-400 transition-colors"
            >
              <span>LINK-SI</span>
              <span class="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>

            <a
              href="https://monev-sisteminformasi.unpam.ac.id/layanan-mahasiswa"
              target="_blank"
              rel="noopener noreferrer"
              @click="closeDropdown"
              class="flex items-center justify-between px-3 py-1.5 text-xs text-text-muted dark:text-slate-300 hover:bg-surface-alt dark:hover:bg-slate-800 hover:text-primary dark:hover:text-blue-400 transition-colors"
            >
              <span>SIMONEV</span>
              <span class="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>

            <!-- PENGURUS (Hanya tampil jika login dan admin/pengurus) -->
            <template v-if="isAuthenticated && isAdmin">
              <div class="my-1.5 border-t border-border-ui dark:border-slate-800"></div>

              <div
                class="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1"
              >
                <span>Pengurus</span>
              </div>

              <a
                href="http://bit.ly/RekapData-DosenPengampu"
                target="_blank"
                rel="noopener noreferrer"
                @click="closeDropdown"
                class="flex items-center justify-between px-3 py-1.5 text-xs text-text-muted dark:text-slate-300 hover:bg-surface-alt dark:hover:bg-slate-800 hover:text-primary dark:hover:text-blue-400 transition-colors"
              >
                <span>Kontak Dosen</span>
                <span class="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>

              <a
                href="https://forms.gle/uMP9iQ3PF8fSBwJV6"
                target="_blank"
                rel="noopener noreferrer"
                @click="closeDropdown"
                class="flex items-center justify-between px-3 py-1.5 text-xs text-text-muted dark:text-slate-300 hover:bg-surface-alt dark:hover:bg-slate-800 hover:text-primary dark:hover:text-blue-400 transition-colors"
              >
                <span>Monitoring Kehadiran Dosen</span>
                <span class="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>

              <button
                type="button"
                @click="copyWaGroupInvite"
                class="w-full flex items-center justify-between px-3 py-1.5 text-xs text-text-muted dark:text-slate-300 hover:bg-surface-alt dark:hover:bg-slate-800 hover:text-primary dark:hover:text-blue-400 transition-colors cursor-pointer text-left group"
                role="menuitem"
                :title="isCopied ? 'Tersalin ke clipboard!' : 'Salin link undangan grup WhatsApp kelas'"
              >
                <span>{{ isCopied ? 'Tersalin ke Clipboard!' : 'Undangan Grup WA' }}</span>
                <span
                  class="material-symbols-outlined text-[14px] transition-colors"
                  :class="isCopied ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 group-hover:text-primary dark:group-hover:text-blue-400'"
                >
                  {{ isCopied ? 'check' : 'content_copy' }}
                </span>
              </button>
            </template>

            <div class="my-1.5 border-t border-border-ui dark:border-slate-800"></div>

            <button
              v-if="isAuthenticated"
              type="button"
              @click="logout(); closeDropdown();"
              class="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-left"
              role="menuitem"
            >
              <span class="material-symbols-outlined text-[17px]">logout</span>
              <span>Keluar (Logout)</span>
            </button>

            <router-link
              v-else
              to="/pengurus/login"
              @click="closeDropdown"
              class="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
              role="menuitem"
            >
              <span class="material-symbols-outlined text-[17px]">login</span>
              <span>Masuk (NIM / Admin)</span>
            </router-link>
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
