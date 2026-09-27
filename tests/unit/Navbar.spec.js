import { describe, it, expect, beforeEach } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import Navbar from "@/components/layout/Navbar.vue";
import { useTheme } from "@/composables/useTheme";

describe("Navbar.vue", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  const globalConfig = {
    stubs: {
      "router-link": RouterLinkStub,
    },
  };

  it("should render class identity badge", () => {
    const wrapper = mount(Navbar, { global: globalConfig });
    expect(wrapper.text()).toContain("03SIFE003");
    expect(wrapper.text()).toContain("Portal Kelas");
  });

  it("should toggle navigation dropdown on click", async () => {
    const wrapper = mount(Navbar, { global: globalConfig });
    const dropdownBtn = wrapper.find('button[aria-label="Menu navigasi tautan cepat"]');

    expect(dropdownBtn.attributes("aria-expanded")).toBe("false");

    await dropdownBtn.trigger("click");
    expect(dropdownBtn.attributes("aria-expanded")).toBe("true");

    await dropdownBtn.trigger("click");
    expect(dropdownBtn.attributes("aria-expanded")).toBe("false");
  });

  it("should close dropdown when Escape is pressed", async () => {
    const wrapper = mount(Navbar, { global: globalConfig });
    const dropdownBtn = wrapper.find('button[aria-label="Menu navigasi tautan cepat"]');

    await dropdownBtn.trigger("click");
    expect(dropdownBtn.attributes("aria-expanded")).toBe("true");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await wrapper.vm.$nextTick();
    expect(dropdownBtn.attributes("aria-expanded")).toBe("false");
  });

  it("should toggle theme when theme button is clicked", async () => {
    const wrapper = mount(Navbar, { global: globalConfig });
    const themeBtn = wrapper.find('button[title*="Ganti ke Mode"]');
    const { isDark } = useTheme();

    const initialDark = isDark.value;
    await themeBtn.trigger("click");

    expect(isDark.value).toBe(!initialDark);
  });
});
