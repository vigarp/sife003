<script setup>
import { ref, computed, watch } from "vue";
import { useTelemetri } from "@/composables/useTelemetri";

const {
  selectedPertemuanNum,
  selectedCourse,
  isForumOpen,
  forumWarning,
  forumSubsection,
  forumTopics,
  topicReplies,
  courseDetail,
} = useTelemetri();

const selectedTopicId = ref(null);

// Automatically select first topic when forumTopics change
watch(
  () => forumTopics.value,
  (newTopics) => {
    if (newTopics && newTopics.length > 0) {
      if (!newTopics.some((t) => t.id === selectedTopicId.value)) {
        selectedTopicId.value = newTopics[0].id;
      }
    } else {
      selectedTopicId.value = null;
    }
  },
  { immediate: true }
);

const activeTopic = computed(() => {
  if (!forumTopics.value || forumTopics.value.length === 0) return null;
  return (
    forumTopics.value.find((t) => t.id === selectedTopicId.value) ||
    forumTopics.value[0] ||
    null
  );
});

function getTopicReplyCount(topicId) {
  if (!topicReplies.value) return 0;
  return topicReplies.value.filter((r) => r._topicId === topicId).length;
}

const lmsUrl = computed(() => {
  const base = "https://mentari.unpam.ac.id/u-courses";
  if (!selectedCourse.value?.kode_course) return base;
  const safeKode = encodeURIComponent(String(selectedCourse.value.kode_course));
  const safePertemuan = encodeURIComponent(String(selectedPertemuanNum.value));
  return `${base}/${safeKode}?accord_pertemuan=PERTEMUAN_${safePertemuan}`;
});

function openLms() {
  const url = lmsUrl.value;
  if (url && typeof window !== "undefined" && url.startsWith("https://mentari.unpam.ac.id/")) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function openTopicLms(topicId = activeTopic.value?.id) {
  const kodeCourse = selectedCourse.value?.kode_course;
  const idForum = forumSubsection.value?.id;
  const targetTopicId = topicId || activeTopic.value?.id;
  if (!kodeCourse || !idForum || !targetTopicId) return;

  const safeKode = encodeURIComponent(String(kodeCourse));
  const safeForum = encodeURIComponent(String(idForum));
  const safeTopic = encodeURIComponent(String(targetTopicId));
  const url = `https://mentari.unpam.ac.id/u-courses/${safeKode}/forum/${safeForum}/topics/${safeTopic}`;

  if (typeof window !== "undefined" && url.startsWith("https://mentari.unpam.ac.id/")) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function formatKontenText(rawHtml) {
  if (!rawHtml) return "";
  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(rawHtml, "text/html");
      doc.querySelectorAll("br").forEach((el) => el.replaceWith("\n"));
      doc.querySelectorAll("p").forEach((el) => el.append("\n\n"));
      doc.querySelectorAll("li").forEach((el) => {
        el.prepend("• ");
        el.append("\n");
      });
      return (doc.body.textContent || "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    } catch {
      // Fallback
    }
  }
  return String(rawHtml).trim();
}

const activeTopicKonten = computed(() => {
  if (!activeTopic.value?.konten) return "";
  return formatKontenText(activeTopic.value.konten);
});

const sanitizedForumKonten = computed(() =>
  formatKontenText(forumSubsection.value?.konten)
);
</script>

<template>
  <div v-if="courseDetail">
    <!-- 1. FORUM TERBUKA (OPEN) -->
    <div
      v-if="isForumOpen"
      class="bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl border border-emerald-300 dark:border-emerald-800/80 p-5 space-y-4"
    >
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
            <span class="material-symbols-outlined text-[18px]">forum</span>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                Forum Diskusi Pertemuan {{ selectedPertemuanNum }} Terbuka
              </h2>
              <span class="px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse"></span>
                <span>AKTIF</span>
              </span>
            </div>
            <p class="text-xs text-emerald-700 dark:text-emerald-300/80 mt-0.5">
              Ditemukan {{ forumTopics.length }} topik diskusi yang dapat ditanggapi
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="openLms"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-slate-750 text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
        >
          <span>Buka di Mentari LMS</span>
          <span class="material-symbols-outlined text-[15px]">open_in_new</span>
        </button>
      </div>

      <!-- Info Sesi / Catatan Jadwal Forum (jika ada) -->
      <div
        v-if="sanitizedForumKonten"
        class="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/40 border border-emerald-200/90 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200"
      >
        <span class="material-symbols-outlined text-[17px] text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
          info
        </span>
        <div class="leading-relaxed whitespace-pre-line font-medium">
          <span class="font-bold">Info Sesi: </span>{{ sanitizedForumKonten }}
        </div>
      </div>

      <!-- Interactive Topics Selector Pills -->
      <div v-if="forumTopics.length > 0" class="space-y-2 pt-1">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span class="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[16px] text-emerald-600 dark:text-emerald-400">topic</span>
            <span>Topik Diskusi ({{ forumTopics.length }} Topik):</span>
          </span>
          <span class="text-[11px] text-emerald-700/80 dark:text-emerald-300/70">
            Klik topik untuk menampilkan soal / instruksi dosen
          </span>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <button
            v-for="t in forumTopics"
            :key="t.id"
            type="button"
            @click="selectedTopicId = t.id"
            :class="[
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer border',
              selectedTopicId === t.id
                ? 'bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-700 dark:border-emerald-400 ring-2 ring-emerald-500/30'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100/70 dark:hover:bg-slate-750'
            ]"
          >
            <span class="material-symbols-outlined text-[15px]">
              {{ selectedTopicId === t.id ? 'check_circle' : 'topic' }}
            </span>
            <span>{{ t.judul }}</span>
            <span
              :class="[
                'px-1.5 py-0.5 rounded-full text-[10px] font-extrabold',
                selectedTopicId === t.id
                  ? 'bg-emerald-800/60 text-white'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
              ]"
            >
              {{ getTopicReplyCount(t.id) }} balasan
            </span>
          </button>
        </div>
      </div>

      <!-- Detail Konten Topik yang Terpilih -->
      <div
        v-if="activeTopic"
        class="bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-900/80 p-4 space-y-2.5 shadow-2xs"
      >
        <div class="flex items-center justify-between gap-2 border-b border-emerald-100 dark:border-slate-800 pb-2 flex-wrap">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
              <span class="material-symbols-outlined text-[15px]">quiz</span>
            </span>
            <h3 class="text-xs font-bold text-slate-900 dark:text-white">
              Soal / Instruksi: <span class="text-emerald-700 dark:text-emerald-400">{{ activeTopic.judul }}</span>
            </h3>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {{ getTopicReplyCount(activeTopic.id) }} tanggapan
            </span>
            <button
              type="button"
              @click="openTopicLms(activeTopic.id)"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
              title="Buka topik ini langsung di Mentari LMS untuk membalas/reply"
            >
              <span>Buka Topik di LMS</span>
              <span class="material-symbols-outlined text-[13px]">open_in_new</span>
            </button>
          </div>
        </div>

        <div
          v-if="activeTopicKonten"
          class="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-line bg-slate-50/70 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800"
        >
          {{ activeTopicKonten }}
        </div>
        <div
          v-else
          class="text-xs text-slate-400 italic py-1"
        >
          (Topik ini tidak menyertakan deskripsi teks instruksi)
        </div>
      </div>
    </div>

    <!-- 2. FORUM BELUM DIBUKA / TERKUNCI (CLOSED) -->
    <div
      v-else
      class="bg-amber-50/80 dark:bg-amber-950/40 rounded-2xl border border-amber-300 dark:border-amber-800/80 p-5 space-y-3"
    >
      <div class="flex items-start gap-3">
        <div class="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
          <span class="material-symbols-outlined text-[18px]">lock</span>
        </div>
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-bold text-amber-950 dark:text-amber-200">
              Forum Diskusi Pertemuan {{ selectedPertemuanNum }} Belum Dibuka
            </h2>
            <span class="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-300 text-[10px] font-extrabold">
              TERKUNCI
            </span>
          </div>
          <p class="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
            {{ forumWarning || "Soal forum diskusi belum tersedia, silakan menghubungi dosen pengampu mata kuliah." }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
