<script setup>
import HeroSection from "@/components/hero/HeroSection.vue";
import ScheduleSection from "@/components/schedule/ScheduleSection.vue";
import AgendaSection from "@/components/agenda/AgendaSection.vue";
</script>

<template>
  <div class="flex flex-col w-full pb-space-xl">
    <!-- Hero Header Section -->
    <HeroSection />

    <!-- Jadwal Perkuliahan Section -->
    <ScheduleSection />

    <!-- Native Agenda Timeline Feed Section -->
    <AgendaSection />
  </div>
</template>
