<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { useAdminAuth } from "@/composables/useAdminAuth";
import { parseExcelStudentText } from "@/utils/smartPaste";

const emit = defineEmits(["toast"]);
const { token } = useAdminAuth();

const students = ref([]);
const courses = ref([]);
const loading = ref(false);
const searchQuery = ref("");
const statusFilter = ref("all"); // 'all' | 'regular' | 'guest'

// Modal Create/Edit state
const isModalOpen = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const submitting = ref(false);

const form = reactive({
  nim: "",
  name: "",
  isGuest: false,
  courseIds: [],
});

// Modal Smart Paste state
const isSmartPasteOpen = ref(false);
const smartPasteText = ref("");
const smartPasteSubmitting = ref(false);

const parsedSmartPaste = computed(() => {
  return parseExcelStudentText(smartPasteText.value);
});

async function fetchCourses() {
  try {
    const res = await fetch("/api/presensi/courses");
    const json = await res.json();
    if (json.success) {
      courses.value = json.data;
    }
  } catch (err) {
    console.error("Gagal memuat daftar matkul:", err);
  }
}

async function fetchStudents() {
  loading.value = true;
  try {
    const res = await fetch("/api/presensi/students");
    const json = await res.json();
    if (json.success) {
      students.value = json.data;
    }
  } catch (err) {
    emit("toast", "Gagal memuat data mahasiswa.", "error");
  } finally {
    loading.value = false;
  }
}

const stats = computed(() => {
  const total = students.value.length;
  const regular = students.value.filter((s) => !s.isGuest).length;
  const guest = total - regular;
  return { total, regular, guest };
});

const filteredStudents = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return students.value.filter((s) => {
    // Search
    if (q) {
      const matchName = s.name.toLowerCase().includes(q);
      const matchNim = s.nim.toLowerCase().includes(q);
      if (!matchName && !matchNim) return false;
    }

    // Filter
    if (statusFilter.value === "regular" && s.isGuest) return false;
    if (statusFilter.value === "guest" && !s.isGuest) return false;

    return true;
  });
});

function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  form.nim = "";
  form.name = "";
  form.isGuest = false;
  form.courseIds = [];
  isModalOpen.value = true;
}

function openEditModal(st) {
  isEditing.value = true;
  editingId.value = st.id;
  form.nim = st.nim;
  form.name = st.name;
  form.isGuest = Boolean(st.isGuest);
  form.courseIds = Array.isArray(st.courseIds) ? [...st.courseIds] : [];
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
  if (!form.nim.trim() || !form.name.trim()) {
    emit("toast", "NIM dan Nama mahasiswa wajib diisi.", "error");
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      nim: form.nim.trim(),
      name: form.name.trim(),
      isGuest: form.isGuest,
      courseIds: form.isGuest ? form.courseIds : [],
    };

    const url = isEditing.value
      ? `/api/presensi/students?id=${encodeURIComponent(editingId.value)}`
      : "/api/presensi/students";
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
      emit("toast", isEditing.value ? "Mahasiswa berhasil diperbarui." : "Mahasiswa baru berhasil ditambahkan.");
      isModalOpen.value = false;
      await fetchStudents();
    } else {
      emit("toast", json.message || "Gagal menyimpan data.", "error");
    }
  } catch (err) {
    emit("toast", err.message || "Gagal menyimpan data.", "error");
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(st) {
  const confirmed = window.confirm(`Hapus mahasiswa "${st.name}" (${st.nim})?`);
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/presensi/students?id=${encodeURIComponent(st.id)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    });
    const json = await res.json();
    if (json.success) {
      emit("toast", "Mahasiswa berhasil dihapus.");
      await fetchStudents();
    } else {
      emit("toast", json.message || "Gagal menghapus mahasiswa.", "error");
    }
  } catch (err) {
    emit("toast", err.message || "Gagal menghapus mahasiswa.", "error");
  }
}

async function handleSmartPasteSubmit() {
  const list = parsedSmartPaste.value;
  if (list.length === 0) {
    emit("toast", "Tidak ada data mahasiswa valid yang terdeteksi.", "error");
    return;
  }

  smartPasteSubmitting.value = true;
  try {
    const res = await fetch("/api/presensi/students", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({ students: list }),
    });

    const json = await res.json();
    if (json.success) {
      emit("toast", `${list.length} mahasiswa berhasil diimpor!`);
      isSmartPasteOpen.value = false;
      smartPasteText.value = "";
      await fetchStudents();
    } else {
      emit("toast", json.message || "Gagal mengimpor data.", "error");
    }
  } catch (err) {
    emit("toast", err.message || "Gagal mengimpor data.", "error");
  } finally {
    smartPasteSubmitting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([fetchStudents(), fetchCourses()]);
});
</script>

<template>
  <div class="space-y-4">
    <!-- Controls & Action Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <!-- Search & Filters -->
      <div class="flex items-center gap-2 flex-wrap flex-1 max-w-lg">
        <div class="relative flex-1 min-w-[200px]">
          <label for="student-search-input" class="sr-only">Cari Mahasiswa</label>
          <input
            id="student-search-input"
            v-model="searchQuery"
            type="text"
            placeholder="Cari nama atau NIM..."
            class="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            @click="statusFilter = 'all'"
            :class="[
              'px-3 py-1 rounded-lg transition-colors cursor-pointer',
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
            ]"
          >
            Semua ({{ stats.total }})
          </button>
          <button
            @click="statusFilter = 'regular'"
            :class="[
              'px-3 py-1 rounded-lg transition-colors cursor-pointer',
              statusFilter === 'regular'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
            ]"
          >
            Reguler ({{ stats.regular }})
          </button>
          <button
            @click="statusFilter = 'guest'"
            :class="[
              'px-3 py-1 rounded-lg transition-colors cursor-pointer',
              statusFilter === 'guest'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
            ]"
          >
            Revisi ({{ stats.guest }})
          </button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2 shrink-0">
        <button
          @click="isSmartPasteOpen = true"
          class="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Smart Paste (Excel)</span>
        </button>

        <button
          @click="openCreateModal"
          class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Tambah Mahasiswa</span>
        </button>
      </div>
    </div>

    <!-- Student Table Card -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-xs text-slate-400">
        Memuat data mahasiswa...
      </div>

      <div v-else-if="filteredStudents.length === 0" class="p-10 text-center space-y-2">
        <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Tidak ada data mahasiswa
        </p>
        <p class="text-xs text-slate-400">
          Klik tombol "+ Tambah Mahasiswa" atau "Smart Paste (Excel)" untuk memasukkan daftar nama.
        </p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <th class="p-4 w-12 text-center">No</th>
              <th class="p-4 w-40">NIM</th>
              <th class="p-4">Nama Mahasiswa</th>
              <th class="p-4 w-32">Status</th>
              <th class="p-4 w-48">Mata Kuliah</th>
              <th class="p-4 w-28 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              v-for="(st, idx) in filteredStudents"
              :key="st.id"
              class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors"
            >
              <td class="p-4 text-center font-mono text-slate-400">
                {{ idx + 1 }}
              </td>
              <td class="p-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                {{ st.nim }}
              </td>
              <td class="p-4 font-semibold text-slate-900 dark:text-white">
                {{ st.name }}
              </td>
              <td class="p-4">
                <span
                  class="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                  :class="[
                    st.isGuest
                      ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                      : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
                  ]"
                >
                  {{ st.isGuest ? 'Revisi' : 'Reguler' }}
                </span>
              </td>
              <td class="p-4 text-slate-500 dark:text-slate-400">
                <span v-if="!st.isGuest" class="text-slate-400">
                  Semua Matkul (03SIFE003)
                </span>
                <div v-else-if="st.courseIds && st.courseIds.length" class="flex flex-wrap gap-1">
                  <span
                    v-for="cid in st.courseIds"
                    :key="cid"
                    class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-700 dark:text-slate-300"
                  >
                    {{ courses.find((c) => c.id === cid)?.name || cid }}
                  </span>
                </div>
                <span v-else class="text-amber-500 text-[11px]">
                  Belum memilih matkul
                </span>
              </td>
              <td class="p-4 text-right space-x-1">
                <button
                  @click="openEditModal(st)"
                  class="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                  title="Edit Mahasiswa"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  @click="handleDelete(st)"
                  class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                  title="Hapus Mahasiswa"
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

    <!-- Modal Create / Edit Mahasiswa -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 space-y-4 shadow-2xl">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 class="text-sm font-bold text-slate-900 dark:text-white">
            {{ isEditing ? "Edit Mahasiswa" : "Tambah Mahasiswa Baru" }}
          </h2>
          <button @click="isModalOpen = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer">
            ✕
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-3.5 text-xs">
          <div>
            <label for="form-nim-input" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nomor Induk Mahasiswa (NIM)
            </label>
            <input
              id="form-nim-input"
              v-model="form.nim"
              type="text"
              required
              placeholder="Contoh: 251011700310"
              class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
            />
          </div>

          <div>
            <label for="form-name-input" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap
            </label>
            <input
              id="form-name-input"
              v-model="form.name"
              type="text"
              required
              placeholder="Contoh: AHMAD FAUZI"
              class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase"
            />
          </div>

          <!-- Status Mahasiswa: Reguler vs Revisi -->
          <div class="pt-1">
            <div class="flex items-center gap-2">
              <input
                id="form-is-guest"
                v-model="form.isGuest"
                type="checkbox"
                class="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <label for="form-is-guest" class="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                Mahasiswa Revisi / Mengulang (Hanya matkul tertentu)
              </label>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5 ml-5">
              Jika tidak dicentang, mahasiswa otomatis terdaftar di semua mata kuliah kelas 03SIFE003.
            </p>
          </div>

          <!-- Course checklist if guest -->
          <div v-if="form.isGuest" class="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <p class="font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pilih Mata Kuliah yang Diambil:
            </p>
            <div class="max-h-40 overflow-y-auto space-y-1.5">
              <div
                v-for="c in courses"
                :key="c.id"
                class="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg"
                @click="toggleCourseSelection(c.id)"
              >
                <input
                  type="checkbox"
                  :checked="form.courseIds.includes(c.id)"
                  class="rounded border-slate-300 text-blue-600"
                />
                <span class="text-[11px] text-slate-700 dark:text-slate-200 font-medium">
                  {{ c.name }}
                </span>
              </div>
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
              {{ submitting ? "Menyimpan..." : "Simpan Mahasiswa" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Smart Paste Excel -->
    <div
      v-if="isSmartPasteOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Smart Paste dari Excel / Google Sheets</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Auto Detect
              </span>
            </h2>
            <p class="text-[11px] text-slate-400 mt-0.5">
              Salin 2 kolom (NIM dan Nama Mahasiswa) dari Excel atau Google Sheets, lalu tempel di bawah.
            </p>
          </div>
          <button @click="isSmartPasteOpen = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer">
            ✕
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label for="smart-paste-textarea" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tempel Data (Ctrl + V):
            </label>
            <textarea
              id="smart-paste-textarea"
              v-model="smartPasteText"
              rows="6"
              placeholder="Contoh:&#10;251011700310	ADAM BURHANUDIN LUBIS&#10;251011700333	AHMAD SANDI"
              class="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <!-- Preview Table -->
          <div v-if="parsedSmartPaste.length > 0" class="space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-emerald-600 dark:text-emerald-400">
                ✓ {{ parsedSmartPaste.length }} mahasiswa terdeteksi
              </span>
            </div>
            <div class="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table class="w-full text-left text-[11px]">
                <thead class="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th class="p-2 w-10">No</th>
                    <th class="p-2 w-32">NIM</th>
                    <th class="p-2">Nama</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr v-for="(p, i) in parsedSmartPaste" :key="p.nim">
                    <td class="p-2 text-slate-400">{{ i + 1 }}</td>
                    <td class="p-2 font-mono font-semibold">{{ p.nim }}</td>
                    <td class="p-2">{{ p.name }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            @click="isSmartPasteOpen = false"
            class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            @click="handleSmartPasteSubmit"
            :disabled="smartPasteSubmitting || parsedSmartPaste.length === 0"
            class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer disabled:opacity-50"
          >
            {{ smartPasteSubmitting ? "Mengimpor..." : `Impor ${parsedSmartPaste.length} Mahasiswa` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
