<script setup>
import { ref, reactive, onMounted } from "vue";
import { useAdminAuth } from "@/composables/useAdminAuth";
import {
  normalizeWhatsAppNumber,
  formatPhoneDisplay,
  getWhatsAppLink,
} from "@/utils/phoneUtils";

const emit = defineEmits(["toast"]);
const { token } = useAdminAuth();

const courses = ref([]);
const lecturers = ref([]);
const loading = ref(false);

// Modal state
const isModalOpen = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const submitting = ref(false);

const form = reactive({
  code: "",
  name: "",
  className: "03SIFE003",
  lecturerId: "",
  lecturer: "",
  time: "",
});

async function fetchCourses() {
  loading.value = true;
  try {
    const res = await fetch("/api/presensi/courses");
    const json = await res.json();
    if (json.success) {
      courses.value = json.data;
    }
  } catch (err) {
    emit("toast", err.message || "Gagal memuat daftar mata kuliah.", "error");
  } finally {
    loading.value = false;
  }
}

async function fetchLecturers() {
  try {
    const res = await fetch("/api/presensi/lecturers");
    const json = await res.json();
    if (json.success) {
      lecturers.value = json.data;
    }
  } catch (err) {
    console.error("Gagal memuat data dosen:", err);
  }
}

function handleLecturerChange(e) {
  const val = e.target.value;
  form.lecturerId = val;
  const found = lecturers.value.find((l) => l.id === val);
  if (found) {
    form.lecturer = found.name;
  }
}

function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  form.code = "";
  form.name = "";
  form.className = "03SIFE003";
  form.lecturerId = "";
  form.lecturer = "";
  form.time = "";
  isModalOpen.value = true;
}

function openEditModal(c) {
  isEditing.value = true;
  editingId.value = c.id;
  form.code = c.code || "";
  form.name = c.name;
  form.className = c.className || "03SIFE003";
  form.lecturerId = c.lecturerId || "";
  form.lecturer = c.lecturer || "";
  form.time = c.time || "";
  isModalOpen.value = true;
}

async function handleSubmit() {
  if (!form.name.trim()) {
    emit("toast", "Nama mata kuliah wajib diisi.", "error");
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      className: form.className.trim(),
      lecturerId: form.lecturerId || null,
      lecturer: form.lecturer.trim(),
      time: form.time.trim(),
    };

    const url = isEditing.value
      ? `/api/presensi/courses?id=${encodeURIComponent(editingId.value)}`
      : "/api/presensi/courses";
    const method = isEditing.value ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (json.success) {
      emit("toast", isEditing.value ? "Mata kuliah berhasil diperbarui." : "Mata kuliah baru berhasil ditambahkan.");
      isModalOpen.value = false;
      await fetchCourses();
    } else {
      emit("toast", json.message || "Gagal menyimpan data.", "error");
    }
  } catch (err) {
    emit("toast", err.message || "Gagal menyimpan data.", "error");
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(c) {
  const confirmed = window.confirm(`Hapus mata kuliah "${c.name}"?`);
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/presensi/courses?id=${encodeURIComponent(c.id)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    });
    const json = await res.json();
    if (json.success) {
      emit("toast", "Mata kuliah berhasil dihapus.");
      await fetchCourses();
    } else {
      emit("toast", json.message || "Gagal menghapus mata kuliah.", "error");
    }
  } catch (err) {
    emit("toast", err.message || "Gagal menghapus mata kuliah.", "error");
  }
}

onMounted(async () => {
  await Promise.all([fetchCourses(), fetchLecturers()]);
});
</script>

<template>
  <div class="space-y-4">
    <!-- Header Controls -->
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Total: <strong class="text-slate-800 dark:text-slate-200">{{ courses.length }} Mata Kuliah</strong>
        </h2>
      </div>

      <button
        @click="openCreateModal"
        class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Tambah Mata Kuliah</span>
      </button>
    </div>

    <!-- Courses Grid/Table -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-xs text-slate-400">
        Memuat data mata kuliah...
      </div>

      <div v-else-if="courses.length === 0" class="p-10 text-center space-y-2">
        <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Belum ada mata kuliah
        </p>
        <p class="text-xs text-slate-400">
          Klik tombol "+ Tambah Mata Kuliah" untuk menambahkan matkul semester ini.
        </p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <th class="p-4 w-12 text-center">No</th>
              <th class="p-4 w-32">Kode</th>
              <th class="p-4">Nama Mata Kuliah</th>
              <th class="p-4 w-60">Dosen Pengampu</th>
              <th class="p-4 w-44">Jadwal Kuliah</th>
              <th class="p-4 w-28 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              v-for="(c, idx) in courses"
              :key="c.id"
              class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors"
            >
              <td class="p-4 text-center font-mono text-slate-400">
                {{ idx + 1 }}
              </td>
              <td class="p-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                {{ c.code || "-" }}
              </td>
              <td class="p-4 font-semibold text-slate-900 dark:text-white">
                <div>{{ c.name }}</div>
                <div class="text-[10px] text-slate-400 font-normal">Kelas: {{ c.className }}</div>
              </td>
              <td class="p-4 text-slate-700 dark:text-slate-300 font-medium">
                <div>{{ c.lecturer || "-" }}</div>
                <a
                  v-if="c.lecturerPhone"
                  :href="getWhatsAppLink(c.lecturerPhone)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 mt-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline"
                  title="Chat WhatsApp Dosen Pengampu"
                >
                  <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm.01 1.67c4.55 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.83a8.176 8.176 0 01-5.82 2.41c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.95-.19-.3a8.188 8.188 0 01-1.25-4.54c0-4.55 3.7-8.24 8.24-8.24zm4.51 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.98-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.01-1.24-.74-.66-1.25-1.48-1.39-1.73-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.68.32-.23.25-.89.87-.89 2.12s.91 2.46 1.04 2.63c.13.17 1.79 2.73 4.33 3.83.61.26 1.08.42 1.45.54.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.12-.22-.19-.47-.32z"/>
                  </svg>
                  <span>wa.me/+{{ normalizeWhatsAppNumber(c.lecturerPhone) }}</span>
                </a>
              </td>
              <td class="p-4 text-slate-600 dark:text-slate-400">
                {{ c.time || "-" }}
              </td>
              <td class="p-4 text-right space-x-1">
                <button
                  @click="openEditModal(c)"
                  class="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                  title="Edit Mata Kuliah"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  @click="handleDelete(c)"
                  class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                  title="Hapus Mata Kuliah"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Create / Edit Mata Kuliah -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 space-y-4 shadow-2xl">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 class="text-sm font-bold text-slate-900 dark:text-white">
            {{ isEditing ? "Edit Mata Kuliah" : "Tambah Mata Kuliah Baru" }}
          </h2>
          <button @click="isModalOpen = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer">
            ✕
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-3.5 text-xs">
          <div>
            <label for="course-code-input" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kode Mata Kuliah
            </label>
            <input
              id="course-code-input"
              v-model="form.code"
              type="text"
              placeholder="Contoh: 22SIF0132"
              class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase"
            />
          </div>

          <div>
            <label for="course-name-input" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Mata Kuliah
            </label>
            <input
              id="course-name-input"
              v-model="form.name"
              type="text"
              required
              placeholder="Contoh: REKAYASA WEB"
              class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium uppercase"
            />
          </div>

          <div>
            <label for="course-lecturer-select" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pilih Dosen Pengampu (Master Dosen)
            </label>
            <select
              id="course-lecturer-select"
              v-model="form.lecturerId"
              @change="handleLecturerChange"
              class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white mb-2"
            >
              <option value="">-- Pilih dari Master Dosen (atau ketik manual di bawah) --</option>
              <option v-for="l in lecturers" :key="l.id" :value="l.id">
                {{ l.name }} {{ l.phone ? '(WA: ' + formatPhoneDisplay(l.phone) + ')' : '' }}
              </option>
            </select>

            <label for="course-lecturer-input" class="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Nama Dosen Pengampu
            </label>
            <input
              id="course-lecturer-input"
              v-model="form.lecturer"
              type="text"
              placeholder="Contoh: AFIF EFENDI, S.Kom., M.Kom."
              class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="course-time-input" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jadwal / Jam
              </label>
              <input
                id="course-time-input"
                v-model="form.time"
                type="text"
                placeholder="Sabtu, 09.20 - 11.00"
                class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label for="course-class-input" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kelas
              </label>
              <input
                id="course-class-input"
                v-model="form.className"
                type="text"
                placeholder="03SIFE003"
                class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              @click="isModalOpen = false"
              class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer disabled:opacity-50"
            >
              {{ submitting ? "Menyimpan..." : "Simpan Mata Kuliah" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
