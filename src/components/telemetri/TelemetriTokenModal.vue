<script setup>
import { ref, computed, watch } from "vue";
import { useTelemetri, parseMentariAuth } from "@/composables/useTelemetri";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "saved"]);

const { token, userNim, userName, saveToken, clearToken, saveUserNim, hasToken } = useTelemetri();

const inputSession = ref(token.value);
const inputNim = ref(userNim.value);
const showManualNim = ref(false);
const saveSuccess = ref(false);
const scriptCopied = ref(false);

const SCRIPT_COMMAND = "copy(localStorage.getItem('access'))";

const parsedPreview = computed(() => parseMentariAuth(inputSession.value));

// Auto sync NIM if preview detects a valid NIM and user hasn't typed a custom one
watch(
  () => parsedPreview.value,
  (preview) => {
    if (preview.valid && preview.nim && !showManualNim.value) {
      inputNim.value = preview.nim;
    }
  }
);

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      inputSession.value = token.value;
      inputNim.value = userNim.value;
      saveSuccess.value = false;
      scriptCopied.value = false;
    }
  }
);

async function handleCopyScript() {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(SCRIPT_COMMAND);
      scriptCopied.value = true;
      setTimeout(() => {
        scriptCopied.value = false;
      }, 2000);
    }
  } catch {
    // fallback
  }
}

async function handlePasteFromClipboard() {
  try {
    if (navigator?.clipboard?.readText) {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        inputSession.value = clipText.trim();
      }
    }
  } catch {
    // Clipboard permission denied or unsupported
  }
}

function handleSave() {
  const parsed = parseMentariAuth(inputSession.value);
  saveToken(inputSession.value);
  if (inputNim.value) {
    saveUserNim(inputNim.value);
  } else if (parsed.nim) {
    saveUserNim(parsed.nim);
  }

  saveSuccess.value = true;
  setTimeout(() => {
    saveSuccess.value = false;
    emit("saved");
    emit("close");
  }, 600);
}

function handleClear() {
  clearToken();
  inputSession.value = "";
  inputNim.value = "";
  emit("close");
}
</script>

<template>
  <dialog
    v-if="isOpen"
    open
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs w-full h-full max-w-none max-h-none border-none m-0"
    aria-labelledby="modal-title"
    @click.self="emit('close')"
    @keydown.esc="emit('close')"
  >
    <div
      class="w-full max-w-lg mk-card shadow-xl p-4 sm:p-5 space-y-4 max-h-[92vh] overflow-y-auto"
    >
      <!-- Header -->
      <div class="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div>
          <h3 id="modal-title" class="text-sm font-semibold text-[var(--text)]">
            Hubungkan Sesi Mentari
          </h3>
          <p class="text-xs text-[var(--muted)] mt-0.5">
            Cukup tempel data sesi Mentari, NIM & profil Anda terdeteksi otomatis
          </p>
        </div>

        <button
          type="button"
          @click="emit('close')"
          class="mk-btn !p-1"
          aria-label="Tutup modal"
        >
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <!-- Quick Script Helper Card -->
      <div class="p-3 rounded-[8px] bg-[var(--bg)] border border-[var(--border)] space-y-2 text-xs">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-[var(--text)] flex items-center gap-1.5">
            <span class="material-symbols-outlined text-amber-500 text-[16px]">bolt</span>
            <span>Cara 1-Klik Salin dari Browser</span>
          </span>
          <span class="text-[11px] text-[var(--muted)] font-mono">F12 &rarr; Console</span>
        </div>

        <p class="text-[11px] text-[var(--muted)] leading-relaxed">
          Buka tab <a href="https://mentari.unpam.ac.id" target="_blank" rel="noopener noreferrer" class="text-[var(--accent)] underline font-semibold">mentari.unpam.ac.id</a> (kondisi sudah login), tekan <kbd class="px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded font-mono text-[10px]">F12</kbd>, lalu jalankan perintah ini di Console:
        </p>

        <!-- Script Command Box -->
        <div class="flex items-center gap-2 bg-slate-900 text-slate-100 p-2 rounded-[6px] font-mono text-[11px] border border-slate-700">
          <code class="flex-1 truncate pl-1 select-all text-emerald-400">{{ SCRIPT_COMMAND }}</code>
          <button
            type="button"
            @click="handleCopyScript"
            class="px-2.5 py-1 rounded-[6px] bg-blue-600 hover:bg-blue-700 text-white font-sans font-semibold text-[11px] transition-colors cursor-pointer shrink-0 flex items-center gap-1"
          >
            <span class="material-symbols-outlined text-[14px]">
              {{ scriptCopied ? 'check' : 'content_copy' }}
            </span>
            <span>{{ scriptCopied ? 'Tersalin!' : 'Salin Perintah' }}</span>
          </button>
        </div>
      </div>

      <!-- Form Body -->
      <form @submit.prevent="handleSave" class="space-y-3.5 text-xs">
        <!-- Session Input Area -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label for="mentari-session" class="font-semibold text-[var(--text)]">
              Sesi Mentari (Value "access" / JWT Token) <span class="text-red-500">*</span>
            </label>
            <button
              type="button"
              @click="handlePasteFromClipboard"
              class="text-[11px] text-[var(--accent)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span class="material-symbols-outlined text-[14px]">content_paste</span>
              <span>Tempel dari Clipboard</span>
            </button>
          </div>

          <textarea
            id="mentari-session"
            v-model="inputSession"
            rows="3"
            required
            placeholder='Tempel di sini, contoh: [{"role":"MAHASISWA","token":"eyJ..."}] atau token JWT langsung'
            class="w-full p-2.5 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--muted)] font-mono text-[11px] focus:border-[var(--accent)] focus:outline-none"
          ></textarea>
        </div>

        <!-- Live Detected Session Profile Card -->
        <div
          v-if="parsedPreview.valid"
          class="p-3 rounded-[8px] bg-[var(--bg)] border border-emerald-500/40 space-y-1.5"
        >
          <div class="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
            <span class="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">verified</span>
              <span>Profil Sesi Terdeteksi</span>
            </span>
            <span class="mk-badge mk-badge-ok font-mono !text-[10px] uppercase">
              {{ parsedPreview.role || 'MAHASISWA' }}
            </span>
          </div>

          <div class="text-[11px]">
            <div class="mk-kv">
              <span class="k">Nama Mahasiswa</span>
              <span class="font-semibold text-[var(--text)] truncate">
                {{ parsedPreview.fullname || userName || 'Teridentifikasi' }}
              </span>
            </div>
            <div class="mk-kv">
              <span class="k">NIM Mahasiswa</span>
              <span class="font-mono font-semibold text-[var(--text)] tabular-nums">
                {{ parsedPreview.nim || inputNim || '-' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Manual NIM Override (Optional Toggle) -->
        <div class="space-y-1.5 pt-0.5">
          <button
            type="button"
            @click="showManualNim = !showManualNim"
            class="text-[11px] text-[var(--muted)] hover:text-[var(--accent)] flex items-center gap-1 font-semibold cursor-pointer"
          >
            <span class="material-symbols-outlined text-[14px]">
              {{ showManualNim ? 'expand_less' : 'tune' }}
            </span>
            <span>{{ showManualNim ? 'Sembunyikan Pengaturan NIM Manual' : 'Sesuaikan NIM Manual (Opsional)' }}</span>
          </button>

          <div v-if="showManualNim" class="space-y-1 pl-1 pt-1">
            <label for="mentari-nim" class="block font-semibold text-[var(--text)]">
              NIM Mahasiswa
            </label>
            <input
              id="mentari-nim"
              v-model="inputNim"
              type="text"
              placeholder="Contoh: 251011700088"
              class="w-full p-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] font-mono font-semibold text-xs focus:border-[var(--accent)] focus:outline-none"
            />
            <p class="text-[10px] text-[var(--muted)]">
              Hanya ubah bila Anda ingin memantau akun NIM yang berbeda dari sesi login Anda.
            </p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-between pt-2.5 border-t border-[var(--border)]">
          <button
            v-if="hasToken"
            type="button"
            @click="handleClear"
            class="mk-btn !border-red-500/35 !text-red-600 dark:!text-red-400"
          >
            Hapus Sesi
          </button>
          <div v-else></div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="emit('close')"
              class="mk-btn"
            >
              Batal
            </button>
            <button
              type="submit"
              class="px-3.5 py-1.5 rounded-[6px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <span v-if="saveSuccess" class="material-symbols-outlined text-[15px]">check</span>
              <span>{{ saveSuccess ? 'Tersambung!' : 'Simpan & Hubungkan' }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </dialog>
</template>
