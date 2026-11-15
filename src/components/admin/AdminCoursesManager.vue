<script setup>
import { ref, reactive, onMounted } from "vue";
import { useAdminAuth } from "@/composables/useAdminAuth";
import { formatPhoneDisplay } from "@/utils/phoneUtils";
import AdminTableActions from "./AdminTableActions.vue";
import AdminWhatsAppLink from "./AdminWhatsAppLink.vue";

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
        <svg aria-hidden="true" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Tambah Mata Kuliah</span>
      </button>
    </div>

    <!-- Courses Grid/Table -->
    <div class="mk-card overflow-hidden">
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
                <AdminWhatsAppLink
                  :phone="c.lecturerPhone || ''"
                  title="Chat WhatsApp Dosen Pengampu"
                  compact
                />
              </td>
              <td class="p-4 text-slate-600 dark:text-slate-400">
                {{ c.time || "-" }}
              </td>
              <AdminTableActions
                edit-title="Edit Mata Kuliah"
                delete-title="Hapus Mata Kuliah"
                @edit="openEditModal(c)"
                @delete="handleDelete(c)"
              />
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
      <div class="mk-card max-w-md w-full p-5 space-y-4 shadow-xl">
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
