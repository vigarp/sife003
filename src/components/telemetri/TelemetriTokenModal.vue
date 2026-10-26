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
const bookmarkletCopied = ref(false);

const SCRIPT_COMMAND = "copy(localStorage.getItem('access'))";
const BOOKMARKLET_CODE = `javascript:(async function(){try{const raw=localStorage.getItem("access");if(!raw)return alert("❌ Silakan login ke Mentari terlebih dahulu!");const access=JSON.parse(raw);const token=(access.find(i=>i.role==="MAHASISWA"&&i.token)||access[0])?.token;if(!token)return alert("❌ Token tidak ditemukan!");const headers={Authorization:"Bearer "+token,Accept:"application/json"};const notif=document.createElement("div");notif.style="position:fixed;top:20px;right:20px;z-index:999999;background:#4f46e5;color:white;padding:12px 20px;border-radius:12px;font-family:sans-serif;font-size:13px;font-weight:bold;box-shadow:0 10px 25px rgba(0,0,0,0.3);";notif.innerHTML="🔭 Sedang memindai forum kelas...";document.body.appendChild(notif);const courses=(await fetch("/api/user-course?page=1&limit=100",{headers}).then(r=>r.json())).data||[];const path=window.location.pathname;const matchCourse=courses.find(c=>path.includes(c.kode_course))||courses.find(c=>(c.coursename||"").includes("ARSITEKTUR"))||courses[0];const targetCourse=matchCourse?.kode_course;const pertNum=8;const detail=await fetch("/api/user-course/"+targetCourse,{headers}).then(r=>r.json());const sec=detail.data?.find(s=>s.kode_section==="PERTEMUAN_"+pertNum);const forum=sec?.sub_section?.find(s=>s.kode_template==="FORUM_DISKUSI");let forumTopics=[],topicReplies=[];if(forum?.id&&!forum.warningAlert){const topicRes=await fetch("/api/forum/topic/"+forum.id,{headers}).then(r=>r.json());forumTopics=topicRes.topics||[];for(const t of forumTopics){const reps=await fetch("/api/forum/topic/"+forum.id+"/replies?id_topic="+t.id,{headers}).then(r=>r.json());if(Array.isArray(reps)){reps.forEach(r=>{r._topicJudul=t.judul;topicReplies.push(r);});}}}notif.innerHTML="✅ Selesai! Membuka Telemetri...";const snap={courses,selectedCourseKode:targetCourse,selectedPertemuanNum:pertNum,courseDetail:detail,forumTopics,topicReplies};const encoded=encodeURIComponent(JSON.stringify(snap));window.open("https://sife003.vercel.app/telemetri#snapshot="+encoded,"_blank");setTimeout(()=>notif.remove(),2000);}catch(e){alert("❌ Error: "+e.message);}})();`;

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

async function handleCopyBookmarklet() {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(BOOKMARKLET_CODE);
      bookmarkletCopied.value = true;
      setTimeout(() => {
        bookmarkletCopied.value = false;
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
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs w-full h-full max-w-none max-h-none border-none m-0 animate-in fade-in duration-200"
    aria-labelledby="modal-title"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 md:p-6 space-y-4 max-h-[92vh] overflow-y-auto"
    >
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <span class="material-symbols-outlined text-[20px]">key</span>
          </div>
          <div>
            <h3 id="modal-title" class="text-base font-bold text-slate-900 dark:text-white">
              Hubungkan Sesi Mentari
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Cukup tempel data sesi Mentari, NIM & profil Anda terdeteksi otomatis
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="emit('close')"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Tutup modal"
        >
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <!-- Quick Script Helper Card -->
      <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-xs">
        <div class="flex items-center justify-between">
          <span class="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span class="material-symbols-outlined text-amber-500 text-[18px]">bolt</span>
            <span>Cara 1-Klik Salin dari Browser</span>
          </span>
          <span class="text-[11px] text-slate-400 font-mono">F12 &rarr; Console</span>
        </div>

        <p class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
          Buka tab <a href="https://mentari.unpam.ac.id" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 underline font-semibold">mentari.unpam.ac.id</a> (kondisi sudah login), tekan <kbd class="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono text-[10px]">F12</kbd>, lalu jalankan perintah ini di Console:
        </p>

        <!-- Script Command Box -->
        <div class="flex items-center gap-2 bg-slate-900 text-slate-100 p-2 rounded-xl font-mono text-[11px] border border-slate-700">
          <code class="flex-1 truncate pl-1 select-all text-emerald-400">{{ SCRIPT_COMMAND }}</code>
          <button
            type="button"
            @click="handleCopyScript"
            class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-bold text-[11px] transition-colors cursor-pointer shrink-0 flex items-center gap-1"
          >
            <span class="material-symbols-outlined text-[14px]">
              {{ scriptCopied ? 'check' : 'content_copy' }}
            </span>
            <span>{{ scriptCopied ? 'Tersalin!' : 'Salin Perintah' }}</span>
          </button>
        </div>

        <!-- Or 1-Click Bookmarklet (No DevTools needed) -->
        <div class="pt-1 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
          <span class="text-slate-500 dark:text-slate-400">Atau gunakan Bookmarklet (Tanpa buka F12):</span>
          <button
            type="button"
            @click="handleCopyBookmarklet"
            class="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span class="material-symbols-outlined text-[14px]">bookmark</span>
            <span>{{ bookmarkletCopied ? 'Kode Bookmarklet Tersalin!' : 'Salin Kode Bookmarklet' }}</span>
          </button>
        </div>
      </div>

      <!-- Form Body -->
      <form @submit.prevent="handleSave" class="space-y-4 text-xs">
        <!-- Session Input Area -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label for="mentari-session" class="font-semibold text-slate-700 dark:text-slate-300">
              Sesi Mentari (Value "access" / JWT Token) <span class="text-rose-500">*</span>
            </label>
            <button
              type="button"
              @click="handlePasteFromClipboard"
              class="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
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
            class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px] focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
          ></textarea>
        </div>

        <!-- Live Detected Session Profile Card -->
        <div
          v-if="parsedPreview.valid"
          class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-1.5 animate-in fade-in duration-150"
        >
          <div class="flex items-center justify-between pb-1.5 border-b border-emerald-200/60 dark:border-emerald-800/60">
            <span class="text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400">verified</span>
              <span>Profil Sesi Terdeteksi</span>
            </span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 font-bold uppercase">
              {{ parsedPreview.role || 'MAHASISWA' }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
            <div>
              <span class="text-slate-500 dark:text-slate-400 block text-[10px]">Nama Mahasiswa:</span>
              <span class="font-bold text-slate-800 dark:text-slate-100 truncate block">
                {{ parsedPreview.fullname || userName || 'Teridentifikasi' }}
              </span>
            </div>
            <div>
              <span class="text-slate-500 dark:text-slate-400 block text-[10px]">NIM Mahasiswa:</span>
              <span class="font-mono font-bold text-slate-800 dark:text-slate-100 block">
                {{ parsedPreview.nim || inputNim || '-' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Manual NIM Override (Optional Toggle) -->
        <div class="space-y-1.5 pt-1">
          <button
            type="button"
            @click="showManualNim = !showManualNim"
            class="text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 font-semibold cursor-pointer"
          >
            <span class="material-symbols-outlined text-[14px]">
              {{ showManualNim ? 'expand_less' : 'tune' }}
            </span>
            <span>{{ showManualNim ? 'Sembunyikan Pengaturan NIM Manual' : 'Sesuaikan NIM Manual (Opsional)' }}</span>
          </button>

          <div v-if="showManualNim" class="space-y-1 pl-1 pt-1 animate-in fade-in duration-150">
            <label for="mentari-nim" class="block font-semibold text-slate-700 dark:text-slate-300">
              NIM Mahasiswa
            </label>
            <input
              id="mentari-nim"
              v-model="inputNim"
              type="text"
              placeholder="Contoh: 251011700088"
              class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-semibold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
            />
            <p class="text-[10px] text-slate-400 dark:text-slate-500">
              Hanya ubah bila Anda ingin memantau akun NIM yang berbeda dari sesi login Anda.
            </p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            v-if="hasToken"
            type="button"
            @click="handleClear"
            class="px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-semibold transition-colors cursor-pointer text-xs"
          >
            Hapus Sesi
          </button>
          <div v-else></div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="emit('close')"
              class="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer text-xs active:scale-95"
            >
              <span v-if="saveSuccess" class="material-symbols-outlined text-[16px]">check</span>
              <span>{{ saveSuccess ? 'Tersambung!' : 'Simpan & Hubungkan' }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </dialog>
</template>
