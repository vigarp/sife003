import { ref } from "vue";

const isDark = ref(false);

export function useTheme() {
  function initTheme() {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      isDark.value = true;
      document.documentElement.classList.add("dark");
    } else {
      isDark.value = false;
      document.documentElement.classList.remove("dark");
    }
  }

  function toggleTheme() {
    isDark.value = !isDark.value;
    if (isDark.value) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  return {
    isDark,
    initTheme,
    toggleTheme,
  };
}
