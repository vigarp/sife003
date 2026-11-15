<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAdminAuth } from "@/composables/useAdminAuth";
import { useAgenda, formatAgendaDeadline } from "@/composables/useAgenda";
import { useSchedule, getPekanNumber, getPekanLabel } from "@/composables/useSchedule";
import AdminStudentsManager from "@/components/admin/AdminStudentsManager.vue";
import AdminCoursesManager from "@/components/admin/AdminCoursesManager.vue";
import AdminLecturersManager from "@/components/admin/AdminLecturersManager.vue";
import AdminCalendarManager from "@/components/admin/AdminCalendarManager.vue";
import scheduleData from "@/data/schedule.json";

const router = useRouter();
const { user, isAuthenticated, logout, changePassword, isAdmin, checkAuth, token } = useAdminAuth();
const verifyingAuth = ref(!user.value && isAuthenticated.value);
const { agendas, loading, fetchAgendas, createAgenda, updateAgenda, deleteAgenda } = useAgenda();
const { currentWeek, activeWeekStatus } = useSchedule();

const activeAdminTab = ref("agenda"); // 'agenda' | 'students' | 'courses' | 'lecturers' | 'calendar'

// Compute active week number based on schedule configuration
const activeWeekNumber = computed(() => getPekanNumber(currentWeek.value));

const isUpcoming = computed(() => activeWeekStatus.value === "upcoming");
const activeWeekBadgeText = computed(() =>
  isUpcoming.value ? "(Upcoming)" : "(Ongoing)"
);

// Filter state: 'active' or 'all'
const selectedFilter = ref("active");

// Subjects list from schedule data
const masterMatkulList = scheduleData.master_mata_kuliah.map((m) => m.nama);

// Available weeks for agenda dropdown options
const weekOptions = computed(() => {
  return scheduleData.jadwal_per_pekan.map((p) => {
    const val = getPekanNumber(p);
    return {
      value: val,
      label: getPekanLabel(p),
    };
  });
});

// Notification banner state
const toast = reactive({
  show: false,
  message: "",
  type: "success",
});

function showToast(message, type = "success") {
  toast.message = message;
  toast.type = type;
  toast.show = true;
  setTimeout(() => {
    toast.show = false;
  }, 4000);
}

// Modal state
const isModalOpen = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const submitting = ref(false);

const form = reactive({
  pekan: activeWeekNumber.value,
  pertemuan: null,
  mata_kuliah: masterMatkulList[0] || "Analisa Proses Bisnis",
  judul: "",
  keterangan: "",
  tipe_deadline: "week_only",
  tanggal: "",
  jam: "23:59",
});

// Change Password Modal state
const isPasswordModalOpen = ref(false);
const passwordForm = reactive({
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
  error: "",
  success: "",
});

function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  form.pekan = activeWeekNumber.value;
  form.pertemuan = null;
  form.mata_kuliah = masterMatkulList[0];
  form.judul = "";
  form.keterangan = "";
  form.tipe_deadline = "week_only";
  form.tanggal = "";
  form.jam = "23:59";
  isModalOpen.value = true;
}

function openEditModal(item) {
  isEditing.value = true;
  editingId.value = item.id;
  form.pekan = item.pekan;
  form.pertemuan = item.pertemuan ?? null;
  form.mata_kuliah = item.mata_kuliah;
  form.judul = item.judul;
  form.keterangan = item.keterangan || "";
  form.tipe_deadline = item.tipe_deadline || "week_only";
  form.tanggal = item.tanggal || "";
  form.jam = item.jam || "23:59";
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
}

async function loadData() {
  if (selectedFilter.value === "active") {
    await fetchAgendas(activeWeekNumber.value);
  } else {
    await fetchAgendas(null, true);
  }
}

async function handleFilterChange(mode) {
  selectedFilter.value = mode;
  await loadData();
}

async function handleSubmit() {
  if (!form.judul.trim() || !form.mata_kuliah.trim()) {
    showToast("Mata kuliah dan judul tugas wajib diisi.", "error");
    return;
  }

  if (form.tipe_deadline !== "week_only" && !form.tanggal) {
    showToast("Silakan tentukan tanggal tenggat batas waktu.", "error");
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      pekan:
        form.pekan === "UTS" || form.pekan === "UAS"
          ? form.pekan
          : Number.parseInt(form.pekan, 10) || form.pekan,
      pertemuan:
        form.pertemuan !== null && form.pertemuan !== "" && !Number.isNaN(Number(form.pertemuan))
          ? Number.parseInt(form.pertemuan, 10)
          : null,
      mata_kuliah: form.mata_kuliah.trim(),
      judul: form.judul.trim(),
      keterangan: form.keterangan.trim(),
      tipe_deadline: form.tipe_deadline,
      tanggal: form.tipe_deadline === "week_only" ? null : form.tanggal,
      jam: form.tipe_deadline === "datetime" ? form.jam : null,
    };

    if (isEditing.value) {
      await updateAgenda(editingId.value, payload);
      showToast("Agenda berhasil diperbarui!");
    } else {
      await createAgenda(payload);
      showToast("Agenda baru berhasil ditambahkan!");
    }
    closeModal();
    await loadData();
  } catch (err) {
    showToast(err.message || "Gagal menyimpan agenda.", "error");
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(item) {
  const confirmed = window.confirm(`Hapus agenda: "${item.judul}"?`);
  if (!confirmed) return;

  try {
    await deleteAgenda(item.id);
    showToast("Agenda berhasil dihapus.");
    await loadData();
  } catch (err) {
    showToast(err.message || "Gagal menghapus agenda.", "error");
  }
}

async function handleChangePasswordSubmit() {
  passwordForm.error = "";
  passwordForm.success = "";

  if (!passwordForm.oldPassword || !passwordForm.newPassword) {
    passwordForm.error = "Semua field kata sandi wajib diisi.";
    return;
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordForm.error = "Konfirmasi kata sandi baru tidak cocok.";
    return;
  }

  try {
    await changePassword(passwordForm.oldPassword, passwordForm.newPassword);
    passwordForm.success = "Kata sandi berhasil diperbarui!";
    setTimeout(() => {
      isPasswordModalOpen.value = false;
      passwordForm.oldPassword = "";
      passwordForm.newPassword = "";
      passwordForm.confirmPassword = "";
      passwordForm.success = "";
    }, 1500);
  } catch (err) {
    passwordForm.error = err.message || "Gagal mengganti kata sandi.";
  }
}

function handleLogout() {
  logout();
  void router.replace("/pengurus/login");
}

onMounted(async () => {
  if (!isAuthenticated.value) {
    await router.replace("/pengurus/login");
    return;
  }
  if (!user.value && token.value) {
    verifyingAuth.value = true;
    await checkAuth();
    verifyingAuth.value = false;
  }
  if (!isAdmin.value) {
    return;
  }
  form.pekan = activeWeekNumber.value;
  await loadData();
});
</script>

<template>
  <!-- Loading state when token exists but user profile is being fetched -->
  <div v-if="verifyingAuth" class="max-w-md mx-auto text-center py-16 px-4 space-y-2.5">
    <div class="w-7 h-7 mx-auto border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
    <p class="text-xs text-[var(--muted)] font-medium">Memverifikasi hak akses pengurus...</p>
  </div>

  <!-- Unauthorized Regular Student Notice -->
  <div v-else-if="!isAdmin" class="max-w-md mx-auto py-12 px-4">
    <div class="mk-card p-5 text-center space-y-3">
      <span class="material-symbols-outlined text-[28px] text-amber-500">lock</span>
      <div class="space-y-1">
        <h2 class="text-sm font-semibold text-[var(--text)]">Akses Terbatas: Bukan Pengurus Kelas</h2>
        <p class="text-xs text-[var(--muted)]">
          Halo, <strong class="text-[var(--text)]">{{ user?.nama_lengkap || "Mahasiswa" }}</strong>
          <span v-if="user?.nim" class="font-mono"> (NIM: {{ user.nim }})</span>.
        </p>
        <p class="text-xs text-[var(--muted)] pt-0.5 leading-relaxed">
          Akun Anda berstatus <strong>Mahasiswa Reguler</strong>. Hanya mahasiswa yang telah disahkan sebagai <strong>Pengurus / Admin</strong> oleh pengurus kelas yang dapat mengakses Zona Pengurus.
        </p>
      </div>
      <div class="flex items-center justify-center gap-2 pt-1">
        <router-link
          to="/"
          class="px-3.5 py-1.5 rounded-[6px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-xs transition-colors"
        >
          Kembali ke Portal
        </router-link>
        <button
          @click="handleLogout"
          class="mk-btn"
        >
          Keluar
        </button>
      </div>
    </div>
  </div>

  <div v-else class="w-full max-w-full space-y-4 pb-16 min-w-0">
    <!-- Top Action Bar -->
    <div class="mk-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4">
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="material-symbols-outlined text-[22px] text-[var(--accent)] shrink-0">verified_user</span>
        <div class="min-w-0">
          <h1 class="text-base sm:text-lg font-semibold text-[var(--text)] tracking-tight flex items-center gap-2 flex-wrap">
            <span>Zona Pengurus</span>
            <span class="mk-badge bg-[var(--hover)] text-[var(--accent)] border border-[var(--border)] shrink-0 font-mono">
              03SIFE003
            </span>
          </h1>
          <p class="text-xs text-[var(--muted)] break-words">
            Halo, <strong class="text-[var(--text)]">{{ user?.nama_lengkap || "Pengurus Kelas" }}</strong>
            <span v-if="user?.nim" class="font-mono text-[11px] text-[var(--accent)] font-semibold ml-1">({{ user.nim }})</span>
            • Manajemen Agenda & Tugas Mahasiswa
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <router-link
          to="/pengurus/presensi"
          class="mk-btn !border-[var(--accent)] !text-[var(--accent)]"
        >
          <span class="material-symbols-outlined text-[15px]">fact_check</span>
          <span>Presensi (m-hadir)</span>
        </router-link>

        <router-link
          to="/"
          class="mk-btn"
        >
          <span>Lihat Portal</span>
          <span class="material-symbols-outlined text-[14px]">open_in_new</span>
        </router-link>

        <button
          @click="isPasswordModalOpen = true"
          class="mk-btn"
        >
          Ubah Sandi
        </button>

        <button
          @click="handleLogout"
          class="mk-btn !border-red-500/35 !text-red-600 dark:!text-red-400"
        >
          Keluar
        </button>
      </div>
    </div>

    <!-- Toast Notification -->
    <div
      v-if="toast.show"
      :class="[
        'p-3 rounded-[8px] text-xs font-medium flex items-center justify-between border',
        toast.type === 'success'
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/35'
          : 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/35',
      ]"
    >
      <span>{{ toast.message }}</span>
      <button @click="toast.show = false" class="text-xs font-bold opacity-75 hover:opacity-100 cursor-pointer">✕</button>
    </div>

    <!-- Admin Navigation Tabs -->
    <div class="w-full overflow-x-auto pb-1 max-w-full">
      <div class="inline-flex items-center gap-2 min-w-max">
        <button
          @click="activeAdminTab = 'agenda'"
          :class="[
            'mk-subtab inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap',
            { 'mk-subtab-active': activeAdminTab === 'agenda' },
          ]"
        >
          <span class="material-symbols-outlined text-[16px]">assignment</span>
          <span>Agenda & Tugas</span>
        </button>

        <button
          @click="activeAdminTab = 'students'"
          :class="[
            'mk-subtab inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap',
            { 'mk-subtab-active': activeAdminTab === 'students' },
          ]"
        >
          <span class="material-symbols-outlined text-[16px]">groups</span>
          <span>Data Mahasiswa</span>
        </button>

        <button
          @click="activeAdminTab = 'courses'"
          :class="[
            'mk-subtab inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap',
            { 'mk-subtab-active': activeAdminTab === 'courses' },
          ]"
        >
          <span class="material-symbols-outlined text-[16px]">menu_book</span>
          <span>Mata Kuliah</span>
        </button>

        <button
          @click="activeAdminTab = 'lecturers'"
          :class="[
            'mk-subtab inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap',
            { 'mk-subtab-active': activeAdminTab === 'lecturers' },
          ]"
        >
          <span class="material-symbols-outlined text-[16px]">badge</span>
          <span>Data Dosen</span>
        </button>

        <button
          @click="activeAdminTab = 'calendar'"
          :class="[
            'mk-subtab inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap',
            { 'mk-subtab-active': activeAdminTab === 'calendar' },
          ]"
        >
          <span class="material-symbols-outlined text-[16px]">calendar_month</span>
          <span>Kalender Akademik</span>
        </button>
      </div>
    </div>

    <!-- TAB 1: AGENDA & TUGAS -->
    <div v-if="activeAdminTab === 'agenda'" class="space-y-4">
      <!-- Management Controls & Filters -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div class="flex items-center gap-2 w-fit max-w-full overflow-x-auto">
          <button
            @click="handleFilterChange('active')"
            :class="[
              'mk-subtab shrink-0 whitespace-nowrap',
              { 'mk-subtab-active': selectedFilter === 'active' },
            ]"
          >
            {{ getPekanLabel(activeWeekNumber) }} {{ activeWeekBadgeText }}
          </button>
          <button
            @click="handleFilterChange('all')"
            :class="[
              'mk-subtab shrink-0 whitespace-nowrap',
              { 'mk-subtab-active': selectedFilter === 'all' },
            ]"
          >
            Semua Pekan
          </button>
        </div>

        <button
          @click="openCreateModal"
          class="px-4 py-2 rounded-[6px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <span class="material-symbols-outlined text-[16px]">add</span>
          <span>Tambah Agenda Tugas</span>
        </button>
      </div>

    <!-- Agenda Table Card -->
    <div class="mk-card overflow-hidden">
      <!-- Loading indicator -->
      <div v-if="loading" class="p-8 text-center text-xs text-[var(--muted)]">
        Memuat data agenda...
      </div>

      <!-- Empty State -->
      <div v-else-if="agendas.length === 0" class="p-10 text-center space-y-1.5">
        <p class="text-sm font-semibold text-[var(--text)]">
          Belum ada agenda pada filter ini
        </p>
        <p class="text-xs text-[var(--muted)]">
          Klik tombol "+ Tambah Agenda Tugas" untuk membuat catatan tugas baru bagi mahasiswa.
        </p>
      </div>

      <!-- Table of items -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] uppercase tracking-wider font-semibold text-[11px]">
              <th class="p-3 w-20">Pekan</th>
              <th class="p-3 w-52">Mata Kuliah</th>
              <th class="p-3">Judul & Keterangan</th>
              <th class="p-3 w-48">Tenggat Waktu</th>
              <th class="p-3 w-28 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--border)]">
            <tr v-for="item in agendas" :key="item.id" class="hover:bg-[var(--hover)] transition-colors">
              <td class="p-3 font-semibold text-[var(--text)] tabular-nums">
                {{ getPekanLabel(item.pekan) }}
                <div v-if="item.pertemuan" class="text-[11px] font-normal text-[var(--muted)]">
                  Pert. {{ item.pertemuan }}
                </div>
              </td>
              <td class="p-3 font-semibold text-[var(--accent)]">
                {{ item.mata_kuliah }}
              </td>
              <td class="p-3 space-y-0.5">
                <div class="font-semibold text-[var(--text)] text-xs sm:text-sm">
                  {{ item.judul }}
                </div>
                <div v-if="item.keterangan" class="text-[var(--muted)] text-xs line-clamp-2">
                  {{ item.keterangan }}
                </div>
              </td>
              <td class="p-3.5">
                <span
                  :class="[
                    'mk-badge font-mono tabular-nums',
                    item.tipe_deadline === 'datetime'
                      ? 'mk-badge-down'
                      : item.tipe_deadline === 'date_only'
                      ? ''
                      : 'mk-badge-ok',
                  ]"
                >
                  {{ formatAgendaDeadline(item) }}
                </span>
              </td>
              <td class="p-3.5 text-right space-x-1">
                <button
                  @click="openEditModal(item)"
                  class="mk-btn !p-1.5"
                  title="Edit Agenda"
                >
                  <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  @click="handleDelete(item)"
                  class="mk-btn !p-1.5 hover:!text-rose-600 dark:hover:!text-rose-400"
                  title="Hapus Agenda"
                >
                  <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    </div>

    <!-- TAB 2: DATA MAHASISWA -->
    <AdminStudentsManager
      v-else-if="activeAdminTab === 'students'"
      @toast="showToast"
    />

    <!-- TAB 3: MATA KULIAH -->
    <AdminCoursesManager
      v-else-if="activeAdminTab === 'courses'"
      @toast="showToast"
    />

    <!-- TAB 4: DATA DOSEN -->
    <AdminLecturersManager
      v-else-if="activeAdminTab === 'lecturers'"
      @toast="showToast"
    />

    <!-- TAB 5: KALENDER AKADEMIK -->
    <AdminCalendarManager
      v-else-if="activeAdminTab === 'calendar'"
      @toast="showToast"
    />

    <!-- MODAL TAMBAH / EDIT AGENDA -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="mk-card w-full max-w-lg shadow-xl overflow-hidden">
        
        <!-- Modal Header -->
        <div class="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 class="text-sm font-semibold text-[var(--text)]">
              {{ isEditing ? "Edit Agenda Tugas" : "Tambah Agenda Tugas Baru" }}
            </h3>
            <p class="text-xs text-[var(--muted)] mt-0.5">
              Formulir fleksibel dengan 3 ragam model batas waktu
            </p>
          </div>
          <button
            @click="closeModal"
            class="mk-btn !p-1"
          >
            ✕
          </button>
        </div>

        <!-- Modal Form -->
        <form @submit.prevent="handleSubmit" class="p-4 space-y-3.5 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="agenda-pekan" class="block font-semibold text-[var(--text)] mb-1">
                Target Pekan
              </label>
              <select
                id="agenda-pekan"
                v-model="form.pekan"
                class="w-full p-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] font-medium focus:border-[var(--accent)] focus:outline-none"
              >
                <option v-for="item in weekOptions" :key="item.value" :value="item.value">
                  {{ item.label }} {{ item.value === activeWeekNumber ? activeWeekBadgeText : '' }}
                </option>
              </select>
            </div>

            <div>
              <label for="agenda-pertemuan" class="block font-semibold text-[var(--text)] mb-1">
                Pertemuan Ke- <span class="font-normal text-[var(--muted)]">(Opsional)</span>
              </label>
              <input
                id="agenda-pertemuan"
                v-model.number="form.pertemuan"
                type="number"
                min="1"
                max="21"
                placeholder="Contoh: 4 (Opsional)"
                class="w-full p-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label for="agenda-matkul" class="block font-semibold text-[var(--text)] mb-1">
              Mata Kuliah
            </label>
            <select
              id="agenda-matkul"
              v-model="form.mata_kuliah"
              class="w-full p-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] font-medium focus:border-[var(--accent)] focus:outline-none"
            >
              <option v-for="matkul in masterMatkulList" :key="matkul" :value="matkul">
                {{ matkul }}
              </option>
            </select>
          </div>

          <div>
            <label for="agenda-judul" class="block font-semibold text-[var(--text)] mb-1">
              Judul Tugas / Agenda
            </label>
            <input
              id="agenda-judul"
              v-model="form.judul"
              type="text"
              required
              placeholder="Contoh: Lanjutan Praktikum Pertemuan 4 (Polymorphism)"
              class="w-full p-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] font-medium focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <!-- Tipe Batas Waktu -->
          <fieldset class="space-y-2 pt-2 border-t border-[var(--border)]">
            <legend class="block font-semibold text-[var(--text)] mb-1">
              Format Batas Waktu (Deadline)
            </legend>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label
                for="deadline-type-week"
                :class="[
                  'p-2.5 rounded-[8px] border cursor-pointer flex flex-col justify-between transition-colors',
                  form.tipe_deadline === 'week_only'
                    ? 'border-[var(--accent)] bg-blue-500/10 text-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--hover)]',
                ]"
              >
                <div class="flex items-center gap-2">
                  <input
                    id="deadline-type-week"
                    v-model="form.tipe_deadline"
                    type="radio"
                    name="deadline_type_selection"
                    value="week_only"
                    class="text-blue-600"
                  />
                  <span class="font-semibold">By Pekan</span>
                </div>
                <span class="text-[10px] text-[var(--muted)] mt-1">Cukup "{{ getPekanLabel(form.pekan) }}"</span>
              </label>

              <label
                for="deadline-type-date"
                :class="[
                  'p-2.5 rounded-[8px] border cursor-pointer flex flex-col justify-between transition-colors',
                  form.tipe_deadline === 'date_only'
                    ? 'border-[var(--accent)] bg-blue-500/10 text-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--hover)]',
                ]"
              >
                <div class="flex items-center gap-2">
                  <input
                    id="deadline-type-date"
                    v-model="form.tipe_deadline"
                    type="radio"
                    name="deadline_type_selection"
                    value="date_only"
                    class="text-blue-600"
                  />
                  <span class="font-semibold">Hanya Tanggal</span>
                </div>
                <span class="text-[10px] text-[var(--muted)] mt-1">Contoh: 2 Okt 2026</span>
              </label>

              <label
                for="deadline-type-datetime"
                :class="[
                  'p-2.5 rounded-[8px] border cursor-pointer flex flex-col justify-between transition-colors',
                  form.tipe_deadline === 'datetime'
                    ? 'border-[var(--accent)] bg-blue-500/10 text-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--hover)]',
                ]"
              >
                <div class="flex items-center gap-2">
                  <input
                    id="deadline-type-datetime"
                    v-model="form.tipe_deadline"
                    type="radio"
                    name="deadline_type_selection"
                    value="datetime"
                    class="text-blue-600"
                  />
                  <span class="font-semibold">Tanggal & Jam</span>
                </div>
                <span class="text-[10px] text-[var(--muted)] mt-1">Ketat (misal 23:59 WIB)</span>
              </label>
            </div>
          </fieldset>

          <!-- Date and Time Picker -->
          <div
            v-if="form.tipe_deadline !== 'week_only'"
            class="grid grid-cols-2 gap-3 p-3 rounded-[8px] bg-[var(--bg)] border border-[var(--border)]"
          >
            <div>
              <label for="agenda-tanggal" class="block font-semibold text-[var(--text)] mb-1">
                Tanggal Tenggat
              </label>
              <input
                id="agenda-tanggal"
                v-model="form.tanggal"
                type="date"
                required
                class="w-full p-2 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
              />
            </div>

            <div v-if="form.tipe_deadline === 'datetime'">
              <label for="agenda-jam" class="block font-semibold text-[var(--text)] mb-1">
                Jam Batas (WIB)
              </label>
              <input
                id="agenda-jam"
                v-model="form.jam"
                type="time"
                placeholder="23:59"
                class="w-full p-2 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
              />
            </div>
          </div>

          <div>
            <label for="agenda-keterangan" class="block font-semibold text-[var(--text)] mb-1">
              Catatan / Instruksi Dosen (Opsional)
            </label>
            <textarea
              id="agenda-keterangan"
              v-model="form.keterangan"
              rows="3"
              placeholder="Contoh: Upload PDF di LMS Mentari atau format bebas..."
              class="w-full p-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            ></textarea>
          </div>

          <!-- Modal Action Buttons -->
          <div class="pt-3 border-t border-[var(--border)] flex justify-end gap-2">
            <button
              type="button"
              @click="closeModal"
              class="mk-btn"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="px-4 py-2 rounded-[6px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold cursor-pointer disabled:opacity-50"
            >
              {{ submitting ? "Menyimpan..." : "Simpan Agenda" }}
            </button>
          </div>
        </form>

      </div>
    </div>

    <!-- CHANGE PASSWORD MODAL -->
    <div
      v-if="isPasswordModalOpen"
      class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="mk-card w-full max-w-sm shadow-xl p-5 space-y-4">
        <div class="flex items-center justify-between pb-2.5 border-b border-[var(--border)]">
          <h3 class="text-sm font-semibold text-[var(--text)]">
            Ubah Kata Sandi Pengurus
          </h3>
          <button @click="isPasswordModalOpen = false" class="mk-btn !p-1">✕</button>
        </div>

        <div v-if="passwordForm.error" class="p-2.5 rounded-[8px] bg-red-500/10 border border-red-500/40 text-red-700 dark:text-red-300 text-xs">
          {{ passwordForm.error }}
        </div>
        <div v-if="passwordForm.success" class="p-2.5 rounded-[8px] bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs">
          {{ passwordForm.success }}
        </div>

        <form @submit.prevent="handleChangePasswordSubmit" class="space-y-3 text-xs">
          <div>
            <label for="pwd-old" class="block font-semibold text-[var(--text)] mb-1">Kata Sandi Lama</label>
            <input
              id="pwd-old"
              v-model="passwordForm.oldPassword"
              type="password"
              required
              class="w-full p-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div>
            <label for="pwd-new" class="block font-semibold text-[var(--text)] mb-1">Kata Sandi Baru</label>
            <input
              id="pwd-new"
              v-model="passwordForm.newPassword"
              type="password"
              required
              minlength="6"
              class="w-full p-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div>
            <label for="pwd-confirm" class="block font-semibold text-[var(--text)] mb-1">Ulangi Kata Sandi Baru</label>
            <input
              id="pwd-confirm"
              v-model="passwordForm.confirmPassword"
              type="password"
              required
              class="w-full p-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div class="pt-2 border-t border-[var(--border)] flex justify-end gap-2">
            <button
              type="button"
              @click="isPasswordModalOpen = false"
              class="mk-btn"
            >
              Batal
            </button>
            <button
              type="submit"
              class="px-4 py-2 rounded-[6px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold cursor-pointer"
            >
              Simpan Sandi
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>
