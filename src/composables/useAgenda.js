import { ref } from "vue";
import { useAdminAuth } from "./useAdminAuth";

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS_FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agt", "Sep", "Okt", "Nov", "Des",
];

export function formatAgendaDeadline(item) {
  if (!item) return "";
  const { tipe_deadline, tanggal, jam, pekan } = item;

  if (tipe_deadline === "week_only" || !tanggal) {
    return `Pekan ${pekan}`;
  }

  const [y, m, d] = tanggal.split("-").map((v) => Number.parseInt(v, 10));
  const dateObj = new Date(y, m - 1, d);
  const dayName = DAYS[dateObj.getDay()] || "";

  if (tipe_deadline === "datetime" && jam) {
    const monthShort = MONTHS_SHORT[m - 1] || "";
    return `${dayName}, ${d} ${monthShort} • ${jam} WIB`;
  }

  // date_only (or datetime without jam)
  const monthFull = MONTHS_FULL[m - 1] || "";
  return `${dayName}, ${d} ${monthFull} ${y}`;
}

export function useAgenda() {
  const agendas = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const { token } = useAdminAuth();

  async function fetchAgendas(pekan = null, all = false) {
    loading.value = true;
    error.value = null;
    try {
      let url = "/api/agenda";
      const params = new URLSearchParams();
      if (all) {
        params.append("all", "true");
      } else if (pekan !== null && pekan !== undefined) {
        params.append("pekan", pekan.toString());
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengambil data agenda.");
      }
      agendas.value = data.data || [];
      return agendas.value;
    } catch (err) {
      error.value = err.message;
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function createAgenda(agendaData) {
    if (!token.value) throw new Error("Akses ditolak: Silakan login terlebih dahulu.");
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch("/api/agenda", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify(agendaData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menambahkan agenda.");
      }
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateAgenda(id, agendaData) {
    if (!token.value) throw new Error("Akses ditolak: Silakan login terlebih dahulu.");
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/agenda?id=${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify(agendaData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal memperbarui agenda.");
      }
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteAgenda(id) {
    if (!token.value) throw new Error("Akses ditolak: Silakan login terlebih dahulu.");
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/agenda?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menghapus agenda.");
      }
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    agendas,
    loading,
    error,
    fetchAgendas,
    createAgenda,
    updateAgenda,
    deleteAgenda,
  };
}
