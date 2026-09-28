import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import Navbar from "@/components/layout/Navbar.vue";
import { useTheme } from "@/composables/useTheme";
import { useAdminAuth } from "@/composables/useAdminAuth";

describe("Navbar.vue", () => {
  beforeEach(() => {
    localStorage.clear();
    const auth = useAdminAuth();
    auth.logout();
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

  it("should render Kampus and Prodi links, and hide Pengurus links and WA invite button for unauthenticated user", () => {
    const wrapper = mount(Navbar, { global: globalConfig });
    expect(wrapper.text()).toContain("Satu UNPAM");
    expect(wrapper.text()).toContain("LINK-SI");
    expect(wrapper.text()).toContain("SIMONEV");
    expect(wrapper.text()).not.toContain("Kontak Dosen");
    expect(wrapper.text()).not.toContain("Monitoring Kehadiran Dosen");
    expect(wrapper.text()).not.toContain("Undangan Grup WA");
  });

  it("should show Pengurus links and allow copying WA group invite link when authenticated as admin", async () => {
    const auth = useAdminAuth();
    auth.token.value = "mock-token";
    auth.user.value = { role: "admin", nama_lengkap: "Admin Test", nim: "12345" };

    const wrapper = mount(Navbar, { global: globalConfig });
    expect(wrapper.text()).toContain("Kontak Dosen");
    expect(wrapper.text()).toContain("Monitoring Kehadiran Dosen");
    expect(wrapper.text()).toContain("Undangan Grup WA");

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      writable: true,
      configurable: true,
    });

    const copyBtn = wrapper.findAll("button").find((b) => b.text().includes("Undangan Grup WA"));
    expect(copyBtn).toBeDefined();
    await copyBtn.trigger("click");

    expect(writeTextMock).toHaveBeenCalledWith("https://chat.whatsapp.com/C2kXOlWaZxmDHzRdKsDJTh");
    expect(copyBtn.text()).toContain("Tersalin ke Clipboard!");
  });
});
