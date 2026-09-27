<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";

const baseCalUrl =
  "https://calendar.google.com/calendar/embed?height=600&wkst=1&ctz=Asia%2FJakarta&showPrint=0&title=MAJU%20TAK%20GENTAR%20MUNDUR%20TAK%20GANJEL&src=c2lmZTAwMy4yMDI1MUBnbWFpbC5jb20&src=ZjJhMGQyYTI5MWIyOTBhODliMWYxMzdhNzBjZTcwMjMyNTMxMzE0NWYzODEwZmE1OWIwOWZkYWFjYjZhMzFhY0Bncm91cC5jYWxlbmRhci5nb29nbGUuY29t&src=ZDk5ZjI4N2NhZTZjNWI2ZWQ1ZGZkMDQ0YmRlZjkyMWYwYjkyMzFlMGFkYjVlYmJiZGYzY2M4NWRkNDRhNjI5ZEBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&src=ZW4uaW5kb25lc2lhbiNob2xpZGF5QGdyb3VwLnYuY2FsZW5kYXIuZ29vZ2xlLmNvbQ&src=MTM3NzgzMjA3Yzc3MGUxMTQ2YjUyNWFiNzZmZDY4NGM0ZjY5NjEzYjEyYjkwNzc4ZjFhMmQ3ODdkNWYxMTA0YkBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&color=%23039be5&color=%23e4c441&color=%238e24aa&color=%230b8043&color=%23009688";

const calMode = ref("MONTH");
const isCopied = ref(false);
const isIframeLoaded = ref(false);
const calendarContainer = ref(null);
let observer = null;

const iframeSrc = computed(() => `${baseCalUrl}&mode=${calMode.value}`);

function setMode(mode) {
  calMode.value = mode;
  if (!isIframeLoaded.value) {
    isIframeLoaded.value = true;
  }
}

function loadCalendar() {
  isIframeLoaded.value = true;
}

function copyCalendarLink() {
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard
      .writeText(baseCalUrl)
      .then(() => {
        isCopied.value = true;
        setTimeout(() => {
          isCopied.value = false;
        }, 2000);
      })
      .catch(() => {
        window.open(baseCalUrl, "_blank");
      });
  } else {
    window.open(baseCalUrl, "_blank");
  }
}

onMounted(() => {
  // Mobile devices (< 768px) default to AGENDA view for cleaner rendering
  if (typeof window !== "undefined" && window.innerWidth < 768) {
    calMode.value = "AGENDA";
  }

  // Defer iframe creation until calendar container is near viewport
  if ("IntersectionObserver" in window && calendarContainer.value) {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          isIframeLoaded.value = true;
          if (observer) {
            observer.disconnect();
            observer = null;
          }
        }
      },
      { rootMargin: "250px" }
    );
    observer.observe(calendarContainer.value);
  } else {
    isIframeLoaded.value = true;
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});
</script>

<template>
  <section class="w-full mb-space-xl scroll-mt-20 calendar-section" id="kalender" ref="calendarContainer">
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between mb-space-md gap-3"
    >
      <div>
        <h2 class="text-2xl font-bold text-primary-navy dark:text-slate-100">
          Agenda Kelas
        </h2>
      </div>
    </div>

    <!-- Calendar Content Card with Google Calendar Embed -->
    <div
      class="bg-surface-card dark:bg-slate-900 rounded-xl border border-border-ui dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors"
    >
      <!-- Calendar Top Info Bar -->
      <div
        class="px-4 py-2.5 bg-surface-alt dark:bg-slate-800/80 border-b border-border-ui dark:border-slate-800 flex flex-wrap items-center justify-between gap-2"
      >
        <div class="flex items-center gap-2">
          <span class="relative flex h-2.5 w-2.5">
            <span
              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"
            ></span>
            <span
              class="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary dark:bg-blue-400"
            ></span>
          </span>
          <span
            class="text-xs font-semibold text-text-main dark:text-slate-200 flex items-center gap-1.5"
          >
            <span>Kalender Akademik & Jadwal Kelas Terpadu</span>
          </span>
        </div>

        <!-- Controls: View Switcher (MONTH vs AGENDA) & Copy Link Button -->
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Calendar View Switcher -->
          <div
            class="inline-flex rounded-lg bg-surface dark:bg-slate-800 p-0.5 border border-border-ui dark:border-slate-700 text-xs"
            role="group"
            aria-label="Mode Tampilan Kalender"
          >
            <button
              type="button"
              @click="setMode('MONTH')"
              aria-label="Tampilan kalender bulan"
              :class="[
                'px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer',
                calMode === 'MONTH'
                  ? 'bg-surface-card dark:bg-slate-700 text-primary dark:text-blue-300 shadow-2xs'
                  : 'text-text-muted dark:text-slate-400 hover:text-text-main',
              ]"
            >
              Bulan
            </button>
            <button
              type="button"
              @click="setMode('AGENDA')"
              aria-label="Tampilan kalender agenda"
              :class="[
                'px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer',
                calMode === 'AGENDA'
                  ? 'bg-surface-card dark:bg-slate-700 text-primary dark:text-blue-300 shadow-2xs'
                  : 'text-text-muted dark:text-slate-400 hover:text-text-main',
              ]"
            >
              Agenda
            </button>
          </div>

          <!-- Copy Link Button -->
          <button
            type="button"
            @click="copyCalendarLink"
            aria-label="Salin tautan Google Calendar"
            class="px-2.5 py-1 rounded-lg bg-surface-card dark:bg-slate-800 text-text-main dark:text-slate-200 hover:text-primary dark:hover:text-blue-400 border border-border-ui dark:border-slate-700/80 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer focus:outline-none"
            title="Salin Tautan Google Calendar"
          >
            <span class="material-symbols-outlined text-[15px] text-primary dark:text-blue-400">
              {{ isCopied ? 'check' : 'content_copy' }}
            </span>
            <span>{{ isCopied ? 'Tersalin!' : 'Salin Tautan' }}</span>
          </button>
        </div>
      </div>

      <!-- Iframe Container with Lazy Mounting -->
      <div class="w-full relative min-h-[550px] md:min-h-[640px] bg-surface-alt dark:bg-slate-950 flex items-center justify-center">
        <!-- Render iframe when visible/loaded -->
        <iframe
          v-if="isIframeLoaded"
          :src="iframeSrc"
          class="w-full h-[550px] md:h-[640px] border-0"
          scrolling="no"
          loading="lazy"
          title="Google Calendar 03SIFE003"
        ></iframe>

        <!-- Placeholder when deferred -->
        <div
          v-else
          class="flex flex-col items-center justify-center p-8 text-center space-y-3"
        >
          <div
            class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-primary dark:text-blue-400"
          >
            <span class="material-symbols-outlined text-2xl">calendar_month</span>
          </div>
          <div class="max-w-xs">
            <p class="text-sm font-semibold text-text-main dark:text-slate-200">
              Kalender Kelas Terpadu
            </p>
            <p class="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Dimuat otomatis saat mendekati tampilan layar
            </p>
          </div>
          <button
            type="button"
            @click="loadCalendar"
            class="px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors shadow-xs cursor-pointer"
          >
            Muat Sekarang
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.calendar-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 650px;
}
</style>
