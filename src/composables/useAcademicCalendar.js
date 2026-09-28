import { ref } from "vue";
import { useAdminAuth } from "./useAdminAuth";

export const CATEGORIES = [
  { id: "Semua", label: "Semua", color: "" },
  { id: "event", label: "Event", color: "#3b82f6" },
  { id: "prodi", label: "Prodi", color: "#8b5cf6" },
  { id: "kampus", label: "Kampus", color: "#10b981" },
];

export const CATEGORY_COLORS = {
  event: "#3b82f6",
  prodi: "#8b5cf6",
  kampus: "#10b981",
};

const events = ref([]);
const loading = ref(false);
const error = ref(null);

export function useAcademicCalendar() {
  const { token } = useAdminAuth();

  async function fetchEvents(category = null, year = null) {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (category && category !== "Semua") params.append("category", category);
      if (year) params.append("year", year);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/calendar${qs}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal memuat kalender akademik.");
      }

      events.value = data.data || [];
      return events.value;
    } catch (err) {
      error.value = err.message;
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function createEvent(payload) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menambah agenda akademik.");
      }

      await fetchEvents();
      return { success: true, data: data.data };
    } catch (err) {
      error.value = err.message;
      return { success: false, message: err.message };
    } finally {
      loading.value = false;
    }
  }

  async function updateEvent(payload) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch("/api/calendar", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal memperbarui agenda akademik.");
      }

      await fetchEvents();
      return { success: true, data: data.data };
    } catch (err) {
      error.value = err.message;
      return { success: false, message: err.message };
    } finally {
      loading.value = false;
    }
  }

  async function deleteEvent(id) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch("/api/calendar", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menghapus agenda akademik.");
      }

      events.value = events.value.filter((e) => e.id !== id);
      return { success: true };
    } catch (err) {
      error.value = err.message;
      return { success: false, message: err.message };
    } finally {
      loading.value = false;
    }
  }

  return {
    events,
    loading,
    error,
    CATEGORIES,
    CATEGORY_COLORS,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
