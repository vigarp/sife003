<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import idLocale from "@fullcalendar/core/locales/id";
import { useAcademicCalendar, CATEGORIES, CATEGORY_COLORS } from "@/composables/useAcademicCalendar";
import { getLatestTimestamp, formatRelativeTime } from "@/utils/timeAgo";
import holidaysData from "@/data/holidays.json";

// Composable
const { events, loading, fetchEvents } = useAcademicCalendar();

const fullCalendarRef = ref(null);

// Modal state
const isModalOpen = ref(false);
const selectedEvent = ref(null);

// Legend items (excluding 'Semua')
const legendCategories = computed(() =>
  CATEGORIES.filter((c) => c.id !== "Semua")
);

// Date formatting helpers
function formatIndoDate(dateStr) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function addOneDay(dateStr) {
  if (!dateStr) return dateStr;
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 1);
  const nextY = date.getFullYear();
  const nextM = String(date.getMonth() + 1).padStart(2, "0");
  const nextD = String(date.getDate()).padStart(2, "0");
  return `${nextY}-${nextM}-${nextD}`;
}

// Indonesian National Holidays from SKB 3 Menteri 2026
const nationalHolidayEvents = computed(() => {
  return (holidaysData.data || []).map((h, idx) => {
    const isCuti = Boolean(h.is_cuti_bersama);
    const color = isCuti ? "#f87171" : "#ef4444";
    const title = isCuti ? `Cuti Bersama: ${h.name}` : h.name;
    const categoryLabel = isCuti ? "Cuti Bersama" : "Libur Nasional";
    const desc = isCuti
      ? `Cuti Bersama ${h.name} (Ketetapan SKB 3 Menteri Tahun 2026).`
      : `Hari Libur Nasional: ${h.name} (Ketetapan SKB 3 Menteri Tahun 2026).`;

    return {
      id: `holiday-${h.date}-${idx}`,
      title,
      start: h.date,
      allDay: true,
      backgroundColor: color,
      borderColor: color,
      textColor: "#ffffff",
      extendedProps: {
        category: "nasional",
        category_label: categoryLabel,
        start_date: h.date,
        end_date: h.date,
        color,
        academic_year: "2026",
        description: desc,
        is_holiday: true,
        is_cuti_bersama: isCuti,
      },
    };
  });
});

// FullCalendar formatted events (combines CRUD academic events & national holidays)
const calendarEvents = computed(() => {
  const customEvents = events.value.map((ev) => {
    const isMultiDay = ev.end_date && ev.end_date !== ev.start_date;
    const color = ev.color || CATEGORY_COLORS[ev.category] || "#3b82f6";

    return {
      id: String(ev.id),
      title: ev.title,
      start: ev.start_date,
      end: isMultiDay ? addOneDay(ev.end_date) : undefined,
      allDay: true,
      backgroundColor: color,
      borderColor: color,
      textColor: "#ffffff",
      extendedProps: {
        category: ev.category,
        category_label: ev.category,
        start_date: ev.start_date,
        end_date: ev.end_date,
        color,
        academic_year: ev.academic_year,
        description: ev.description,
        is_holiday: false,
      },
    };
  });

  return [...customEvents, ...nationalHolidayEvents.value];
});

// FullCalendar options
const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: "dayGridMonth",
  firstDay: 0, // Start on Sunday (Minggu)
  height: "auto",
  headerToolbar: {
    left: "prev next today",
    center: "title",
    right: "",
  },
  locales: [idLocale],
  locale: "id",
  buttonText: {
    today: "Hari Ini",
  },
  events: calendarEvents.value,
  eventClick: handleEventClick,
  dayHeaderFormat: { weekday: "short" },
  dayMaxEvents: 3,
}));

function handleEventClick(clickInfo) {
  const props = clickInfo.event.extendedProps;
  selectedEvent.value = {
    id: clickInfo.event.id,
    title: clickInfo.event.title,
    category: props.category || "event",
    category_label: props.category_label || (props.category === "nasional" ? "Libur Nasional" : props.category) || "event",
    start_date: props.start_date,
    end_date: props.end_date,
    color: props.color || CATEGORY_COLORS[props.category] || "#3b82f6",
    academic_year: props.academic_year || "20261",
    description: props.description || "",
    is_holiday: Boolean(props.is_holiday),
    is_cuti_bersama: Boolean(props.is_cuti_bersama),
  };
  isModalOpen.value = true;
}

function openEventModal(ev) {
  selectedEvent.value = {
    ...ev,
    category_label: ev.category_label || (ev.category === "nasional" ? "Libur Nasional" : ev.category) || "event",
    is_holiday: Boolean(ev.is_holiday),
  };
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  selectedEvent.value = null;
}

// Event status calculator
function getEventStatus(event) {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const start = event.start_date;
  const end = event.end_date || event.start_date;

  if (todayKey > end) {
    return { label: "Selesai", class: "bg-[var(--hover)] text-[var(--muted)] border border-[var(--border)]" };
  } else if (todayKey >= start && todayKey <= end) {
    return { label: "Sedang Berlangsung", class: "mk-badge-ok" };
  } else {
    return { label: "Akan Datang", class: "bg-blue-500/10 text-[var(--accent)] border border-blue-500/25" };
  }
}

const currentTime = ref(Date.now());
let timer = null;

const latestTimestamp = computed(() => getLatestTimestamp(events.value));
const lastUpdatedTime = computed(() => {
  if (!latestTimestamp.value) return "just now";
  return formatRelativeTime(latestTimestamp.value, currentTime.value);
});

function handleKeyDown(e) {
  if (e.key === "Escape" && isModalOpen.value) {
    closeModal();
  }
}

watch(isModalOpen, (open) => {
  if (typeof document !== "undefined") {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
  }
});

onMounted(async () => {
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", handleKeyDown);
  }
  await fetchEvents();
  timer = setInterval(() => {
    currentTime.value = Date.now();
  }, 30000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  if (typeof window !== "undefined") {
    window.removeEventListener("keydown", handleKeyDown);
  }
  if (typeof document !== "undefined") {
    document.body.classList.remove("overflow-hidden");
  }
});
</script>

<template>
  <section class="w-full mb-6 scroll-mt-20 calendar-section" id="kalender">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2.5">
      <div>
        <h2 class="mk-section-title">
          Kalender
        </h2>
      </div>

      <!-- Category Legend (Event, Prodi, Kampus) -->
      <div class="flex items-center gap-1.5 flex-wrap">
        <div
          v-for="cat in legendCategories"
          :key="cat.id"
          class="px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
        >
          <span
            class="w-2 h-2 rounded-full flex-shrink-0"
            :style="{ backgroundColor: cat.color }"
          ></span>
          <span>{{ cat.label }}</span>
        </div>
      </div>
    </div>

    <!-- Main Calendar Card (Pure FullCalendar) -->
    <div class="mk-card overflow-hidden flex flex-col transition-colors">
      <!-- FullCalendar Container -->
      <div class="p-3 sm:p-4 md:p-5 fullcalendar-wrapper">
        <FullCalendar ref="fullCalendarRef" :options="calendarOptions" />
      </div>

      <!-- Footer Last Update (Under the calendar, inside the calendar container) -->
      <div class="px-4 py-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted)]">
        <span class="inline-flex items-center gap-1.5">
          <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Last update: {{ lastUpdatedTime }}</span>
        </span>

        <router-link
          to="/pengurus"
          class="font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1"
        >
          <span>Kelola di Zona Pengurus</span>
          <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </router-link>
      </div>
    </div>

    <!-- Event Detail Modal -->
    <div
      v-if="isModalOpen && selectedEvent"
      class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4"
      @click.self="closeModal"
      @keydown.esc="closeModal"
    >
      <div
        class="mk-card w-full max-w-lg max-h-[85vh] sm:max-h-[80vh] shadow-xl flex flex-col overflow-hidden"
      >
        <!-- Modal Header -->
        <div class="px-4 py-3.5 sm:px-5 border-b border-[var(--border)] flex items-start justify-between gap-3 shrink-0 bg-[var(--surface)]">
          <div class="space-y-1 min-w-0 pr-1">
            <span
              class="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white inline-block uppercase"
              :style="{ backgroundColor: selectedEvent.color || CATEGORY_COLORS[selectedEvent.category] || '#2563eb' }"
            >
              {{ selectedEvent.category_label || selectedEvent.category }}
            </span>
            <h3 class="text-base font-semibold text-[var(--text)] leading-snug break-words">
              {{ selectedEvent.title }}
            </h3>
          </div>
          <button
            type="button"
            @click="closeModal"
            aria-label="Tutup modal"
            class="text-[var(--muted)] hover:text-[var(--text)] w-8 h-8 mk-btn flex items-center justify-center text-sm font-semibold cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-4 sm:p-5 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-3.5 text-xs text-[var(--muted)]">
          <dl class="space-y-2 m-0">
            <div class="mk-kv">
              <dt class="shrink-0">Tanggal Mulai</dt>
              <dd class="text-[var(--text)] font-medium text-right">{{ formatIndoDate(selectedEvent.start_date) }}</dd>
            </div>
            <div v-if="selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.start_date" class="mk-kv">
              <dt class="shrink-0">Tanggal Selesai</dt>
              <dd class="text-[var(--text)] font-medium text-right">{{ formatIndoDate(selectedEvent.end_date) }}</dd>
            </div>
            <div v-if="!selectedEvent.is_holiday" class="mk-kv">
              <dt class="shrink-0">Tahun Akademik</dt>
              <dd class="font-mono text-[var(--text)] font-medium text-right">{{ selectedEvent.academic_year || '20261' }}</dd>
            </div>
            <div v-else class="mk-kv">
              <dt class="shrink-0">Sumber</dt>
              <dd class="text-[var(--text)] font-medium text-right">SKB 3 Menteri Tahun 2026</dd>
            </div>
            <div class="mk-kv">
              <dt class="shrink-0">Status</dt>
              <dd>
                <span
                  :class="[
                    'mk-badge',
                    getEventStatus(selectedEvent).class,
                  ]"
                >
                  {{ getEventStatus(selectedEvent).label }}
                </span>
              </dd>
            </div>
          </dl>

          <div v-if="selectedEvent.description" class="space-y-1.5">
            <span class="mk-section-title block">Keterangan</span>
            <div class="whitespace-pre-wrap text-[var(--text)] bg-[var(--bg)] p-3 rounded-[8px] border border-[var(--border)] leading-relaxed font-normal max-h-48 sm:max-h-64 overflow-y-auto">
              {{ selectedEvent.description }}
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-4 py-3 sm:px-5 border-t border-[var(--border)] flex justify-end gap-2 shrink-0 bg-[var(--bg)]">
          <button
            type="button"
            @click="closeModal"
            class="w-full sm:w-auto px-4 py-2 mk-btn bg-[var(--surface)] cursor-pointer text-center"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
/* FullCalendar Customizations aligned with mikrotik-exporter palette */
.fullcalendar-wrapper .fc {
  font-family: inherit;
  --fc-border-color: #e2e8f0;
  --fc-button-text-color: #0f172a;
  --fc-button-bg-color: #f5f7fa;
  --fc-button-border-color: #e2e8f0;
  --fc-button-hover-bg-color: #f1f5f9;
  --fc-button-hover-border-color: #2563eb;
  --fc-button-active-bg-color: #2563eb;
  --fc-button-active-border-color: #2563eb;
}

.dark .fullcalendar-wrapper .fc {
  --fc-border-color: #334155;
  --fc-button-text-color: #f1f5f9;
  --fc-button-bg-color: #0f172a;
  --fc-button-border-color: #334155;
  --fc-button-hover-bg-color: #283548;
  --fc-button-hover-border-color: #60a5fa;
  --fc-page-bg-color: #1e293b;
}

.fullcalendar-wrapper .fc .fc-toolbar {
  flex-wrap: wrap;
  gap: 10px;
}

.fullcalendar-wrapper .fc .fc-toolbar-chunk {
  display: flex;
  align-items: center;
  gap: 6px;
}

.fullcalendar-wrapper .fc .fc-button-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.fullcalendar-wrapper .fc .fc-button-group > .fc-button,
.fullcalendar-wrapper .fc.fc-direction-ltr .fc-button-group > .fc-button:not(:first-child),
.fullcalendar-wrapper .fc.fc-direction-ltr .fc-button-group > .fc-button:not(:last-child) {
  margin: 0;
  margin-left: 0;
  border-radius: 6px;
}

.fullcalendar-wrapper .fc .fc-toolbar-title {
  font-weight: 600;
  font-size: 1rem;
  letter-spacing: -0.01em;
  color: var(--text);
}

.fullcalendar-wrapper .fc .fc-button-primary {
  background-color: var(--fc-button-bg-color);
  color: var(--fc-button-text-color);
  border: 1px solid var(--fc-button-border-color);
  border-radius: 6px;
  text-transform: capitalize;
  font-weight: 500;
  font-size: 12px;
  box-shadow: none;
  padding: 5px 12px;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, background-color 0.15s;
}

.fullcalendar-wrapper .fc .fc-prev-button,
.fullcalendar-wrapper .fc .fc-next-button {
  width: 32px;
  padding: 0;
}

.fullcalendar-wrapper .fc .fc-button-primary:hover {
  background-color: var(--fc-button-hover-bg-color);
  border-color: var(--fc-button-hover-border-color);
}

.fullcalendar-wrapper .fc .fc-button-primary:not(:disabled).fc-button-active,
.fullcalendar-wrapper .fc .fc-button-primary:not(:disabled):active {
  background-color: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}

.fullcalendar-wrapper .fc .fc-theme-standard th {
  background-color: var(--bg);
  padding: 8px 0;
  font-weight: 600;
  color: var(--muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--fc-border-color);
}

.fullcalendar-wrapper .fc .fc-daygrid-day-top {
  justify-content: center;
  padding-top: 5px;
}

.fullcalendar-wrapper .fc .fc-daygrid-day-number {
  font-weight: 500;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--muted);
  text-decoration: none;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.15s;
}

.fullcalendar-wrapper .fc .fc-daygrid-day-number:hover {
  background-color: var(--hover);
}

.fullcalendar-wrapper .fc .fc-day-today .fc-daygrid-day-number {
  background-color: #2563eb;
  color: #ffffff;
}

.fullcalendar-wrapper .fc .fc-event {
  border: none;
  border-radius: 5px;
  padding: 2px 5px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: filter 0.15s;
}

.fullcalendar-wrapper .fc-event:hover {
  filter: brightness(1.08);
}
</style>
