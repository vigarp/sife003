<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import idLocale from "@fullcalendar/core/locales/id";
import { useAcademicCalendar, CATEGORIES, CATEGORY_COLORS } from "@/composables/useAcademicCalendar";
import { getLatestTimestamp, formatRelativeTime } from "@/utils/timeAgo";

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

// FullCalendar formatted events (shows all events from CRUD)
const calendarEvents = computed(() => {
  return events.value.map((ev) => {
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
        start_date: ev.start_date,
        end_date: ev.end_date,
        color,
        academic_year: ev.academic_year,
        description: ev.description,
      },
    };
  });
});

// FullCalendar options
const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: "dayGridMonth",
  firstDay: 1, // Start on Monday (Senin)
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
    start_date: props.start_date,
    end_date: props.end_date,
    color: props.color || CATEGORY_COLORS[props.category] || "#3b82f6",
    academic_year: props.academic_year || "20261",
    description: props.description || "",
  };
  isModalOpen.value = true;
}

function openEventModal(ev) {
  selectedEvent.value = ev;
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
    return { label: "Selesai", class: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" };
  } else if (todayKey >= start && todayKey <= end) {
    return { label: "Sedang Berlangsung", class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold animate-pulse" };
  } else {
    return { label: "Akan Datang", class: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" };
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
  <section class="w-full mb-space-xl scroll-mt-20 calendar-section" id="kalender">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
      <div>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>Kalender</span>
        </h2>
      </div>

      <!-- Category Legend (Event, Prodi, Kampus) -->
      <div class="flex items-center gap-2 flex-wrap">
        <div
          v-for="cat in legendCategories"
          :key="cat.id"
          class="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs"
        >
          <span
            class="w-2.5 h-2.5 rounded-full flex-shrink-0"
            :style="{ backgroundColor: cat.color }"
          ></span>
          <span>{{ cat.label }}</span>
        </div>
      </div>
    </div>

    <!-- Main Calendar Card (Pure FullCalendar) -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col transition-colors">
      <!-- FullCalendar Container -->
      <div class="p-4 md:p-6 fullcalendar-wrapper">
        <FullCalendar ref="fullCalendarRef" :options="calendarOptions" />
      </div>

      <!-- Footer Last Update (Under the calendar, inside the calendar container) -->
      <div class="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span class="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <svg class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Last update: {{ lastUpdatedTime }}</span>
        </span>

        <router-link
          to="/pengurus"
          class="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
        >
          <span>Kelola di Zona Pengurus</span>
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </router-link>
      </div>
    </div>

    <!-- Event Detail Modal -->
    <div
      v-if="isModalOpen && selectedEvent"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 transition-opacity"
      @click.self="closeModal"
    >
      <div
        class="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[85vh] sm:max-h-[80vh] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <!-- Modal Header (Fixed / Non-scrolling) -->
        <div class="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0 bg-white dark:bg-slate-900">
          <div class="space-y-1 min-w-0 pr-1">
            <span
              class="px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-2xs inline-block uppercase"
              :style="{ backgroundColor: selectedEvent.color || CATEGORY_COLORS[selectedEvent.category] || '#2563eb' }"
            >
              {{ selectedEvent.category }}
            </span>
            <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug break-words">
              {{ selectedEvent.title }}
            </h3>
          </div>
          <button
            type="button"
            @click="closeModal"
            aria-label="Tutup modal"
            class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-colors cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        <!-- Modal Body (Scrollable Container) -->
        <div class="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-4 text-xs text-slate-600 dark:text-slate-300">
          <!-- Metadata List -->
          <div class="space-y-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div class="flex items-center justify-between gap-2">
              <span class="text-slate-400 shrink-0">Tanggal Mulai:</span>
              <strong class="text-slate-900 dark:text-white text-right">{{ formatIndoDate(selectedEvent.start_date) }}</strong>
            </div>
            <div v-if="selectedEvent.end_date" class="flex items-center justify-between gap-2">
              <span class="text-slate-400 shrink-0">Tanggal Selesai:</span>
              <strong class="text-slate-900 dark:text-white text-right">{{ formatIndoDate(selectedEvent.end_date) }}</strong>
            </div>
            <div class="flex items-center justify-between gap-2">
              <span class="text-slate-400 shrink-0">Tahun Akademik:</span>
              <strong class="font-mono text-slate-900 dark:text-white text-right">{{ selectedEvent.academic_year || '20261' }}</strong>
            </div>
            <div class="flex items-center justify-between gap-2">
              <span class="text-slate-400 shrink-0">Status:</span>
              <span
                :class="[
                  'px-2 py-0.5 rounded-full text-[11px] font-semibold',
                  getEventStatus(selectedEvent).class,
                ]"
              >
                {{ getEventStatus(selectedEvent).label }}
              </span>
            </div>
          </div>

          <!-- Keterangan (Scrollable Text Area) -->
          <div v-if="selectedEvent.description" class="space-y-1.5">
            <span class="text-slate-500 dark:text-slate-400 font-semibold block">Keterangan:</span>
            <div class="whitespace-pre-wrap text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 leading-relaxed font-normal max-h-48 sm:max-h-64 overflow-y-auto">
              {{ selectedEvent.description }}
            </div>
          </div>
        </div>

        <!-- Modal Footer (Fixed / Non-scrolling) -->
        <div class="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0 bg-slate-50/60 dark:bg-slate-900/60">
          <button
            type="button"
            @click="closeModal"
            class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer text-center"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
/* FullCalendar Customizations matching Simonev styling */
.fullcalendar-wrapper .fc {
  font-family: inherit;
  --fc-border-color: #e2e8f0;
  --fc-button-text-color: #0f172a;
  --fc-button-bg-color: #ffffff;
  --fc-button-border-color: #e2e8f0;
  --fc-button-hover-bg-color: #f8fafc;
  --fc-button-hover-border-color: #cbd5e1;
  --fc-button-active-bg-color: #2563eb;
  --fc-button-active-border-color: #2563eb;
}

.dark .fullcalendar-wrapper .fc {
  --fc-border-color: #1e293b;
  --fc-button-text-color: #f1f5f9;
  --fc-button-bg-color: #1e293b;
  --fc-button-border-color: #334155;
  --fc-button-hover-bg-color: #334155;
  --fc-button-hover-border-color: #475569;
  --fc-page-bg-color: #0f172a;
}

.fullcalendar-wrapper .fc-toolbar {
  flex-wrap: wrap !important;
  gap: 12px !important;
}

.fullcalendar-wrapper .fc-toolbar-chunk {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.fullcalendar-wrapper .fc-button-group {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.fullcalendar-wrapper .fc-button-group > .fc-button,
.fullcalendar-wrapper .fc-direction-ltr .fc-button-group > .fc-button:not(:first-child),
.fullcalendar-wrapper .fc-direction-ltr .fc-button-group > .fc-button:not(:last-child) {
  margin: 0 !important;
  margin-left: 0 !important;
  border-radius: 10px !important;
}

.fullcalendar-wrapper .fc-toolbar-title {
  font-weight: 700 !important;
  font-size: 1.15rem !important;
  letter-spacing: -0.025em;
  color: #0f172a;
}

.dark .fullcalendar-wrapper .fc-toolbar-title {
  color: #f8fafc !important;
}

.fullcalendar-wrapper .fc-button-primary {
  background-color: var(--fc-button-bg-color) !important;
  color: var(--fc-button-text-color) !important;
  border: 1px solid var(--fc-button-border-color) !important;
  border-radius: 10px !important;
  text-transform: capitalize !important;
  font-weight: 600 !important;
  font-size: 12px !important;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
  padding: 6px 14px !important;
  min-height: 34px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.2s !important;
}

.fullcalendar-wrapper .fc-prev-button,
.fullcalendar-wrapper .fc-next-button {
  width: 34px !important;
  padding: 0 !important;
}

.fullcalendar-wrapper .fc-button-primary:hover {
  background-color: var(--fc-button-hover-bg-color) !important;
  border-color: var(--fc-button-hover-border-color) !important;
}

.fullcalendar-wrapper .fc-button-primary:not(:disabled).fc-button-active, 
.fullcalendar-wrapper .fc-button-primary:not(:disabled):active {
  background-color: #2563eb !important;
  color: #ffffff !important;
  border-color: #2563eb !important;
}

.fullcalendar-wrapper .fc-theme-standard th {
  background-color: #f8fafc;
  padding: 10px 0;
  font-weight: 600;
  color: #64748b;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--fc-border-color);
}

.dark .fullcalendar-wrapper .fc-theme-standard th {
  background-color: #0f172a;
  color: #94a3b8;
}

.fullcalendar-wrapper .fc-daygrid-day-top {
  justify-content: center !important;
  padding-top: 6px;
}

.fullcalendar-wrapper .fc-daygrid-day-number {
  font-weight: 600 !important;
  font-size: 12px !important;
  color: #475569 !important;
  text-decoration: none !important;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.dark .fullcalendar-wrapper .fc-daygrid-day-number {
  color: #cbd5e1 !important;
}

.fullcalendar-wrapper .fc-daygrid-day-number:hover {
  background-color: #f1f5f9;
}

.dark .fullcalendar-wrapper .fc-daygrid-day-number:hover {
  background-color: #1e293b;
}

.fullcalendar-wrapper .fc-day-today .fc-daygrid-day-number {
  background-color: #2563eb !important;
  color: #ffffff !important;
  box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);
}

.fullcalendar-wrapper .fc-event {
  border: none !important;
  border-radius: 6px;
  padding: 3px 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  transition: transform 0.15s, filter 0.15s;
}

.fullcalendar-wrapper .fc-event:hover {
  transform: scale(1.02);
  filter: brightness(1.08);
}
</style>
