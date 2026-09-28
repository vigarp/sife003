<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";

const props = defineProps({
  siteKey: {
    type: String,
    required: true,
  },
  theme: {
    type: String,
    default: "auto", // 'auto' | 'light' | 'dark'
  },
  action: {
    type: String,
    default: "login",
  },
});

const emit = defineEmits(["verify", "expire", "error"]);

const containerRef = ref(null);
const widgetId = ref(null);
const scriptLoaded = ref(false);

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstileScript() {
  if (typeof window === "undefined" || !props.siteKey) return;

  if (window.turnstile) {
    scriptLoaded.value = true;
    renderWidget();
    return;
  }

  // Avoid unmocked network fetch errors during Happy-DOM / Vitest testing
  if (window.happyDOM || process.env.NODE_ENV === "test") {
    return;
  }

  let script = document.getElementById(SCRIPT_ID);
  if (!script) {
    script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoaded.value = true;
      renderWidget();
    };
    script.onerror = (err) => {
      console.warn("Cloudflare Turnstile script failed to load:", err);
      emit("error", err);
    };
    document.head.appendChild(script);
  } else {
    // Script tag already exists, poll briefly for window.turnstile
    const interval = setInterval(() => {
      if (window.turnstile) {
        clearInterval(interval);
        scriptLoaded.value = true;
        renderWidget();
      }
    }, 50);
    setTimeout(() => clearInterval(interval), 5000);
  }
}

function renderWidget() {
  if (!window.turnstile || !containerRef.value || !props.siteKey) return;

  try {
    // If already rendered, remove first
    if (widgetId.value !== null) {
      window.turnstile.remove(widgetId.value);
      widgetId.value = null;
    }

    widgetId.value = window.turnstile.render(containerRef.value, {
      sitekey: props.siteKey,
      theme: props.theme,
      action: props.action,
      callback: (token) => {
        emit("verify", token);
      },
      "expired-callback": () => {
        emit("expire");
      },
      "error-callback": (errCode) => {
        emit("error", errCode);
      },
    });
  } catch (err) {
    console.warn("Turnstile render error:", err);
    emit("error", err);
  }
}

function reset() {
  if (window.turnstile && widgetId.value !== null) {
    try {
      window.turnstile.reset(widgetId.value);
    } catch {
      renderWidget();
    }
  }
}

watch(
  () => props.theme,
  () => {
    if (scriptLoaded.value) {
      renderWidget();
    }
  }
);

onMounted(() => {
  loadTurnstileScript();
});

onUnmounted(() => {
  if (window.turnstile && widgetId.value !== null) {
    try {
      window.turnstile.remove(widgetId.value);
    } catch {
      // ignore
    }
    widgetId.value = null;
  }
});

defineExpose({
  reset,
});
</script>

<template>
  <div class="turnstile-wrapper flex justify-center my-2">
    <div ref="containerRef" class="min-h-[65px] flex items-center justify-center"></div>
  </div>
</template>
