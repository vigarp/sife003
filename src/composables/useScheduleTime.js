import { ref, onMounted, onUnmounted } from "vue";
import { getWibTime, isScheduleOngoing } from "@/utils/scheduleTime";

const currentWib = ref(getWibTime());
let timer = null;
let listenerCount = 0;

function startTimer() {
  if (timer === null && typeof window !== "undefined") {
    timer = setInterval(() => {
      currentWib.value = getWibTime();
    }, 15000);
  }
}

function stopTimer() {
  if (listenerCount <= 0 && timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

export function useScheduleTime() {
  onMounted(() => {
    listenerCount++;
    startTimer();
  });

  onUnmounted(() => {
    listenerCount--;
    stopTimer();
  });

  return {
    currentWib,
    isScheduleOngoing,
  };
}

