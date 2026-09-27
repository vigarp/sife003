<script setup>
import { onMounted, onUnmounted } from "vue";
import { useTheme } from "@/composables/useTheme";
import { useLastVisited } from "@/composables/useLastVisited";

import Navbar from "@/components/layout/Navbar.vue";
import Footer from "@/components/layout/Footer.vue";
import HeroSection from "@/components/hero/HeroSection.vue";
import ScheduleSection from "@/components/schedule/ScheduleSection.vue";
import CalendarSection from "@/components/calendar/CalendarSection.vue";

const { initTheme } = useTheme();
const { initGlobalListeners, cleanupGlobalListeners } = useLastVisited();

onMounted(() => {
  initTheme();
  initGlobalListeners();
});

onUnmounted(() => {
  cleanupGlobalListeners();
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface dark:bg-slate-950 transition-colors duration-200">
    <!-- Sticky Navigation Header -->
    <Navbar />

    <!-- Main Content Container -->
    <main
      class="w-full max-w-[1440px] mx-auto px-margin-mobile lg:px-margin pt-10 min-h-[calc(100vh-16rem)] flex-1"
    >
      <div class="flex flex-col w-full pb-space-xl">
        <!-- Hero Section -->
        <HeroSection />

        <!-- Jadwal Pekan Perkuliahan Section -->
        <ScheduleSection />

        <!-- Google Calendar Section -->
        <CalendarSection />
      </div>
    </main>

    <!-- Academic Footer -->
    <Footer />
  </div>
</template>
