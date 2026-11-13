<script setup>
import { ref, computed, watch } from "vue";
import { useTelemetri } from "@/composables/useTelemetri";
import { formatHtmlToText } from "@/utils/htmlText";

defineEmits(["edit-nim"]);

const { personalStats, isForumOpen, userNim, userName, forumTopics } = useTelemetri();

const selectedTopicId = ref(null);

function getMyTopicReplyCount(topicId) {
  return personalStats.value.myReplies.filter((r) => r._topicId === topicId).length;
}

watch(
  [forumTopics, () => personalStats.value.myReplies],
  ([topics]) => {
    if (!topics || topics.length === 0) {
      selectedTopicId.value = null;
      return;
    }
    const stillExists = topics.some((t) => t.id === selectedTopicId.value);
    if (!stillExists) {
      const firstWithReplies = topics.find((t) => getMyTopicReplyCount(t.id) > 0);
      selectedTopicId.value = (firstWithReplies || topics[0]).id;
    }
  },
  { immediate: true }
);

const activeTopicReplies = computed(() => {
  const replies = personalStats.value.myReplies;
  if (!selectedTopicId.value) return replies;
  return replies.filter((r) => r._topicId === selectedTopicId.value);
});

function getChildRepliesForReply(replyId) {
  if (!replyId) return [];
  return (personalStats.value.childReplies || []).filter((cr) => cr.id_parent === replyId);
}

function formatReplyTime(reply) {
  const raw = reply.createdAt || reply.created_at || reply.tanggal || reply.updatedAt;
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}
</script>

<template>
  <div
    v-if="isForumOpen"
    class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-xs space-y-4"
  >
    <!-- Header -->
    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-[20px]">person_check</span>
        <h2 class="text-base font-bold text-slate-900 dark:text-white">
          Radar Pribadi Anda {{ userName ? `(${userName})` : '' }}
        </h2>
        <span class="text-xs font-mono text-slate-400 dark:text-slate-500">
          {{ userNim ? `(NIM: ${userNim})` : '(NIM belum diatur)' }}
        </span>
      </div>

      <button
        type="button"
        @click="$emit('edit-nim')"
        class="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
      >
        {{ userNim ? 'Ganti NIM' : 'Atur NIM' }}
      </button>
    </div>

    <!-- Personal Eligibility Badge & Counters -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <!-- 1. Eligibility Status -->
      <div
        class="p-4 rounded-xl border flex flex-col justify-between space-y-2"
        :class="
          personalStats.isEligible
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
            : personalStats.myReplyCount === 1
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200'
        "
      >
        <span class="text-[11px] font-bold uppercase tracking-wider opacity-75">Status Kelayakan</span>
        <div>
          <div class="flex items-center gap-1.5 font-black text-base">
            <span class="material-symbols-outlined text-[20px]">
              {{ personalStats.isEligible ? 'check_circle' : personalStats.myReplyCount === 1 ? 'warning' : 'cancel' }}
            </span>
            <span>
              {{ personalStats.isEligible ? 'MEMENUHI SYARAT' : personalStats.myReplyCount === 1 ? 'KURANG 1x REPLY' : 'BELUM REPLY' }}
            </span>
          </div>
          <p class="text-[11px] mt-1 opacity-90 leading-tight">
            {{
              personalStats.isEligible
                ? 'Minimal 2x reply tercapai. Anda berhak mengikuti post-test & kuisioner!'
                : personalStats.myReplyCount === 1
                ? 'Baru 1 balasan. Tambah 1 reply lagi agar presensi otomatis tercatat.'
                : 'Anda belum mengirimkan balasan pada forum pertemuan ini.'
            }}
          </p>
        </div>
      </div>

      <!-- 2. Total Replies -->
      <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Balasan Anda</span>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-black text-slate-900 dark:text-white">{{ personalStats.myReplyCount }}</span>
          <span class="text-xs font-semibold text-slate-400">/ 2x target minimum</span>
        </div>
        <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="personalStats.isEligible ? 'bg-emerald-500' : personalStats.myReplyCount === 1 ? 'bg-amber-500' : 'bg-rose-500'"
            :style="{ width: `${Math.min(100, (personalStats.myReplyCount / 2) * 100)}%` }"
          ></div>
        </div>
      </div>

      <!-- 3. Breakdown per Topic -->
      <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-1">
        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rincian per Topik</span>
        <div v-if="Object.keys(personalStats.topicBreakdown).length > 0" class="space-y-1 text-xs">
          <div
            v-for="(count, topic) in personalStats.topicBreakdown"
            :key="topic"
            class="flex items-center justify-between font-semibold"
          >
            <span class="text-slate-600 dark:text-slate-300 truncate max-w-[140px]">{{ topic }}</span>
            <span class="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px]">
              {{ count }}x reply
            </span>
          </div>
        </div>
        <p v-else class="text-xs text-slate-400 italic">Belum ada aktivitas di topik mana pun.</p>
      </div>
    </div>

    <!-- 4. Riwayat Balasan Anda per Topik (beserta Tanggapan Dosen relatif per reply) -->
    <div v-if="forumTopics.length > 0" class="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
      <div class="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
        <span class="material-symbols-outlined text-[16px] text-indigo-500 dark:text-indigo-400">chat</span>
        <span>Balasan Anda di Pertemuan Ini</span>
      </div>

      <!-- Horizontal Topic Selector Pills -->
      <div class="flex items-center gap-2 flex-wrap">
        <button
          v-for="t in forumTopics"
          :key="t.id"
          type="button"
          @click="selectedTopicId = t.id"
          :class="[
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer border',
            selectedTopicId === t.id
              ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-700 dark:border-indigo-400 ring-2 ring-indigo-500/30'
              : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
        >
          <span>{{ t.judul }}</span>
          <span
            :class="[
              'px-1.5 py-0.5 rounded-full text-[10px] font-extrabold',
              selectedTopicId === t.id
                ? 'bg-indigo-800/60 text-white'
                : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
            ]"
          >
            {{ getMyTopicReplyCount(t.id) }} balasan
          </span>
        </button>
      </div>

      <!-- Selected Topic Replies List -->
      <div v-if="activeTopicReplies.length > 0" class="space-y-3">
        <div
          v-for="(reply, idx) in activeTopicReplies"
          :key="reply.id || idx"
          class="space-y-2"
        >
          <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <div class="flex items-center justify-between gap-2 text-[11px]">
              <span class="font-bold text-indigo-600 dark:text-indigo-400">
                Balasan #{{ idx + 1 }}
              </span>
              <span v-if="formatReplyTime(reply)" class="text-slate-400 dark:text-slate-500">
                {{ formatReplyTime(reply) }}
              </span>
            </div>
            <p class="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
              {{ formatHtmlToText(reply.konten) || "(Tanpa teks)" }}
            </p>
          </div>

          <!-- Nested Child Replies (Dosen & Mahasiswa lain) directly under the matched reply -->
          <div
            v-if="getChildRepliesForReply(reply.id).length > 0"
            class="ml-4 sm:ml-6 pl-3 border-l-2 border-slate-300 dark:border-slate-700 space-y-2"
          >
            <div
              v-for="child in getChildRepliesForReply(reply.id)"
              :key="child.id"
              class="p-3 rounded-xl border space-y-1"
              :class="
                child.isLecturer
                  ? 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border-purple-200 dark:border-purple-800/70'
                  : 'bg-slate-50/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800'
              "
            >
              <div class="flex items-center justify-between gap-2 text-[11px]">
                <span
                  class="inline-flex items-center gap-1.5 font-bold"
                  :class="
                    child.isLecturer
                      ? 'text-purple-800 dark:text-purple-300'
                      : 'text-sky-700 dark:text-sky-300'
                  "
                >
                  <span class="material-symbols-outlined text-[14px]">reply</span>
                  <span>{{ child.author }}</span>
                  <span
                    class="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide"
                    :class="
                      child.isLecturer
                        ? 'bg-purple-200/80 text-purple-900 dark:bg-purple-900/70 dark:text-purple-200'
                        : 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300'
                    "
                  >
                    {{ child.isLecturer ? 'Dosen' : child.isSelf ? 'Anda' : 'Mahasiswa' }}
                  </span>
                </span>
                <span v-if="formatReplyTime(child)" class="text-slate-400 dark:text-slate-500">
                  {{ formatReplyTime(child) }}
                </span>
              </div>
              <p
                class="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line"
                :class="{ italic: child.isLecturer }"
              >
                {{ formatHtmlToText(child.konten) || "(Tanpa teks)" }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <p
        v-else
        class="text-xs text-slate-400 dark:text-slate-500 italic py-2"
      >
        Belum ada balasan Anda pada topik ini.
      </p>
    </div>
  </div>
</template>
