<script setup>
import { onMounted, onUnmounted } from "vue";
import { useTheme } from "@/composables/useTheme";
import { useLastVisited } from "@/composables/useLastVisited";
import { useAdminAuth } from "@/composables/useAdminAuth";

import Navbar from "@/components/layout/Navbar.vue";
import Footer from "@/components/layout/Footer.vue";

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
  <div class="min-h-screen flex flex-col bg-surface dark:bg-slate-950 transition-colors duration-200">
    <!-- Sticky Navigation Header -->
    <Navbar />

    <!-- Main Content Container with Router View -->
    <main
      class="w-full max-w-[1440px] mx-auto px-margin-mobile lg:px-margin pt-10 min-h-[calc(100vh-16rem)] flex-1 min-w-0"
    >
      <router-view />
    </main>

    <!-- Academic Footer -->
    <Footer />
  </div>
</template>
