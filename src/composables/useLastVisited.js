import { ref } from "vue";

const activeKey = ref(null);

export function useLastVisited() {
  function setVisited(key) {
    activeKey.value = key;
  }

  function clearVisited() {
    activeKey.value = null;
  }

  function isVisited(key) {
    return activeKey.value === key;
  }

  function handleDocumentClick(e) {
    const actionBtn = e.target.closest(".action-link-btn");
    if (!actionBtn && activeKey.value) {
      clearVisited();
    }
  }

  function handleKeydown(e) {
    if (e.key === "Escape" && activeKey.value) {
      clearVisited();
    }
  }

  function initGlobalListeners() {
    if (typeof window !== "undefined") {
      window.addEventListener("click", handleDocumentClick);
      window.addEventListener("keydown", handleKeydown);
    }
  }

  function cleanupGlobalListeners() {
    if (typeof window !== "undefined") {
      window.removeEventListener("click", handleDocumentClick);
      window.removeEventListener("keydown", handleKeydown);
    }
  }

  return {
    activeKey,
    setVisited,
    clearVisited,
    isVisited,
    initGlobalListeners,
    cleanupGlobalListeners,
  };
}
