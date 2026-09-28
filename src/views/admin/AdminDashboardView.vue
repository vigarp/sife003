<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAdminAuth } from "@/composables/useAdminAuth";
import { useAgenda, formatAgendaDeadline } from "@/composables/useAgenda";
import { useSchedule } from "@/composables/useSchedule";
import AdminStudentsManager from "@/components/admin/AdminStudentsManager.vue";
import AdminCoursesManager from "@/components/admin/AdminCoursesManager.vue";
import AdminLecturersManager from "@/components/admin/AdminLecturersManager.vue";
import scheduleData from "@/data/schedule.json";

const router = useRouter();
const { user, isAuthenticated, logout, changePassword, isAdmin, checkAuth, token } = useAdminAuth();
const verifyingAuth = ref(!user.value && isAuthenticated.value);
const { agendas, loading, fetchAgendas, createAgenda, updateAgenda, deleteAgenda } = useAgenda();
const { currentWeek, activeWeekStatus } = useSchedule();

const activeAdminTab = ref("agenda"); // 'agenda' | 'students' | 'courses' | 'lecturers'

// Compute active week number
const activeWeekNumber = computed(() => {
  const roman = currentWeek.value?.pekan;
  const romanMap = {
    I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8,
    IX: 9, X: 10, XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15, XVI: 16,
  };
  return romanMap[roman] || 5;
});

const isUpcoming = computed(() => activeWeekStatus.value === "upcoming");
const activeWeekBadgeText = computed(() =>
  isUpcoming.value ? "(Upcoming)" : "(Ongoing)"
);

// Filter state: 'active' or 'all'
const selectedFilter = ref("active");

// Subjects list from schedule data
const masterMatkulList = scheduleData.master_mata_kuliah.map((m) => m.nama);

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
  pekan: 5,
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
      pekan: Number.parseInt(form.pekan, 10),
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
  router.replace("/pengurus/login");
}

onMounted(async () => {
  if (!isAuthenticated.value) {
    router.replace("/pengurus/login");
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
  <div v-if="verifyingAuth" class="max-w-md mx-auto text-center py-20 px-4 space-y-3">
    <div class="w-9 h-9 mx-auto border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Memverifikasi hak akses pengurus...</p>
  </div>

  <!-- Unauthorized Regular Student Notice -->
  <div v-else-if="!isAdmin" class="max-w-md mx-auto text-center py-16 px-4 space-y-4">
    <div class="w-16 h-16 mx-auto rounded-3xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center shadow-xs">
      <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
    <div class="space-y-1">
      <h2 class="text-base font-bold text-slate-900 dark:text-white">Akses Terbatas: Bukan Pengurus Kelas</h2>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        Halo, <strong class="text-slate-800 dark:text-slate-200">{{ user?.nama_lengkap || "Mahasiswa" }}</strong>
        <span v-if="user?.nim"> (NIM: {{ user.nim }})</span>.
      </p>
      <p class="text-xs text-slate-500 dark:text-slate-400 pt-1">
        Akun Anda berstatus <strong>Mahasiswa Reguler</strong>. Hanya mahasiswa yang telah disahkan sebagai <strong>Pengurus / Admin</strong> oleh pengurus kelas yang dapat mengakses Zona Pengurus.
      </p>
    </div>
    <div class="flex items-center justify-center gap-2 pt-2">
      <router-link
        to="/"
        class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
      >
        Kembali ke Portal
      </router-link>
      <button
        @click="handleLogout"
        class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        Keluar
      </button>
    </div>
  </div>

  <div v-else class="w-full space-y-6 pb-16">
    <!-- Top Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-xs">
      <div class="flex items-center gap-3">
        <div class="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Zona Pengurus</span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
              03SIFE003
            </span>
          </h1>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Halo, <strong class="text-slate-800 dark:text-slate-200">{{ user?.nama_lengkap || "Pengurus Kelas" }}</strong>
            <span v-if="user?.nim" class="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-semibold ml-1">({{ user.nim }})</span>
            • Manajemen Agenda & Tugas Mahasiswa
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <router-link
          to="/pengurus/presensi"
          class="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span>Presensi (m-hadir)</span>
        </router-link>

        <router-link
          to="/"
          class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5"
        >
          <span>Lihat Portal</span>
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </router-link>

        <button
          @click="isPasswordModalOpen = true"
          class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Ubah Sandi
        </button>

        <button
          @click="handleLogout"
          class="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold transition-colors cursor-pointer"
        >
          Keluar
        </button>
      </div>
    </div>

    <!-- Toast Notification -->
    <div
      v-if="toast.show"
      :class="[
        'p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm transition-all',
        toast.type === 'success'
          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
      ]"
    >
      <span>{{ toast.message }}</span>
      <button @click="toast.show = false" class="text-xs font-bold opacity-75 hover:opacity-100 cursor-pointer">✕</button>
    </div>

    <!-- Admin Navigation Tabs -->
    <div class="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 w-fit text-xs font-bold border border-slate-200/60 dark:border-slate-700/60">
      <button
        @click="activeAdminTab = 'agenda'"
        :class="[
          'px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer',
          activeAdminTab === 'agenda'
            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
        ]"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span>Agenda & Tugas</span>
      </button>

      <button
        @click="activeAdminTab = 'students'"
        :class="[
          'px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer',
          activeAdminTab === 'students'
            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
        ]"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <span>Data Mahasiswa</span>
      </button>

      <button
        @click="activeAdminTab = 'courses'"
        :class="[
          'px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer',
          activeAdminTab === 'courses'
            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
        ]"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <span>Mata Kuliah</span>
      </button>

      <button
        @click="activeAdminTab = 'lecturers'"
        :class="[
          'px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer',
          activeAdminTab === 'lecturers'
            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
        ]"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
        <span>Data Dosen</span>
      </button>
    </div>

    <!-- TAB 1: AGENDA & TUGAS -->
    <div v-if="activeAdminTab === 'agenda'" class="space-y-6">
      <!-- Management Controls & Filters -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl w-fit">
        <button
          @click="handleFilterChange('active')"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
            selectedFilter === 'active'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
          ]"
        >
          Pekan {{ activeWeekNumber }} {{ activeWeekBadgeText }}
        </button>
        <button
          @click="handleFilterChange('all')"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
            selectedFilter === 'all'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
          ]"
        >
          Semua Pekan (1–16)
        </button>
      </div>

      <button
        @click="openCreateModal"
        class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Tambah Agenda Tugas</span>
      </button>
    </div>

    <!-- Agenda Table Card -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <!-- Loading indicator -->
      <div v-if="loading" class="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
        Memuat data agenda...
      </div>

      <!-- Empty State -->
      <div v-else-if="agendas.length === 0" class="p-12 text-center space-y-2">
        <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Belum ada agenda pada filter ini
        </p>
        <p class="text-xs text-slate-400 dark:text-slate-500">
          Klik tombol "+ Tambah Agenda Tugas" untuk membuat catatan tugas baru bagi mahasiswa.
        </p>
      </div>

      <!-- Table of items -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <th class="p-4 w-20">Pekan</th>
              <th class="p-4 w-52">Mata Kuliah</th>
              <th class="p-4">Judul & Keterangan</th>
              <th class="p-4 w-48">Tenggat Waktu</th>
              <th class="p-4 w-28 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="item in agendas" :key="item.id" class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
              <td class="p-4 font-semibold text-slate-800 dark:text-slate-200">
                Pekan {{ item.pekan }}
                <div v-if="item.pertemuan" class="text-[11px] font-normal text-slate-400">
                  Pert. {{ item.pertemuan }}
                </div>
              </td>
              <td class="p-4 font-bold text-blue-600 dark:text-blue-400">
                {{ item.mata_kuliah }}
              </td>
              <td class="p-4 space-y-0.5">
                <div class="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {{ item.judul }}
                </div>
                <div v-if="item.keterangan" class="text-slate-500 dark:text-slate-400 text-xs line-clamp-2">
                  {{ item.keterangan }}
                </div>
              </td>
              <td class="p-4">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border',
                    item.tipe_deadline === 'datetime'
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                      : item.tipe_deadline === 'date_only'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                  ]"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      v-if="item.tipe_deadline === 'datetime'"
                      stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                    <path
                      v-else
                      stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{{ formatAgendaDeadline(item) }}</span>
                </span>
              </td>
              <td class="p-4 text-right space-x-1">
                <button
                  @click="openEditModal(item)"
                  class="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Edit Agenda"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  @click="handleDelete(item)"
                  class="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Hapus Agenda"
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

    <!-- MODAL TAMBAH / EDIT AGENDA -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden space-y-0">
        
        <!-- Modal Header -->
        <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">
              {{ isEditing ? "Edit Agenda Tugas" : "Tambah Agenda Tugas Baru" }}
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Formulir fleksibel dengan 3 ragam model batas waktu
            </p>
          </div>
          <button
            @click="closeModal"
            class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-lg font-bold cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        <!-- Modal Form -->
        <form @submit.prevent="handleSubmit" class="p-5 space-y-4 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="agenda-pekan" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Pekan (1–16)
              </label>
              <select
                id="agenda-pekan"
                v-model="form.pekan"
                class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                <option v-for="w in 16" :key="w" :value="w">
                  Pekan {{ w }} {{ w === activeWeekNumber ? activeWeekBadgeText : '' }}
                </option>
              </select>
            </div>

            <div>
              <label for="agenda-pertemuan" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pertemuan Ke- <span class="font-normal text-slate-400 dark:text-slate-500">(Opsional)</span>
              </label>
              <input
                id="agenda-pertemuan"
                v-model.number="form.pertemuan"
                type="number"
                min="1"
                max="16"
                placeholder="Contoh: 4 (Opsional)"
                class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label for="agenda-matkul" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mata Kuliah
            </label>
            <select
              id="agenda-matkul"
              v-model="form.mata_kuliah"
              class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              <option v-for="matkul in masterMatkulList" :key="matkul" :value="matkul">
                {{ matkul }}
              </option>
            </select>
          </div>

          <div>
            <label for="agenda-judul" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Judul Tugas / Agenda
            </label>
            <input
              id="agenda-judul"
              v-model="form.judul"
              type="text"
              required
              placeholder="Contoh: Lanjutan Praktikum Pertemuan 4 (Polymorphism)"
              class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            />
          </div>

          <!-- Tipe Batas Waktu -->
          <fieldset class="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <legend class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Format Batas Waktu (Deadline)
            </legend>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label
                for="deadline-type-week"
                :class="[
                  'p-2.5 rounded-xl border cursor-pointer flex flex-col justify-between transition-colors',
                  form.tipe_deadline === 'week_only'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
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
                  <span class="font-bold">By Pekan</span>
                </div>
                <span class="text-[10px] opacity-75 mt-1">Cukup "Pekan {{ form.pekan }}"</span>
              </label>

              <label
                for="deadline-type-date"
                :class="[
                  'p-2.5 rounded-xl border cursor-pointer flex flex-col justify-between transition-colors',
                  form.tipe_deadline === 'date_only'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
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
                  <span class="font-bold">Hanya Tanggal</span>
                </div>
                <span class="text-[10px] opacity-75 mt-1">Contoh: 2 Okt 2026</span>
              </label>

              <label
                for="deadline-type-datetime"
                :class="[
                  'p-2.5 rounded-xl border cursor-pointer flex flex-col justify-between transition-colors',
                  form.tipe_deadline === 'datetime'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
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
                  <span class="font-bold">Tanggal & Jam</span>
                </div>
                <span class="text-[10px] opacity-75 mt-1">Ketat (misal 23:59 WIB)</span>
              </label>
            </div>
          </fieldset>

          <!-- Date and Time Picker -->
          <div
            v-if="form.tipe_deadline !== 'week_only'"
            class="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
          >
            <div>
              <label for="agenda-tanggal" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Tenggat
              </label>
              <input
                id="agenda-tanggal"
                v-model="form.tanggal"
                type="date"
                required
                class="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div v-if="form.tipe_deadline === 'datetime'">
              <label for="agenda-jam" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jam Batas (WIB)
              </label>
              <input
                id="agenda-jam"
                v-model="form.jam"
                type="time"
                placeholder="23:59"
                class="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label for="agenda-keterangan" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan / Instruksi Dosen (Opsional)
            </label>
            <textarea
              id="agenda-keterangan"
              v-model="form.keterangan"
              rows="3"
              placeholder="Contoh: Upload PDF di LMS Mentari atau format bebas..."
              class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            ></textarea>
          </div>

          <!-- Modal Action Buttons -->
          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer disabled:opacity-50"
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
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-900 dark:text-white">
            Ubah Kata Sandi Pengurus
          </h3>
          <button @click="isPasswordModalOpen = false" class="text-slate-400 font-bold cursor-pointer">✕</button>
        </div>

        <div v-if="passwordForm.error" class="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
          {{ passwordForm.error }}
        </div>
        <div v-if="passwordForm.success" class="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs">
          {{ passwordForm.success }}
        </div>

        <form @submit.prevent="handleChangePasswordSubmit" class="space-y-3 text-xs">
          <div>
            <label for="pwd-old" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Kata Sandi Lama</label>
            <input
              id="pwd-old"
              v-model="passwordForm.oldPassword"
              type="password"
              required
              class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label for="pwd-new" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Kata Sandi Baru</label>
            <input
              id="pwd-new"
              v-model="passwordForm.newPassword"
              type="password"
              required
              minlength="6"
              class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label for="pwd-confirm" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ulangi Kata Sandi Baru</label>
            <input
              id="pwd-confirm"
              v-model="passwordForm.confirmPassword"
              type="password"
              required
              class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div class="pt-2 flex justify-end gap-2">
            <button
              type="button"
              @click="isPasswordModalOpen = false"
              class="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              class="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
            >
              Simpan Sandi
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>
