<script setup>
import { ref, computed, onMounted } from "vue";
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import idLocale from "@fullcalendar/core/locales/id";
import { useAcademicCalendar, CATEGORIES, CATEGORY_COLORS } from "@/composables/useAcademicCalendar";

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
    left: "prev,next today",
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

onMounted(async () => {
  await fetchEvents();
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
    </div>

    <!-- Event Detail Modal -->
    <div
      v-if="isModalOpen && selectedEvent"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity"
      @click.self="closeModal"
    >
      <div class="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <span
              class="px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-2xs inline-block uppercase"
              :style="{ backgroundColor: selectedEvent.color || CATEGORY_COLORS[selectedEvent.category] || '#3b82f6' }"
            >
              {{ selectedEvent.category }}
            </span>
            <h3 class="text-base md:text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {{ selectedEvent.title }}
            </h3>
          </div>
          <button
            @click="closeModal"
            class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-lg font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div class="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 border-t border-b border-slate-100 dark:border-slate-800 py-3">
          <div class="flex items-center justify-between">
            <span class="text-slate-400">Tanggal Mulai:</span>
            <strong class="text-slate-900 dark:text-white">{{ formatIndoDate(selectedEvent.start_date) }}</strong>
          </div>
          <div v-if="selectedEvent.end_date" class="flex items-center justify-between">
            <span class="text-slate-400">Tanggal Selesai:</span>
            <strong class="text-slate-900 dark:text-white">{{ formatIndoDate(selectedEvent.end_date) }}</strong>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-400">Tahun Akademik:</span>
            <strong class="font-mono text-slate-900 dark:text-white">{{ selectedEvent.academic_year || '20261' }}</strong>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-400">Status:</span>
            <span
              :class="[
                'px-2 py-0.5 rounded-full text-[11px] font-semibold',
                getEventStatus(selectedEvent).class,
              ]"
            >
              {{ getEventStatus(selectedEvent).label }}
            </span>
          </div>

          <div v-if="selectedEvent.description" class="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span class="text-slate-400 block mb-1 font-semibold">Keterangan:</span>
            <p class="whitespace-pre-wrap text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
              {{ selectedEvent.description }}
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-1">
          <button
            @click="closeModal"
            class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
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
  --fc-button-active-bg-color: #3b82f6;
  --fc-button-active-border-color: #3b82f6;
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
  transition: all 0.2s !important;
}

.fullcalendar-wrapper .fc-button-primary:hover {
  background-color: var(--fc-button-hover-bg-color) !important;
  border-color: var(--fc-button-hover-border-color) !important;
}

.fullcalendar-wrapper .fc-button-primary:not(:disabled).fc-button-active, 
.fullcalendar-wrapper .fc-button-primary:not(:disabled):active {
  background-color: #3b82f6 !important;
  color: #ffffff !important;
  border-color: #3b82f6 !important;
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
  background-color: #3b82f6 !important;
  color: #ffffff !important;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
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
