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
      router.replace("/pengurus");
    } else {
      router.replace("/");
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
      router.push("/pengurus");
    } else {
      router.push("/");
    }
  } else {
    errorMessage.value = result.message || "Gagal masuk. Periksa kembali akun Anda.";
    turnstileToken.value = "";
    turnstileRef.value?.reset();
  }
}
</script>

<template>
  <div class="w-full max-w-md mx-auto py-12 px-4">
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
      
      <!-- Header -->
      <div class="text-center space-y-2">
        <div class="inline-flex p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mb-1">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 class="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Portal Masuk Kelas 03SIFE003
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Masuk menggunakan NIM Mahasiswa atau akun Pengurus Kelas
        </p>
      </div>

      <!-- Error Message Banner -->
      <div
        v-if="errorMessage || error"
        class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 font-medium"
      >
        {{ errorMessage || error }}
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label for="username" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            NIM Mahasiswa / Username
          </label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            autocomplete="username"
            placeholder="Contoh: 251011700310 atau admin"
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label for="password" class="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Kata Sandi
            </label>
            <span class="text-[11px] text-slate-400 font-normal">
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
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
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
          class="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg v-if="loading" class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ loading ? "Memproses Masuk..." : "Masuk ke Akun" }}</span>
        </button>
      </form>

      <!-- Instructions Hint -->
      <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5">
        <div class="flex items-start gap-1.5">
          <span class="text-blue-600 dark:text-blue-400 font-bold shrink-0">🎓 Mahasiswa:</span>
          <span>Username dan kata sandi awal adalah <strong>NIM Anda</strong> yang terdaftar di kelas.</span>
        </div>
        <div class="flex items-start gap-1.5">
          <span class="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">🛡️ Pengurus:</span>
          <span>Mahasiswa yang telah disahkan sebagai admin dapat mengakses Zona Pengurus menggunakan NIM-nya atau akun <code>admin</code>.</span>
        </div>
      </div>

      <!-- Back to Portal Link -->
      <div class="text-center pt-2">
        <router-link
          to="/"
          class="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1 font-medium"
        >
          <span>← Kembali ke Portal Kelas</span>
        </router-link>
      </div>

    </div>
  </div>
</template>
