<script setup>
import { onMounted, onUnmounted } from "vue";
import { useTheme } from "@/composables/useTheme";
import { useLastVisited } from "@/composables/useLastVisited";
import { useAdminAuth } from "@/composables/useAdminAuth";

import Navbar from "@/components/layout/Navbar.vue";
import Footer from "@/components/layout/Footer.vue";
import ScrollToTop from "@/components/common/ScrollToTop.vue";

const { initTheme } = useTheme();
const { initGlobalListeners, cleanupGlobalListeners } = useLastVisited();
const { token, checkAuth } = useAdminAuth();

onMounted(() => {
  initTheme();
  initGlobalListeners();
  if (token.value) {
    checkAuth();
  }
});

onUnmounted(() => {
  cleanupGlobalListeners();
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">
    <!-- Sticky Navigation Header -->
    <Navbar />

    <!-- Main Content Container with Router View -->
    <main
      class="w-full max-w-[1140px] mx-auto px-3.5 sm:px-6 pt-5 min-h-[calc(100vh-12rem)] flex-1 min-w-0"
    >
      <router-view />
    </main>

    <!-- Academic Footer -->
    <Footer />

    <!-- Floating Scroll To Top Button -->
    <ScrollToTop />
  </div>
</template>
