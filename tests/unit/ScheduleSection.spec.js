import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ScheduleSection from "@/components/schedule/ScheduleSection.vue";
import { useAdminAuth } from "@/composables/useAdminAuth";
import { useSchedule } from "@/composables/useSchedule";

describe("ScheduleSection.vue", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("should not show Mentari copy button for regular users", async () => {
    const { user } = useAdminAuth();
    user.value = null;

    const wrapper = mount(ScheduleSection);
    await flushPromises();

    expect(wrapper.find('button[aria-label="Salin jadwal Mentari pekan ini"]').exists()).toBe(false);
  });

  it("should render Mentari copy button for admin and copy formatted text", async () => {
    const { user } = useAdminAuth();
    user.value = { id: 1, role: "admin", isAdmin: true };

    const { setWeek } = useSchedule();
    setWeek(5); // Pekan VI

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    const wrapper = mount(ScheduleSection);
    await flushPromises();

    const copyBtn = wrapper.find('button[aria-label="Salin jadwal Mentari pekan ini"]');
    expect(copyBtn.exists()).toBe(true);

    await copyBtn.trigger("click");
    await flushPromises();

    expect(writeTextMock).toHaveBeenCalled();
    const calledWith = writeTextMock.mock.calls[0][0];
    expect(calledWith).toContain("🌞 MENTARI (5 – 10 Oktober 2026)");
    expect(calledWith).toContain("Kelompok 1 (Tambahan Online 3 SKS)");
    expect(calledWith).toContain("Cek jadwal, tugas dan kalender 👉 https://sife003.vercel.app");

    expect(wrapper.text()).toContain("Tersalin");

    // Clean up
    user.value = null;
  });
});
