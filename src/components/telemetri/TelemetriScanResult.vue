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

const expandedStage = ref(null); // 'pretest' | 'forum' | 'posttest' | 'kuesioner' | null

// Reset stage expansion when switching course or pertemuan
watch([selectedCourseKode, selectedPertemuanNum], () => {
  expandedStage.value = null;
});

// If user triggers Pindai Ulang while Forum Diskusi is already expanded, re-fetch forum details
watch(courseDetail, async () => {
  if (props.isActive && expandedStage.value === "forum" && !scanningForum.value) {
    await scanForumDetails();
  }
});

async function toggleStage(key) {
  if (expandedStage.value === key) {
    expandedStage.value = null;
    return;
  }
  expandedStage.value = key;
  if (key === "forum") {
    await scanForumDetails();
  }
}

function getCompletionStageMeta(key, title, icon, sub, lockedFallbackMsg = null) {
  let badge = "Belum Selesai";
  let badgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300";
  let description = "Aktivitas ini belum diselesaikan.";

  if (sub?.completion === true) {
    badge = "Selesai";
    badgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300";
    description = "Anda telah menyelesaikan tahapan ini.";
  } else if (!sub && lockedFallbackMsg) {
    badge = "Terkunci";
    badgeClass = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
    description = lockedFallbackMsg;
  } else if (sub?.warningAlert) {
    badge = "Terkunci";
    description = sub.warningAlert;
  } else if (!sub) {
    badge = "Belum Tersedia";
    badgeClass = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
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
    badgeClass: isForumOpen.value
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
      : "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300",
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
</script>

<template>
  <div class="space-y-3">
    <!-- Scanning Course Detail Loading State -->
    <div
      v-if="scanning && isActive"
      class="py-10 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5"
    >
      <div class="w-8 h-8 mx-auto border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs font-bold text-slate-900 dark:text-white">
        Sedang Mengambil Data Pertemuan...
      </p>
      <p class="text-[11px] text-slate-500 dark:text-slate-400">
        {{ statusMessage || "Menghubungkan ke API Mentari UNPAM" }}
      </p>
    </div>

    <!-- Error Banner -->
    <div
      v-else-if="error && isActive"
      class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-start gap-3 text-xs"
    >
      <span class="material-symbols-outlined text-rose-500 text-[18px] shrink-0 mt-0.5">error</span>
      <div class="space-y-1">
        <p class="font-bold">Terjadi Kendala Pemindaian</p>
        <p class="leading-relaxed">{{ error }}</p>
        <button
          v-if="error.includes('token') || error.includes('401')"
          type="button"
          @click="emit('open-token-modal')"
          class="underline font-bold mt-1 inline-block cursor-pointer"
        >
          Perbarui Token Mentari Sekarang &rarr;
        </button>
      </div>
    </div>

    <!-- Level 3 Sub-Accordions: Pre-Test, Forum Diskusi, Post-Test, Kuesioner -->
    <div v-else-if="courseDetail && isActive" class="space-y-2">
      <div
        v-for="stage in stageItems"
        :key="stage.key"
        class="rounded-xl border bg-slate-50/70 dark:bg-slate-950/40 overflow-hidden transition-colors"
        :class="
          expandedStage === stage.key
            ? 'border-indigo-300 dark:border-indigo-700'
            : 'border-slate-200 dark:border-slate-800'
        "
      >
        <button
          type="button"
          @click="toggleStage(stage.key)"
          :aria-expanded="expandedStage === stage.key"
          class="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="material-symbols-outlined text-[16px] text-slate-500 dark:text-slate-400 shrink-0">
              {{ stage.icon }}
            </span>
            <span class="text-xs font-bold text-slate-900 dark:text-white truncate">
              {{ stage.title }}
            </span>
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
              :class="stage.badgeClass"
            >
              {{ stage.badge }}
            </span>
          </div>

          <span
            class="material-symbols-outlined text-[18px] text-slate-400 transition-transform duration-200 shrink-0"
            :class="{ 'rotate-180 text-indigo-500': expandedStage === stage.key }"
          >
            expand_more
          </span>
        </button>

        <div
          v-if="expandedStage === stage.key"
          class="border-t border-slate-200/70 dark:border-slate-800 p-3 sm:p-4"
        >
          <!-- Forum Diskusi Content (Lazy-loaded on expand) -->
          <template v-if="stage.isForum">
            <div
              v-if="scanningForum"
              class="py-8 text-center space-y-2"
            >
              <div class="w-7 h-7 mx-auto border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p class="text-xs font-bold text-slate-900 dark:text-white">
                Sedang Meneropong Forum Diskusi...
              </p>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">
                {{ statusMessage || "Mengambil topik dan balasan forum" }}
              </p>
            </div>
            <div v-else class="space-y-5">
              <TelemetriForumBanner />
              <TelemetriPersonalCard @edit-nim="emit('open-token-modal')" />
              <TelemetriActivityChart />
              <TelemetriClassMonitor />
            </div>
          </template>

          <!-- Pre-Test / Post-Test / Kuesioner Status Card -->
          <div v-else class="text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <p v-if="stage.judul" class="font-bold text-slate-900 dark:text-white">
              {{ stage.judul }}
            </p>
            <p class="leading-relaxed">{{ stage.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
