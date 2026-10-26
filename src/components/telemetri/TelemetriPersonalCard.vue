<script setup>
import { useTelemetri } from "@/composables/useTelemetri";

defineEmits(["edit-nim"]);

const { personalStats, isForumOpen, userNim, userName } = useTelemetri();
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

    <!-- 4. Lecturer Feedback Alert (Ketika Dosen Membalas Jawaban Mahasiswa) -->
    <div
      v-if="personalStats.hasLecturerFeedback"
      class="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border-2 border-purple-300 dark:border-purple-800 space-y-3"
    >
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-purple-600 dark:text-purple-400 text-[20px] animate-bounce">mark_chat_unread</span>
        <span class="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wide">
          Perhatian: Dosen Telah Menanggapi Jawaban Anda!
        </span>
      </div>

      <div
        v-for="feedback in personalStats.lecturerReplies"
        :key="feedback.id"
        class="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/60 space-y-1.5 shadow-2xs"
      >
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-indigo-700 dark:text-indigo-300">
            {{ feedback.dosen }}
          </span>
          <span class="text-[11px] text-slate-400">
            {{ new Date(feedback.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) }}
          </span>
        </div>
        <p class="text-xs text-slate-800 dark:text-slate-200 italic font-serif leading-relaxed pl-2 border-l-2 border-purple-500">
          "{{ feedback.konten }}"
        </p>
      </div>
    </div>
  </div>
</template>

