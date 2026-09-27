<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { useAdminAuth } from "@/composables/useAdminAuth";
import {
  normalizeWhatsAppNumber,
  formatPhoneDisplay,
  getWhatsAppLink,
} from "@/utils/phoneUtils";

const emit = defineEmits(["toast"]);
const { token } = useAdminAuth();

const lecturers = ref([]);
const courses = ref([]);
const loading = ref(false);
const searchQuery = ref("");

// Modal Create/Edit state
const isModalOpen = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const submitting = ref(false);

const form = reactive({
  name: "",
  phone: "",
  email: "",
  note: "",
  courseIds: [],
});

const normalizedPhonePreview = computed(() => {
  return form.phone ? normalizeWhatsAppNumber(form.phone) : null;
});

async function fetchCourses() {
  try {
    const res = await fetch("/api/presensi/courses");
    const json = await res.json();
    if (json.success) {
      courses.value = json.data;
    }
  } catch (err) {
    console.error("Gagal memuat mata kuliah:", err);
  }
}

async function fetchLecturers() {
  loading.value = true;
  try {
    const res = await fetch("/api/presensi/lecturers");
    const json = await res.json();
    if (json.success) {
      lecturers.value = json.data;
    }
  } catch (err) {
    emit("toast", err.message || "Gagal memuat data dosen.", "error");
  } finally {
    loading.value = false;
  }
}

const stats = computed(() => {
  const total = lecturers.value.length;
  const withPhone = lecturers.value.filter((l) => Boolean(l.phone)).length;
  const withoutPhone = total - withPhone;
  return { total, withPhone, withoutPhone };
});

const filteredLecturers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return lecturers.value;

  const normQ = normalizeWhatsAppNumber(q);

  return lecturers.value.filter((l) => {
    const matchName = l.name.toLowerCase().includes(q);
    const matchPhone = l.phone && (l.phone.includes(q) || (normQ && l.phone.includes(normQ)));
    const matchCourse = Array.isArray(l.courses) && l.courses.some((c) => c.name.toLowerCase().includes(q));
    return matchName || matchPhone || matchCourse;
  });
});

function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  form.name = "";
  form.phone = "";
  form.email = "";
  form.note = "";
  form.courseIds = [];
  isModalOpen.value = true;
}

function openEditModal(lec) {
  isEditing.value = true;
  editingId.value = lec.id;
  form.name = lec.name;
  form.phone = lec.phone ? formatPhoneDisplay(lec.phone) : "";
  form.email = lec.email || "";
  form.note = lec.note || "";
  form.courseIds = Array.isArray(lec.courses) ? lec.courses.map((c) => c.id) : [];
  isModalOpen.value = true;
}

function toggleCourseSelection(courseId) {
  const idx = form.courseIds.indexOf(courseId);
  if (idx === -1) {
    form.courseIds.push(courseId);
  } else {
    form.courseIds.splice(idx, 1);
  }
}

async function handleSubmit() {
  if (!form.name.trim()) {
    emit("toast", "Nama dosen wajib diisi.", "error");
    return;
  }

  let normPhone = null;
  if (form.phone.trim()) {
    normPhone = normalizeWhatsAppNumber(form.phone);
    if (!normPhone) {
      emit("toast", "Format nomor WhatsApp tidak valid. Masukkan format seperti 0812-xxxx-xxxx atau +628...", "error");
      return;
    }
  }

  submitting.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      phone: normPhone,
      email: form.email.trim() || null,
      note: form.note.trim() || null,
      courseIds: form.courseIds,
    };

    const url = isEditing.value
      ? `/api/presensi/lecturers?id=${encodeURIComponent(editingId.value)}`
      : "/api/presensi/lecturers";
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
      emit("toast", isEditing.value ? "Data dosen berhasil diperbarui." : "Dosen baru berhasil ditambahkan.");
      isModalOpen.value = false;
      await fetchLecturers();
      await fetchCourses();
    } else {
      emit("toast", json.message || "Gagal menyimpan data dosen.", "error");
    }
  } catch (err) {
    emit("toast", err.message || "Gagal menyimpan data dosen.", "error");
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(lec) {
  const confirmed = window.confirm(`Hapus dosen "${lec.name}"?`);
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/presensi/lecturers?id=${encodeURIComponent(lec.id)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    });
    const json = await res.json();
    if (json.success) {
      emit("toast", "Data dosen berhasil dihapus.");
      await fetchLecturers();
      await fetchCourses();
    } else {
      emit("toast", json.message || "Gagal menghapus dosen.", "error");
    }
  } catch (err) {
    emit("toast", err.message || "Gagal menghapus dosen.", "error");
  }
}

onMounted(async () => {
  await Promise.all([fetchLecturers(), fetchCourses()]);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Top Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold">Total Dosen Pengampu</p>
        <p class="text-xl font-bold text-slate-900 dark:text-white mt-1">{{ stats.total }} Orang</p>
      </div>

      <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold">WhatsApp Terdata</p>
        <p class="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{{ stats.withPhone }} Dosen</p>
      </div>

      <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold">Belum Ada Nomor WA</p>
        <p class="text-xl font-bold text-amber-500 mt-1">{{ stats.withoutPhone }} Dosen</p>
      </div>
    </div>

    <!-- Filter & Action Controls -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="relative w-full sm:w-72">
        <label for="search-lecturer-input" class="sr-only">Cari dosen, WA, atau matkul</label>
        <input
          id="search-lecturer-input"
          v-model="searchQuery"
          type="text"
          placeholder="Cari dosen, WA, atau matkul..."
          aria-label="Cari dosen, WA, atau matkul"
          class="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <svg
          class="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <button
        @click="openCreateModal"
        class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Tambah Dosen</span>
      </button>
    </div>

    <!-- Lecturers Table Card -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-xs text-slate-400">
        Memuat data dosen...
      </div>

      <div v-else-if="filteredLecturers.length === 0" class="p-10 text-center space-y-2">
        <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Tidak ada data dosen
        </p>
        <p class="text-xs text-slate-400">
          Klik tombol "+ Tambah Dosen" untuk mendaftarkan dosen pengampu baru.
        </p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <th class="p-4 w-12 text-center">No</th>
              <th class="p-4">Nama Dosen Pengampu</th>
              <th class="p-4 w-44">WhatsApp</th>
              <th class="p-4 w-60">Mata Kuliah yang Diampu</th>
              <th class="p-4 w-24 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              v-for="(lec, idx) in filteredLecturers"
              :key="lec.id"
              class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors"
            >
              <td class="p-4 text-center font-mono text-slate-400">
                {{ idx + 1 }}
              </td>

              <td class="p-4 font-semibold text-slate-900 dark:text-white">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                    {{ lec.name.charAt(0) }}
                  </div>
                  <div>
                    <p class="font-bold text-slate-900 dark:text-white">{{ lec.name }}</p>
                    <p v-if="lec.email" class="text-[11px] text-slate-400 font-mono">{{ lec.email }}</p>
                  </div>
                </div>
              </td>

              <td class="p-4">
                <a
                  v-if="lec.phone"
                  :href="getWhatsAppLink(lec.phone)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors group"
                  title="Buka Chat WhatsApp Dosen"
                >
                  <svg class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm.01 1.67c4.55 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.83a8.176 8.176 0 01-5.82 2.41c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.95-.19-.3a8.188 8.188 0 01-1.25-4.54c0-4.55 3.7-8.24 8.24-8.24zm4.51 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.98-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.01-1.24-.74-.66-1.25-1.48-1.39-1.73-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.68.32-.23.25-.89.87-.89 2.12s.91 2.46 1.04 2.63c.13.17 1.79 2.73 4.33 3.83.61.26 1.08.42 1.45.54.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.12-.22-.19-.47-.32z"/>
                  </svg>
                  <span>wa.me/+{{ normalizeWhatsAppNumber(lec.phone) }}</span>
                  <svg class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <span v-else class="text-slate-400 dark:text-slate-600 font-mono text-[11px]">-</span>
              </td>

              <td class="p-4">
                <div v-if="lec.courses && lec.courses.length" class="flex flex-wrap gap-1">
                  <span
                    v-for="c in lec.courses"
                    :key="c.id"
                    class="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-[10px] font-semibold text-blue-700 dark:text-blue-300"
                  >
                    {{ c.name }}
                  </span>
                </div>
                <span v-else class="text-slate-400 dark:text-slate-600 text-[11px] italic">
                  Belum ditugaskan ke matkul
                </span>
              </td>

              <td class="p-4 text-right space-x-1">
                <button
                  @click="openEditModal(lec)"
                  class="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                  title="Edit Dosen"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  @click="handleDelete(lec)"
                  class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                  title="Hapus Dosen"
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

    <!-- Modal Create / Edit Dosen -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 space-y-4 shadow-2xl">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 class="text-sm font-bold text-slate-900 dark:text-white">
            {{ isEditing ? "Edit Dosen Pengampu" : "Tambah Dosen Baru" }}
          </h2>
          <button @click="isModalOpen = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer">
            ✕
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-3.5 text-xs">
          <div>
            <label for="form-lec-name" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap & Gelar Dosen
            </label>
            <input
              id="form-lec-name"
              v-model="form.name"
              type="text"
              required
              placeholder="Contoh: AFIF EFENDI, S.Kom., M.Kom."
              class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label for="form-lec-phone" class="font-semibold text-slate-700 dark:text-slate-300">
                Nomor WhatsApp <span class="font-normal text-slate-400">(Opsional)</span>
              </label>
              <span v-if="normalizedPhonePreview" class="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                wa.me/+{{ normalizedPhonePreview }}
              </span>
            </div>
            <input
              id="form-lec-phone"
              v-model="form.phone"
              type="tel"
              placeholder="Contoh: 0812-3456-7890 atau +62812..."
              class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
            />
            <p class="text-[11px] text-slate-400 mt-1">
              Format fleksibel: 08xx, +628xx, strip, atau spasi. Otomatis dinormalisasi.
            </p>
          </div>

          <div>
            <label for="form-lec-email" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Dosen <span class="font-normal text-slate-400">(Opsional)</span>
            </label>
            <input
              id="form-lec-email"
              v-model="form.email"
              type="email"
              placeholder="Contoh: dosen@unpam.ac.id"
              class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <!-- Mata Kuliah Checklist Selection -->
          <div class="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <p class="font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mata Kuliah yang Diampu di Kelas 03SIFE003:
            </p>
            <div class="max-h-36 overflow-y-auto space-y-1.5">
              <label
                v-for="c in courses"
                :key="c.id"
                :for="`lec-course-${c.id}`"
                class="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg"
              >
                <input
                  :id="`lec-course-${c.id}`"
                  type="checkbox"
                  :checked="form.courseIds.includes(c.id)"
                  @change="toggleCourseSelection(c.id)"
                  class="rounded border-slate-300 text-blue-600 cursor-pointer"
                />
                <span class="text-[11px] text-slate-700 dark:text-slate-200 font-medium">
                  {{ c.name }}
                </span>
              </label>
            </div>
          </div>

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
              {{ submitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Tambah Dosen" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
