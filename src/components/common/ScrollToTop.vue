<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const props = defineProps({
  threshold: {
    type: Number,
    default: 300,
  },
});

const isVisible = ref(false);
let ticking = false;

function handleScroll() {
  if (typeof window === "undefined") return;

  if (!ticking) {
    ticking = true;
    window.requestAnimationFrame(() => {
      isVisible.value = window.scrollY > props.threshold;
      ticking = false;
    });
  }
}

function scrollToTop() {
  if (typeof window === "undefined") return;

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

onMounted(() => {
  if (typeof window !== "undefined") {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
  }
});

onUnmounted(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("scroll", handleScroll);
  }
});

defineExpose({
  isVisible,
  scrollToTop,
});
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-4 scale-90"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 translate-y-4 scale-90"
  >
    <button
      v-if="isVisible"
      type="button"
      @click="scrollToTop"
      aria-label="Kembali ke atas"
      title="Kembali ke atas"
      class="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 p-2.5 rounded-[8px] bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] shadow-md hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
    >
      <svg
        class="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2.5"
          d="M5 15l7-7 7 7"
        />
      </svg>
    </button>
  </Transition>
</template>
