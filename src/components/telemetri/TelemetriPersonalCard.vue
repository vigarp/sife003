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
    class="mk-card p-3 sm:p-4 space-y-3.5"
  >
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--border)]">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
        <span class="material-symbols-outlined text-[var(--accent)] text-[18px]">person_check</span>
        <h2 class="text-sm font-semibold text-[var(--text)]">
          Radar Pribadi Anda {{ userName ? `(${userName})` : '' }}
        </h2>
        <span class="text-xs font-mono text-[var(--muted)]">
          {{ userNim ? `(NIM: ${userNim})` : '(NIM belum diatur)' }}
        </span>
      </div>

      <button
        type="button"
        @click="$emit('edit-nim')"
        class="mk-btn !py-1 !px-2 !text-[11px]"
      >
        {{ userNim ? 'Ganti NIM' : 'Atur NIM' }}
      </button>
    </div>

    <!-- Personal Eligibility Badge & Counters -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      <!-- 1. Eligibility Status -->
      <div
        class="p-3 rounded-[8px] border bg-[var(--bg)] flex flex-col justify-between space-y-2"
        :class="
          personalStats.isEligible
            ? 'border-emerald-500/40'
            : personalStats.myReplyCount === 1
            ? 'border-amber-500/40'
            : 'border-red-500/40'
        "
      >
        <span class="mk-section-title">Status Kelayakan</span>
        <div class="space-y-1">
          <div class="flex items-center gap-1.5 font-semibold text-sm">
            <span
              class="material-symbols-outlined text-[18px]"
              :class="
                personalStats.isEligible
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : personalStats.myReplyCount === 1
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400'
              "
            >
              {{ personalStats.isEligible ? 'check_circle' : personalStats.myReplyCount === 1 ? 'warning' : 'cancel' }}
            </span>
            <span
              class="mk-badge !text-[11px]"
              :class="
                personalStats.isEligible
                  ? 'mk-badge-ok'
                  : personalStats.myReplyCount === 1
                  ? 'mk-badge-warn'
                  : 'mk-badge-down'
              "
            >
              {{ personalStats.isEligible ? 'MEMENUHI SYARAT' : personalStats.myReplyCount === 1 ? 'KURANG 1x REPLY' : 'BELUM REPLY' }}
            </span>
          </div>
          <p class="text-[11px] text-[var(--muted)] leading-snug">
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
      <div class="p-3 rounded-[8px] bg-[var(--bg)] border border-[var(--border)] flex flex-col justify-between">
        <span class="mk-section-title">Total Balasan Anda</span>
        <div class="flex items-baseline gap-1.5 my-1">
          <span class="text-2xl font-semibold text-[var(--text)] tabular-nums">{{ personalStats.myReplyCount }}</span>
          <span class="text-xs text-[var(--muted)] tabular-nums">/ 2x target minimum</span>
        </div>
        <div class="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300"
            :class="personalStats.isEligible ? 'bg-emerald-500' : personalStats.myReplyCount === 1 ? 'bg-amber-500' : 'bg-red-500'"
            :style="{ width: `${Math.min(100, (personalStats.myReplyCount / 2) * 100)}%` }"
          ></div>
        </div>
      </div>

      <!-- 3. Breakdown per Topic -->
      <div class="p-3 rounded-[8px] bg-[var(--bg)] border border-[var(--border)] flex flex-col justify-between space-y-1.5">
        <span class="mk-section-title">Rincian per Topik</span>
        <div v-if="Object.keys(personalStats.topicBreakdown).length > 0" class="text-xs">
          <div
            v-for="(count, topic) in personalStats.topicBreakdown"
            :key="topic"
            class="mk-kv"
          >
            <span class="k truncate max-w-[140px]">{{ topic }}</span>
            <span class="mk-badge bg-[var(--hover)] text-[var(--accent)] border border-[var(--border)] tabular-nums">
              {{ count }}x reply
            </span>
          </div>
        </div>
        <p v-else class="text-xs text-[var(--muted)] italic">Belum ada aktivitas di topik mana pun.</p>
      </div>
    </div>

    <!-- 4. Riwayat Balasan Anda per Topik (beserta Tanggapan Dosen relatif per reply) -->
    <div v-if="forumTopics.length > 0" class="pt-3 border-t border-[var(--border)] space-y-2.5">
      <div class="mk-section-title flex items-center gap-1.5">
        <span class="material-symbols-outlined text-[15px]">chat</span>
        <span>Balasan Anda di Pertemuan Ini</span>
      </div>

      <!-- Horizontal Topic Selector Pills -->
      <div class="flex items-center gap-1.5 flex-wrap">
        <button
          v-for="t in forumTopics"
          :key="t.id"
          type="button"
          @click="selectedTopicId = t.id"
          class="mk-subtab inline-flex items-center gap-1.5 text-left"
          :class="{ 'mk-subtab-active': selectedTopicId === t.id }"
        >
          <span>{{ t.judul }}</span>
          <span
            class="mk-badge !py-0 !px-1.5 !text-[10px] tabular-nums"
            :class="
              selectedTopicId === t.id
                ? 'bg-white/20 text-white'
                : 'bg-[var(--hover)] text-[var(--muted)]'
            "
          >
            {{ getMyTopicReplyCount(t.id) }} balasan
          </span>
        </button>
      </div>

      <!-- Selected Topic Replies List -->
      <div v-if="activeTopicReplies.length > 0" class="space-y-2.5">
        <div
          v-for="(reply, idx) in activeTopicReplies"
          :key="reply.id || idx"
          class="space-y-2"
        >
          <div class="p-3 rounded-[8px] bg-[var(--bg)] border border-[var(--border)] space-y-1">
            <div class="flex items-center justify-between gap-2 text-[11px]">
              <span class="font-semibold text-[var(--accent)] tabular-nums">
                Balasan #{{ idx + 1 }}
              </span>
              <span v-if="formatReplyTime(reply)" class="text-[var(--muted)] tabular-nums font-mono text-[10px]">
                {{ formatReplyTime(reply) }}
              </span>
            </div>
            <p class="text-xs text-[var(--text)] whitespace-pre-line leading-relaxed">
              {{ formatHtmlToText(reply.konten) || "(Tanpa teks)" }}
            </p>
          </div>

          <!-- Nested Child Replies (Dosen & Mahasiswa lain) directly under the matched reply -->
          <div
            v-if="getChildRepliesForReply(reply.id).length > 0"
            class="ml-2.5 sm:ml-5 pl-2.5 sm:pl-3 border-l-2 border-[var(--border)] space-y-2"
          >
            <div
              v-for="child in getChildRepliesForReply(reply.id)"
              :key="child.id"
              class="p-2.5 sm:p-3 rounded-[8px] border bg-[var(--bg)] space-y-1"
              :class="child.isLecturer ? 'border-amber-500/40' : 'border-[var(--border)]'"
            >
              <div class="flex items-center justify-between gap-2 text-[11px]">
                <span class="inline-flex items-center gap-1.5 font-semibold text-[var(--text)]">
                  <span class="material-symbols-outlined text-[14px] text-[var(--muted)]">reply</span>
                  <span>{{ child.author }}</span>
                  <span
                    class="mk-badge !py-0 !px-1.5 !text-[9px] uppercase tracking-wide"
                    :class="
                      child.isLecturer
                        ? 'mk-badge-warn'
                        : 'bg-blue-500/10 text-[var(--accent)] border border-blue-500/25'
                    "
                  >
                    {{ child.isLecturer ? 'Dosen' : child.isSelf ? 'Anda' : 'Mahasiswa' }}
                  </span>
                </span>
                <span v-if="formatReplyTime(child)" class="text-[var(--muted)] tabular-nums font-mono text-[10px]">
                  {{ formatReplyTime(child) }}
                </span>
              </div>
              <p
                class="text-xs text-[var(--text)] leading-relaxed whitespace-pre-line"
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
        class="text-xs text-[var(--muted)] italic py-1.5"
      >
        Belum ada balasan Anda pada topik ini.
      </p>
    </div>
  </div>
</template>
