<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAdminAuth } from "@/composables/useAdminAuth";
import { useTheme } from "@/composables/useTheme";
import TurnstileWidget from "@/components/common/TurnstileWidget.vue";

const router = useRouter();
const { login, isAuthenticated, isAdmin, loading, error } = useAdminAuth();
const { isDark } = useTheme();

const username = ref("");
const password = ref("");
const errorMessage = ref("");
const turnstileToken = ref("");
const turnstileRef = ref(null);

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
const isTurnstileEnabled = Boolean(turnstileSiteKey);

onMounted(() => {
  if (isAuthenticated.value) {
    if (isAdmin.value) {
      void router.replace("/pengurus");
    } else {
      void router.replace("/");
    }
  }
});

function onTurnstileVerify(token) {
  turnstileToken.value = token;
  errorMessage.value = "";
}

function onTurnstileExpire() {
  turnstileToken.value = "";
}

function onTurnstileError(err) {
  console.warn("Turnstile widget error:", err);
}

async function handleLogin() {
  errorMessage.value = "";
  if (!username.value.trim() || !password.value) {
    errorMessage.value = "NIM/Username dan kata sandi tidak boleh kosong.";
    return;
  }

  if (isTurnstileEnabled && !turnstileToken.value) {
    errorMessage.value = "Harap selesaikan verifikasi keamanan (Turnstile) terlebih dahulu.";
    return;
  }

  const result = await login(username.value, password.value, turnstileToken.value);
  if (result.success) {
    if (isAdmin.value) {
      await router.push("/pengurus");
    } else {
      await router.push("/");
    }
  } else {
    errorMessage.value = result.message || "Gagal masuk. Periksa kembali akun Anda.";
    turnstileToken.value = "";
    turnstileRef.value?.reset();
  }
}
</script>

<template>
  <div class="w-full max-w-md mx-auto py-8 px-3.5">
    <div class="mk-card p-5 sm:p-6 space-y-5">
      
      <!-- Header -->
      <div class="space-y-1 border-b border-[var(--border)] pb-3.5">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[20px] text-[var(--accent)]">lock</span>
          <h1 class="text-base sm:text-lg font-semibold text-[var(--text)] tracking-tight">
            Portal Masuk Kelas 03SIFE003
          </h1>
        </div>
        <p class="text-xs text-[var(--muted)]">
          Masuk menggunakan NIM Mahasiswa atau akun Pengurus Kelas
        </p>
      </div>

      <!-- Error Message Banner -->
      <div
        v-if="errorMessage || error"
        class="p-2.5 rounded-[8px] border border-red-500/40 bg-red-500/10 text-xs text-red-700 dark:text-red-300 font-medium"
      >
        {{ errorMessage || error }}
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-3.5">
        <div>
          <label for="username" class="block text-xs font-semibold text-[var(--text)] mb-1">
            NIM Mahasiswa / Username
          </label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            autocomplete="username"
            placeholder="Contoh: 251011700310 atau admin"
            class="w-full px-3 py-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--muted)] text-xs sm:text-sm focus:outline-none focus:border-[var(--accent)] transition-colors font-mono"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label for="password" class="text-xs font-semibold text-[var(--text)]">
              Kata Sandi
            </label>
            <span class="text-[11px] text-[var(--muted)]">
              Bawaan: sama dengan NIM
            </span>
          </div>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            placeholder="Masukkan NIM atau kata sandi..."
            class="w-full px-3 py-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--muted)] text-xs sm:text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        <!-- Cloudflare Turnstile Widget (aktif jika VITE_TURNSTILE_SITE_KEY diset) -->
        <TurnstileWidget
          v-if="isTurnstileEnabled"
          ref="turnstileRef"
          :site-key="turnstileSiteKey"
          :theme="isDark ? 'dark' : 'light'"
          action="login"
          @verify="onTurnstileVerify"
          @expire="onTurnstileExpire"
          @error="onTurnstileError"
        />

        <button
          type="submit"
          :disabled="loading || (isTurnstileEnabled && !turnstileToken)"
          class="w-full py-2 px-4 rounded-[6px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg aria-hidden="true" v-if="loading" class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ loading ? "Memproses Masuk..." : "Masuk ke Akun" }}</span>
        </button>
      </form>

      <!-- Instructions Hint -->
      <div class="p-3 rounded-[8px] bg-[var(--bg)] border border-[var(--border)] text-[11px] text-[var(--muted)] space-y-1.5">
        <div class="flex items-start gap-1.5">
          <span class="text-[var(--accent)] font-semibold shrink-0">Mahasiswa:</span>
          <span>Username dan kata sandi awal adalah <strong>NIM Anda</strong> yang terdaftar di kelas.</span>
        </div>
        <div class="flex items-start gap-1.5">
          <span class="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">Pengurus:</span>
          <span>Mahasiswa yang telah disahkan sebagai admin dapat mengakses Zona Pengurus menggunakan NIM-nya atau akun <code class="font-mono">admin</code>.</span>
        </div>
      </div>

      <!-- Back to Portal Link -->
      <div class="text-center pt-1">
        <router-link
          to="/"
          class="text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors inline-flex items-center gap-1 font-medium"
        >
          <span>← Kembali ke Portal Kelas</span>
        </router-link>
      </div>

    </div>
  </div>
</template>
