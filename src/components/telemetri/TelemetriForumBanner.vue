<script setup>
import { ref, computed, watch } from "vue";
import { useTelemetri } from "@/composables/useTelemetri";
import { formatHtmlToText } from "@/utils/htmlText";

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

const activeTopicKonten = computed(() => {
  if (!activeTopic.value?.konten) return "";
  return formatHtmlToText(activeTopic.value.konten);
});

const sanitizedForumKonten = computed(() =>
  formatHtmlToText(forumSubsection.value?.konten)
);
</script>

<template>
  <div v-if="courseDetail">
    <!-- 1. FORUM TERBUKA (OPEN) -->
    <div
      v-if="isForumOpen"
      class="mk-card p-3 sm:p-4 space-y-3"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span class="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400">forum</span>
        <h2 class="text-sm font-semibold text-[var(--text)]">
          Forum Diskusi Pertemuan {{ selectedPertemuanNum }} Terbuka
        </h2>
        <span class="mk-badge mk-badge-ok">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>AKTIF</span>
        </span>
      </div>

      <!-- Interactive Topics Selector Pills -->
      <div v-if="forumTopics.length > 0" class="space-y-2 pt-0.5">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="mk-section-title flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[15px]">topic</span>
            <span>Topik Diskusi ({{ forumTopics.length }} Topik):</span>
          </span>
        </div>

        <div class="flex items-center gap-1.5 flex-wrap">
          <button
            v-for="t in forumTopics"
            :key="t.id"
            type="button"
            @click="selectedTopicId = t.id"
            class="mk-subtab inline-flex items-center gap-1.5 text-left"
            :class="{ 'mk-subtab-active': selectedTopicId === t.id }"
          >
            <span class="material-symbols-outlined text-[14px] shrink-0">
              {{ selectedTopicId === t.id ? 'check_circle' : 'topic' }}
            </span>
            <span>{{ t.judul }}</span>
            <span
              class="mk-badge !py-0 !px-1.5 !text-[10px] tabular-nums"
              :class="
                selectedTopicId === t.id
                  ? 'bg-white/20 text-white'
                  : 'bg-[var(--hover)] text-[var(--muted)]'
              "
            >
              {{ getTopicReplyCount(t.id) }} balasan
            </span>
          </button>
        </div>
      </div>

      <!-- Detail Konten Topik yang Terpilih -->
      <div
        v-if="activeTopic"
        class="rounded-[8px] border border-[var(--border)] bg-[var(--bg)] p-3 space-y-2"
      >
        <div class="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2 flex-wrap">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="material-symbols-outlined text-[15px] text-[var(--muted)] shrink-0">quiz</span>
            <h3 class="text-xs font-semibold text-[var(--text)]">
              Soal / Instruksi: <span class="text-[var(--accent)]">{{ activeTopic.judul }}</span>
            </h3>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-[11px] font-medium text-[var(--muted)] tabular-nums">
              {{ getTopicReplyCount(activeTopic.id) }} tanggapan
            </span>
            <button
              type="button"
              @click="openTopicLms(activeTopic.id)"
              class="mk-btn !py-1 !px-2 !text-[11px]"
              title="Buka topik ini langsung di Mentari LMS untuk membalas/reply"
            >
              <span>Buka Topik di LMS</span>
              <span class="material-symbols-outlined text-[13px]">open_in_new</span>
            </button>
          </div>
        </div>

        <div
          v-if="activeTopicKonten"
          class="text-xs text-[var(--text)] leading-relaxed whitespace-pre-line bg-[var(--surface)] p-2.5 sm:p-3 rounded-[6px] border border-[var(--border)]"
        >
          {{ activeTopicKonten }}
        </div>
        <div
          v-else
          class="text-xs text-[var(--muted)] italic py-1"
        >
          (Topik ini tidak menyertakan deskripsi teks instruksi)
        </div>
      </div>
    </div>

    <!-- 2. FORUM BELUM DIBUKA / TERKUNCI (CLOSED) -->
    <div
      v-else
      class="mk-card border-amber-500/40 p-3.5 sm:p-4 space-y-1.5"
    >
      <div class="flex items-start gap-2.5">
        <span class="material-symbols-outlined text-[18px] text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">lock</span>
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-sm font-semibold text-[var(--text)]">
              Forum Diskusi Pertemuan {{ selectedPertemuanNum }} Belum Dibuka
            </h2>
            <span class="mk-badge mk-badge-warn">
              TERKUNCI
            </span>
          </div>
          <p class="text-xs text-[var(--muted)] leading-relaxed">
            {{ forumWarning || "Soal forum diskusi belum tersedia, silakan menghubungi dosen pengampu mata kuliah." }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
