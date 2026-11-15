<script setup>
import { ref, computed, watch } from "vue";
import { useTelemetri } from "@/composables/useTelemetri";
import TelemetriForumBanner from "@/components/telemetri/TelemetriForumBanner.vue";
import TelemetriActivityChart from "@/components/telemetri/TelemetriActivityChart.vue";
import TelemetriPersonalCard from "@/components/telemetri/TelemetriPersonalCard.vue";
import TelemetriClassMonitor from "@/components/telemetri/TelemetriClassMonitor.vue";

const props = defineProps({
  isActive: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["open-token-modal"]);

const {
  scanning,
  scanningForum,
  error,
  statusMessage,
  courseDetail,
  selectedCourseKode,
  selectedPertemuanNum,
  preTestSubsection,
  postTestSubsection,
  kuesionerSubsection,
  isForumOpen,
  scanForumDetails,
} = useTelemetri();

const activeStage = ref("pretest"); // 'pretest' | 'forum' | 'posttest' | 'kuesioner'

// Reset stage selection when switching course or pertemuan
watch([selectedCourseKode, selectedPertemuanNum], () => {
  activeStage.value = "pretest";
});

// If user triggers Pindai Ulang while Forum Diskusi tab is active, re-fetch forum details
watch(courseDetail, async () => {
  if (props.isActive && activeStage.value === "forum" && !scanningForum.value) {
    await scanForumDetails();
  }
});

async function selectStage(key) {
  if (activeStage.value === key) return;
  activeStage.value = key;
  if (key === "forum") {
    await scanForumDetails();
  }
}

function getCompletionStageMeta(key, title, icon, sub, lockedFallbackMsg = null) {
  let badge = "Belum Selesai";
  let badgeClass = "mk-badge-warn";
  let description = "Aktivitas ini belum diselesaikan.";

  if (sub?.completion === true) {
    badge = "Selesai";
    badgeClass = "mk-badge-ok";
    description = "Anda telah menyelesaikan tahapan ini.";
  } else if (!sub && lockedFallbackMsg) {
    badge = "Terkunci";
    badgeClass = "bg-[var(--hover)] text-[var(--muted)] border border-[var(--border)]";
    description = lockedFallbackMsg;
  } else if (sub?.warningAlert) {
    badge = "Terkunci";
    description = sub.warningAlert;
  } else if (!sub) {
    badge = "Belum Tersedia";
    badgeClass = "bg-[var(--hover)] text-[var(--muted)] border border-[var(--border)]";
    description = `${title} belum tersedia pada pertemuan ini.`;
  }

  return {
    key,
    title,
    icon,
    badge,
    badgeClass,
    description,
    judul: sub?.judul || "",
    isForum: false,
  };
}

const stageItems = computed(() => {
  const preTest = getCompletionStageMeta(
    "pretest",
    "Pre-Test",
    "quiz",
    preTestSubsection.value
  );

  const forum = {
    key: "forum",
    title: "Forum Diskusi",
    icon: "forum",
    badge: isForumOpen.value ? "Aktif" : "Terkunci",
    badgeClass: isForumOpen.value ? "mk-badge-ok" : "mk-badge-warn",
    isForum: true,
  };

  const postTest = getCompletionStageMeta(
    "posttest",
    "Post-Test",
    "fact_check",
    postTestSubsection.value
  );

  const isPostTestDone = postTestSubsection.value?.completion === true;
  const kuesionerLockedMsg = isPostTestDone
    ? null
    : "Kuesioner akan muncul setelah Post-Test diselesaikan (completion: true).";

  const kuesioner = getCompletionStageMeta(
    "kuesioner",
    "Kuesioner",
    "rate_review",
    kuesionerSubsection.value,
    kuesionerLockedMsg
  );

  return [preTest, forum, postTest, kuesioner];
});

const currentStage = computed(
  () => stageItems.value.find((s) => s.key === activeStage.value) || stageItems.value[0]
);
</script>

<template>
  <div class="space-y-3">
    <!-- Scanning Course Detail Loading State -->
    <div
      v-if="scanning && isActive"
      class="py-8 text-center rounded-[8px] bg-[var(--bg)] border border-[var(--border)] space-y-2"
    >
      <div class="w-6 h-6 mx-auto border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs font-semibold text-[var(--text)]">
        Sedang Mengambil Data Pertemuan...
      </p>
      <p class="text-[11px] text-[var(--muted)]">
        {{ statusMessage || "Menghubungkan ke API Mentari UNPAM" }}
      </p>
    </div>

    <!-- Error Banner -->
    <div
      v-else-if="error && isActive"
      class="p-3 rounded-[8px] border border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300 flex items-start gap-2.5 text-xs"
    >
      <span class="material-symbols-outlined text-red-500 text-[18px] shrink-0 mt-0.5">error</span>
      <div class="space-y-1">
        <p class="font-semibold">Terjadi Kendala Pemindaian</p>
        <p class="leading-relaxed">{{ error }}</p>
        <button
          v-if="error.includes('token') || error.includes('401')"
          type="button"
          @click="emit('open-token-modal')"
          class="underline font-semibold mt-1 inline-block cursor-pointer"
        >
          Perbarui Token Mentari Sekarang &rarr;
        </button>
      </div>
    </div>

    <!-- Level 3 Horizontal Stage Tabs: Pre-Test, Forum Diskusi, Post-Test, Kuesioner -->
    <div v-else-if="courseDetail && isActive" class="space-y-3">
      <div
        role="tablist"
        aria-label="Tahapan Pertemuan"
        class="flex items-center gap-1.5 overflow-x-auto pb-1.5 border-b border-[var(--border)]"
      >
        <button
          v-for="stage in stageItems"
          :key="stage.key"
          type="button"
          role="tab"
          :aria-selected="activeStage === stage.key"
          @click="selectStage(stage.key)"
          class="mk-subtab inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          :class="{ 'mk-subtab-active': activeStage === stage.key }"
        >
          <span class="material-symbols-outlined text-[15px] shrink-0">
            {{ stage.icon }}
          </span>
          <span>{{ stage.title }}</span>
          <span
            class="mk-badge !py-0 !px-1.5 !text-[10px] shrink-0"
            :class="stage.badgeClass"
          >
            {{ stage.badge }}
          </span>
        </button>
      </div>

      <!-- Active Stage Panel (flattened on mobile to maximize width) -->
      <div v-if="currentStage" role="tabpanel">
        <!-- Forum Diskusi Content (Lazy-loaded on tab select) -->
        <template v-if="currentStage.isForum">
          <div
            v-if="scanningForum"
            class="py-8 text-center space-y-2"
          >
            <div class="w-6 h-6 mx-auto border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
            <p class="text-xs font-semibold text-[var(--text)]">
              Sedang Meneropong Forum Diskusi...
            </p>
            <p class="text-[11px] text-[var(--muted)]">
              {{ statusMessage || "Mengambil topik dan balasan forum" }}
            </p>
          </div>
          <div v-else class="space-y-3">
            <TelemetriForumBanner />
            <TelemetriPersonalCard @edit-nim="emit('open-token-modal')" />
            <TelemetriActivityChart />
            <TelemetriClassMonitor />
          </div>
        </template>

        <!-- Pre-Test / Post-Test / Kuesioner Status Card -->
        <div
          v-else
          class="p-3 sm:p-3.5 rounded-[8px] bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)] space-y-1"
        >
          <p v-if="currentStage.judul" class="font-semibold">
            {{ currentStage.judul }}
          </p>
          <p class="leading-relaxed text-[var(--muted)]">{{ currentStage.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
