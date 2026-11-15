<script setup>
import { normalizeWhatsAppNumber, getWhatsAppLink } from "@/utils/phoneUtils";

defineProps({
  phone: {
    type: String,
    default: "",
  },
  title: {
    type: String,
    default: "Buka Chat WhatsApp",
  },
  compact: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <a
    v-if="phone"
    :href="getWhatsAppLink(phone)"
    target="_blank"
    rel="noopener noreferrer"
    :class="
      compact
        ? 'inline-flex items-center gap-1 mt-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline'
        : 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors group'
    "
    :title="title"
  >
    <svg
      aria-hidden="true"
      :class="compact ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0'"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm.01 1.67c4.55 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.83a8.176 8.176 0 01-5.82 2.41c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.95-.19-.3a8.188 8.188 0 01-1.25-4.54c0-4.55 3.7-8.24 8.24-8.24zm4.51 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.98-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.01-1.24-.74-.66-1.25-1.48-1.39-1.73-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.68.32-.23.25-.89.87-.89 2.12s.91 2.46 1.04 2.63c.13.17 1.79 2.73 4.33 3.83.61.26 1.08.42 1.45.54.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.12-.22-.19-.47-.32z"/>
    </svg>
    <span>wa.me/+{{ normalizeWhatsAppNumber(phone) }}</span>
    <svg
      v-if="!compact"
      aria-hidden="true"
      class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  </a>
  <span v-else-if="!compact" class="text-slate-400 dark:text-slate-600 font-mono text-[11px]">-</span>
</template>
