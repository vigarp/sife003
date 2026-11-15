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
  if (!navigator?.clipboard?.writeText) return;
  try {
    await navigator.clipboard.writeText(WA_GROUP_INVITE_URL);
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
    class="sticky top-0 z-50 w-full bg-[var(--surface)] border-b border-[var(--border)] transition-colors"
  >
    <div
      class="h-14 w-full max-w-[1140px] mx-auto px-3.5 sm:px-6 flex items-center justify-between"
    >
      <!-- Brand / Identity -->
      <router-link to="/" class="flex items-center gap-2 group">
        <div
          class="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg)] border border-[var(--border)] rounded-md group-hover:border-[var(--accent)] transition-colors"
        >
          <span class="text-xs font-semibold text-[var(--accent)] font-mono tracking-tight"
            >03SIFE003</span
          >
          <span class="text-xs text-[var(--muted)]">•</span>
          <span class="text-xs font-semibold text-[var(--text)]"
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
          class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 mk-btn"
          title="Buka Zona Pengurus"
        >
          <span class="material-symbols-outlined text-[15px] text-[var(--accent)]">admin_panel_settings</span>
          <span class="max-w-[110px] truncate">{{ user?.nama_lengkap?.split(' ')[0] || "Pengurus" }}</span>
        </router-link>

        <div
          v-else-if="isAuthenticated"
          class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 mk-btn"
        >
          <span class="material-symbols-outlined text-[15px] text-[var(--muted)]">person</span>
          <span class="max-w-[110px] truncate">{{ user?.nama_lengkap?.split(' ')[0] || "Mahasiswa" }}</span>
        </div>

        <!-- Telemetri Quick Link -->
        <router-link
          to="/telemetri"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 mk-btn"
          title="Telemetri (Teleskop Mentari)"
        >
          <span class="material-symbols-outlined text-[16px] text-[var(--accent)]">explore</span>
          <span class="hidden min-[420px]:inline">Telemetri</span>
        </router-link>

        <!-- Links Dropdown -->
        <div class="relative" ref="dropdownContainer">
          <button
            type="button"
            @click.stop="toggleDropdown"
            class="px-3 py-1.5 mk-btn flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            :aria-expanded="isDropdownOpen"
            aria-haspopup="true"
            aria-label="Menu navigasi tautan cepat"
          >
            <span class="material-symbols-outlined text-[16px] text-[var(--accent)]">link</span>
            <span>Tautan</span>
            <span
              class="material-symbols-outlined text-[15px] text-[var(--muted)] transition-transform duration-150"
              :class="{ 'rotate-180': isDropdownOpen }"
              >expand_more</span
            >
          </button>

          <!-- Dropdown Menu Box -->
          <div
            v-show="isDropdownOpen"
            class="absolute right-0 mt-2 w-56 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] shadow-lg py-1.5 z-50"
            role="menu"
          >
            <!-- User Status in Dropdown -->
            <div v-if="isAuthenticated" class="px-3 py-2 bg-[var(--bg)] border-b border-[var(--border)] mb-1">
              <p class="text-xs font-semibold text-[var(--text)] truncate">
                {{ user?.nama_lengkap || user?.username }}
              </p>
              <div class="flex items-center justify-between text-[11px] mt-0.5">
                <span :class="isAdmin ? 'text-[var(--accent)] font-medium' : 'text-[var(--muted)]'">
                  {{ isAdmin ? 'Pengurus Kelas' : 'Mahasiswa' }}
                </span>
                <span class="font-mono text-[10px] text-[var(--muted)]" v-if="user?.nim">{{ user.nim }}</span>
              </div>
            </div>
            <!-- Navigation items -->
            <a
              href="#jadwal"
              @click="closeDropdown"
              class="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--hover)] hover:text-[var(--accent)] transition-colors"
              role="menuitem"
            >
              <span class="material-symbols-outlined text-[17px] text-[var(--muted)]"
                >event_repeat</span
              >
              <span>Jadwal Pekan Ini</span>
            </a>

            <a
              href="#agenda"
              @click="closeDropdown"
              class="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--hover)] hover:text-[var(--accent)] transition-colors"
              role="menuitem"
            >
              <span class="material-symbols-outlined text-[17px] text-[var(--muted)]"
                >calendar_month</span
              >
              <span>Agenda Kelas</span>
            </a>

            <a
              href="#kalender"
              @click="closeDropdown"
              class="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--hover)] hover:text-[var(--accent)] transition-colors"
              role="menuitem"
            >
              <span class="material-symbols-outlined text-[17px] text-[var(--muted)]"
                >today</span
              >
              <span>Kalender</span>
            </a>

            <router-link
              to="/telemetri"
              @click="closeDropdown"
              class="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--hover)] hover:text-[var(--accent)] transition-colors"
              role="menuitem"
            >
              <span class="material-symbols-outlined text-[17px] text-[var(--accent)]"
                >explore</span
              >
              <span>Telemetri (Mentari)</span>
            </router-link>

            <router-link
              to="/pengurus"
              @click="closeDropdown"
              class="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--hover)] hover:text-[var(--accent)] transition-colors"
              role="menuitem"
            >
              <span class="material-symbols-outlined text-[17px] text-[var(--muted)]"
                >admin_panel_settings</span
              >
              <span>Zona Pengurus</span>
            </router-link>

            <div class="my-1.5 border-t border-[var(--border)]"></div>

            <!-- KAMPUS -->
            <div class="px-3 py-1 mk-section-title text-[11px]">
              Kampus
            </div>

            <a
              href="https://satu.unpam.ac.id/"
              target="_blank"
              rel="noopener noreferrer"
              @click="closeDropdown"
              class="flex items-center justify-between px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors"
            >
              <span>Satu UNPAM</span>
              <span class="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>

            <a
              href="https://kredensia.id/"
              target="_blank"
              rel="noopener noreferrer"
              @click="closeDropdown"
              class="flex items-center justify-between px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors"
            >
              <span>Kredensia</span>
              <span class="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>

            <a
              href="https://mentari.unpam.ac.id/u-courses/KALENDER-AKADEMIK-20261?accord_pertemuan=KALENDER_AKADEMIK"
              target="_blank"
              rel="noopener noreferrer"
              @click="closeDropdown"
              class="flex items-center justify-between px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors"
            >
              <span>Kalender Akademik</span>
              <span class="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>

            <div class="my-1.5 border-t border-[var(--border)]"></div>

            <!-- PRODI -->
            <div class="px-3 py-1 mk-section-title text-[11px]">
              Prodi
            </div>

            <a
              href="https://link.si-unpam.my.id/"
              target="_blank"
              rel="noopener noreferrer"
              @click="closeDropdown"
              class="flex items-center justify-between px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors"
            >
              <span>LINK-SI</span>
              <span class="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>

            <a
              href="https://monev-sisteminformasi.unpam.ac.id/layanan-mahasiswa"
              target="_blank"
              rel="noopener noreferrer"
              @click="closeDropdown"
              class="flex items-center justify-between px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors"
            >
              <span>SIMONEV</span>
              <span class="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>

            <!-- PENGURUS (Hanya tampil jika login dan admin/pengurus) -->
            <template v-if="isAuthenticated && isAdmin">
              <div class="my-1.5 border-t border-[var(--border)]"></div>

              <div class="px-3 py-1 mk-section-title text-[11px] text-[var(--accent)]">
                Pengurus
              </div>

              <a
                href="http://bit.ly/RekapData-DosenPengampu"
                target="_blank"
                rel="noopener noreferrer"
                @click="closeDropdown"
                class="flex items-center justify-between px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors"
              >
                <span>Kontak Dosen</span>
                <span class="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>

              <a
                href="https://forms.gle/uMP9iQ3PF8fSBwJV6"
                target="_blank"
                rel="noopener noreferrer"
                @click="closeDropdown"
                class="flex items-center justify-between px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors"
              >
                <span>Monitoring Kehadiran Dosen</span>
                <span class="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>

              <button
                type="button"
                @click="copyWaGroupInvite"
                class="w-full flex items-center justify-between px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors cursor-pointer text-left group"
                role="menuitem"
                :title="isCopied ? 'Tersalin ke clipboard!' : 'Salin link undangan grup WhatsApp kelas'"
              >
                <span>{{ isCopied ? 'Tersalin ke Clipboard!' : 'Undangan Grup WA' }}</span>
                <span
                  class="material-symbols-outlined text-[14px] transition-colors"
                  :class="isCopied ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--muted)]'"
                >
                  {{ isCopied ? 'check' : 'content_copy' }}
                </span>
              </button>
            </template>

            <div class="my-1.5 border-t border-[var(--border)]"></div>

            <button
              v-if="isAuthenticated"
              type="button"
              @click="logout(); closeDropdown();"
              class="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-[var(--hover)] transition-colors cursor-pointer text-left"
              role="menuitem"
            >
              <span class="material-symbols-outlined text-[17px]">logout</span>
              <span>Keluar (Logout)</span>
            </button>

            <router-link
              v-else
              to="/pengurus/login"
              @click="closeDropdown"
              class="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--accent)] hover:bg-[var(--hover)] transition-colors"
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
          class="w-8 h-8 mk-btn flex items-center justify-center cursor-pointer focus:outline-none"
        >
          <span
            v-if="isDark"
            class="material-symbols-outlined text-[18px] text-amber-400"
            >light_mode</span
          >
          <span
            v-else
            class="material-symbols-outlined text-[18px] text-[var(--muted)]"
            >dark_mode</span
          >
        </button>
      </div>
    </div>
  </header>
</template>
