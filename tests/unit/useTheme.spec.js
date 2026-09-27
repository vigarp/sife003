import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTheme } from "@/composables/useTheme";

describe("useTheme composable", () => {
  let theme;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    theme = useTheme();
  });

  it("should initialize with light mode by default when no storage or system pref", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    theme.initTheme();
    expect(theme.isDark.value).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("should initialize dark mode if localStorage has theme='dark'", () => {
    localStorage.setItem("theme", "dark");
    theme.initTheme();

    expect(theme.isDark.value).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should toggle theme and update localStorage and document class", () => {
    theme.isDark.value = false;
    document.documentElement.classList.remove("dark");

    theme.toggleTheme();
    expect(theme.isDark.value).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");

    theme.toggleTheme();
    expect(theme.isDark.value).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
