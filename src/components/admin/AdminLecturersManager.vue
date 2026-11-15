<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { useAdminAuth } from "@/composables/useAdminAuth";
import {
  normalizeWhatsAppNumber,
  formatPhoneDisplay,
} from "@/utils/phoneUtils";
import AdminTableActions from "./AdminTableActions.vue";
import AdminWhatsAppLink from "./AdminWhatsAppLink.vue";

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
      <div class="mk-card p-4">
        <p class="text-xs text-[var(--muted)] font-semibold">Total Dosen Pengampu</p>
        <p class="text-xl font-bold font-mono tabular-nums text-[var(--text)] mt-1">{{ stats.total }} Orang</p>
      </div>

      <div class="mk-card p-4">
        <p class="text-xs text-[var(--muted)] font-semibold">WhatsApp Terdata</p>
        <p class="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">{{ stats.withPhone }} Dosen</p>
      </div>

      <div class="mk-card p-4">
        <p class="text-xs text-[var(--muted)] font-semibold">Belum Ada Nomor WA</p>
        <p class="text-xl font-bold font-mono tabular-nums text-amber-500 mt-1">{{ stats.withoutPhone }} Dosen</p>
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
          aria-hidden="true"
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
        <svg aria-hidden="true" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Tambah Dosen</span>
      </button>
    </div>

    <!-- Lecturers Table Card -->
    <div class="mk-card overflow-hidden">
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
                <AdminWhatsAppLink
                  :phone="lec.phone || ''"
                  title="Buka Chat WhatsApp Dosen"
                />
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

              <AdminTableActions
                edit-title="Edit Dosen"
                delete-title="Hapus Dosen"
                @edit="openEditModal(lec)"
                @delete="handleDelete(lec)"
              />
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
      <div class="mk-card max-w-md w-full p-5 space-y-4 shadow-xl">
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
