<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { useAcademicCalendar, CATEGORIES, CATEGORY_COLORS } from "@/composables/useAcademicCalendar";

const {
  events,
  loading,
  error,
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} = useAcademicCalendar();

const emit = defineEmits(["toast"]);

const searchQuery = ref("");
const selectedCategory = ref("Semua");
const toast = reactive({ show: false, message: "", type: "success" });

function showToast(message, type = "success") {
  toast.message = message;
  toast.type = type;
  toast.show = true;
  emit("toast", message, type);
  setTimeout(() => {
    toast.show = false;
  }, 3500);
}

// Modal Form State
const isModalOpen = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const submitting = ref(false);

const form = reactive({
  title: "",
  category: "event",
  start_date: "",
  end_date: "",
  color: "#3b82f6",
  academic_year: "20261",
  description: "",
});

function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  form.title = "";
  form.category = "event";
  form.start_date = new Date().toISOString().split("T")[0];
  form.end_date = "";
  form.color = CATEGORY_COLORS["event"];
  form.academic_year = "20261";
  form.description = "";
  isModalOpen.value = true;
}

function openEditModal(event) {
  isEditing.value = true;
  editingId.value = event.id;
  form.title = event.title;
  form.category = event.category || "event";
  form.start_date = event.start_date;
  form.end_date = event.end_date || "";
  form.color = event.color || CATEGORY_COLORS[event.category] || "#3b82f6";
  form.academic_year = event.academic_year || "20261";
  form.description = event.description || "";
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  editingId.value = null;
}

function handleCategoryChange() {
  if (CATEGORY_COLORS[form.category]) {
    form.color = CATEGORY_COLORS[form.category];
  }
}

async function handleSubmit() {
  if (!form.title.trim() || !form.start_date) {
    showToast("Judul agenda dan tanggal mulai wajib diisi.", "error");
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      title: form.title.trim(),
      category: form.category,
      start_date: form.start_date,
      end_date: form.end_date ? form.end_date : null,
      color: form.color,
      academic_year: form.academic_year,
      description: form.description.trim(),
    };

    if (isEditing.value) {
      payload.id = editingId.value;
      const res = await updateEvent(payload);
      if (res.success) {
        showToast("Agenda akademik berhasil diperbarui.");
        closeModal();
      } else {
        showToast(res.message || "Gagal memperbarui agenda.", "error");
      }
    } else {
      const res = await createEvent(payload);
      if (res.success) {
        showToast("Agenda akademik berhasil ditambahkan.");
        closeModal();
      } else {
        showToast(res.message || "Gagal menambah agenda.", "error");
      }
    }
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    submitting.value = false;
  }
}

// Delete Confirmation Modal
const isDeleteModalOpen = ref(false);
const deletingEvent = ref(null);

function confirmDelete(event) {
  deletingEvent.value = event;
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
  deletingEvent.value = null;
}

async function handleDelete() {
  if (!deletingEvent.value) return;
  submitting.value = true;
  try {
    const res = await deleteEvent(deletingEvent.value.id);
    if (res.success) {
      showToast("Agenda akademik berhasil dihapus.");
      closeDeleteModal();
    } else {
      showToast(res.message || "Gagal menghapus agenda.", "error");
    }
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    submitting.value = false;
  }
}

// Filtered Events
const filteredEvents = computed(() => {
  return events.value.filter((e) => {
    const matchCat =
      selectedCategory.value === "Semua" || e.category === selectedCategory.value;
    const matchSearch =
      !searchQuery.value.trim() ||
      e.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (e.description &&
        e.description.toLowerCase().includes(searchQuery.value.toLowerCase()));
    return matchCat && matchSearch;
  });
});

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const [y, m, d] = dateStr.split("-");
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

onMounted(() => {
  fetchEvents();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Toast Notification -->
    <div
      v-if="toast.show"
      class="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2 transition-all transform animate-in fade-in-50"
      :class="
        toast.type === 'error'
          ? 'bg-rose-50 dark:bg-rose-950/90 text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          : 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
      "
    >
      <span class="material-symbols-outlined text-[18px]">
        {{ toast.type === "error" ? "error" : "check_circle" }}
      </span>
      <span>{{ toast.message }}</span>
    </div>

    <!-- Header & Action Bar -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs"
    >
      <div>
        <h2 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span class="material-symbols-outlined text-blue-600 dark:text-blue-400">calendar_month</span>
          <span>Manajemen Kalender Akademik</span>
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Kelola jadwal resmi perkuliahan, UTS, UAS, dan libur akademik kelas 03SIFE003.
        </p>
      </div>

      <button
        type="button"
        @click="openCreateModal"
        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer shrink-0"
      >
        <span class="material-symbols-outlined text-[16px]">add</span>
        <span>Tambah Agenda</span>
      </button>
    </div>

    <!-- Filters & Search -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <!-- Category Filter Pills -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
        <button
          v-for="cat in CATEGORIES"
          :key="cat.id"
          type="button"
          @click="selectedCategory = cat.id"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer border"
          :class="
            selectedCategory === cat.id
              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          "
        >
          <span
            v-if="cat.color"
            class="w-2 h-2 rounded-full"
            :style="{ backgroundColor: cat.color }"
          ></span>
          <span>{{ cat.label }}</span>
        </button>
      </div>

      <!-- Search Input -->
      <div class="relative w-full md:w-64">
        <label for="calendar-search-input" class="sr-only">Cari agenda akademik</label>
        <input
          id="calendar-search-input"
          v-model="searchQuery"
          type="text"
          placeholder="Cari agenda akademik..."
          class="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
        <span
          class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[17px] text-slate-400"
        >
          search
        </span>
      </div>
    </div>

    <!-- Events Table Card -->
    <div
      class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th class="py-3 px-4">Judul Agenda</th>
              <th class="py-3 px-4">Kategori</th>
              <th class="py-3 px-4">Mulai</th>
              <th class="py-3 px-4">Selesai</th>
              <th class="py-3 px-4">TA</th>
              <th class="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            <tr v-if="loading && events.length === 0">
              <td colspan="6" class="py-12 text-center text-slate-400">
                <span class="material-symbols-outlined text-3xl animate-spin text-blue-500">progress_activity</span>
                <p class="mt-2 text-xs">Memuat kalender akademik...</p>
              </td>
            </tr>

            <tr v-else-if="filteredEvents.length === 0">
              <td colspan="6" class="py-12 text-center text-slate-400">
                <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-2">
                  <span class="material-symbols-outlined text-2xl">event_busy</span>
                </div>
                <p class="font-medium text-slate-600 dark:text-slate-300">Belum ada agenda akademik.</p>
                <p class="text-[11px] text-slate-400 mt-0.5">Klik tombol "Tambah Agenda" untuk membuat kegiatan pertama.</p>
              </td>
            </tr>

            <tr
              v-for="ev in filteredEvents"
              :key="ev.id"
              class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <td class="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 max-w-[280px]">
                <div class="flex items-center gap-2">
                  <span
                    class="w-2.5 h-2.5 rounded-full shrink-0"
                    :style="{ backgroundColor: ev.color || '#3b82f6' }"
                  ></span>
                  <span class="truncate" :title="ev.title">{{ ev.title }}</span>
                </div>
                <p v-if="ev.description" class="text-[11px] text-slate-400 pl-4.5 truncate font-normal">
                  {{ ev.description }}
                </p>
              </td>
              <td class="py-3 px-4">
                <span
                  class="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white shadow-2xs"
                  :style="{ backgroundColor: ev.color || '#3b82f6' }"
                >
                  {{ ev.category }}
                </span>
              </td>
              <td class="py-3 px-4 font-mono text-[11px]">
                {{ formatDate(ev.start_date) }}
              </td>
              <td class="py-3 px-4 font-mono text-[11px]">
                {{ ev.end_date ? formatDate(ev.end_date) : '-' }}
              </td>
              <td class="py-3 px-4 font-mono text-[11px] text-slate-500">
                {{ ev.academic_year || '-' }}
              </td>
              <td class="py-3 px-4 text-right space-x-1 shrink-0">
                <button
                  type="button"
                  @click="openEditModal(ev)"
                  class="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                  title="Edit Agenda"
                >
                  <span class="material-symbols-outlined text-[16px]">edit</span>
                </button>
                <button
                  type="button"
                  @click="confirmDelete(ev)"
                  class="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                  title="Hapus Agenda"
                >
                  <span class="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form (Tambah / Edit) -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50"
    >
      <div
        class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden transform transition-all"
      >
        <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-blue-600 dark:text-blue-400">
              {{ isEditing ? "edit_calendar" : "add_circle" }}
            </span>
            <span>{{ isEditing ? "Edit Agenda Akademik" : "Tambah Agenda Akademik" }}</span>
          </h3>
          <button
            type="button"
            @click="closeModal"
            aria-label="Tutup modal"
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
          <div class="p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
            <!-- Title -->
            <div>
              <label for="calendar-event-title" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Judul Agenda <span class="text-rose-500">*</span>
              </label>
              <input
                id="calendar-event-title"
                v-model="form.title"
                type="text"
                required
                placeholder="Contoh: Pekan UTS Seluruh Program Reguler"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <!-- Category & Academic Year -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="calendar-event-category" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori <span class="text-rose-500">*</span>
                </label>
                <select
                  id="calendar-event-category"
                  v-model="form.category"
                  @change="handleCategoryChange"
                  class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option
                    v-for="cat in CATEGORIES.filter((c) => c.id !== 'Semua')"
                    :key="cat.id"
                    :value="cat.id"
                  >
                    {{ cat.label }}
                  </option>
                </select>
              </div>

              <div>
                <label for="calendar-event-year" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tahun Akademik
                </label>
                <input
                  id="calendar-event-year"
                  v-model="form.academic_year"
                  type="text"
                  placeholder="20261 (Ganjil 2026/2027)"
                  class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <!-- Dates: Start & End -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="calendar-event-start-date" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Mulai <span class="text-rose-500">*</span>
                </label>
                <input
                  id="calendar-event-start-date"
                  v-model="form.start_date"
                  type="date"
                  required
                  class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label for="calendar-event-end-date" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Selesai (Opsional)
                </label>
                <input
                  id="calendar-event-end-date"
                  v-model="form.end_date"
                  type="date"
                  class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <!-- Color Preview / Override -->
            <div>
              <label for="calendar-event-color" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Warna Penanda Badge
              </label>
              <div class="flex items-center gap-3">
                <input
                  id="calendar-event-color"
                  v-model="form.color"
                  type="color"
                  class="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                />
                <span class="font-mono text-slate-500">{{ form.color }}</span>
              </div>
            </div>

            <!-- Description -->
            <div>
              <label for="calendar-event-description" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Keterangan Tambahan
              </label>
              <textarea
                id="calendar-event-description"
                v-model="form.description"
                rows="3"
                placeholder="Catatan pendukung atau panduan pelaksanaan..."
                class="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              ></textarea>
            </div>
          </div>

          <div class="px-6 py-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {{ submitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Tambah Agenda" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Delete Confirmation -->
    <div
      v-if="isDeleteModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50"
    >
      <div
        class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm p-6 text-center space-y-4"
      >
        <div class="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mx-auto">
          <span class="material-symbols-outlined text-2xl">delete</span>
        </div>
        <div>
          <h4 class="text-sm font-bold text-slate-900 dark:text-white">Hapus Agenda Akademik?</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Agenda <strong>"{{ deletingEvent?.title }}"</strong> akan dihapus permanen dari kalender.
          </p>
        </div>
        <div class="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            @click="closeDeleteModal"
            class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            @click="handleDelete"
            :disabled="submitting"
            class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {{ submitting ? "Menghapus..." : "Ya, Hapus" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
