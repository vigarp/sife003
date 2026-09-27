import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import CalendarSection from "@/components/calendar/CalendarSection.vue";

describe("CalendarSection.vue", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should render section title 'Agenda Kelas'", () => {
    const wrapper = mount(CalendarSection);
    expect(wrapper.text()).toContain("Agenda Kelas");
  });

  it("should switch between Bulan and Agenda views", async () => {
    const wrapper = mount(CalendarSection);
    const bulanBtn = wrapper.find('button[aria-label="Tampilan kalender bulan"]');
    const agendaBtn = wrapper.find('button[aria-label="Tampilan kalender agenda"]');

    expect(bulanBtn.exists()).toBe(true);
    expect(agendaBtn.exists()).toBe(true);

    await agendaBtn.trigger("click");
    expect(wrapper.vm.calMode).toBe("AGENDA");

    await bulanBtn.trigger("click");
    expect(wrapper.vm.calMode).toBe("MONTH");
  });

  it("should copy calendar link to clipboard on button click", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
    });

    const wrapper = mount(CalendarSection);
    const copyBtn = wrapper.find('button[aria-label="Salin tautan Google Calendar"]');
    await copyBtn.trigger("click");

    expect(writeTextMock).toHaveBeenCalled();
  });

  it("should mount iframe when lazy load trigger is clicked", async () => {
    const wrapper = mount(CalendarSection);

    // If iframe not loaded yet, placeholder with button exists
    if (!wrapper.vm.isIframeLoaded) {
      const loadBtn = wrapper.find("button.bg-primary");
      expect(loadBtn.exists()).toBe(true);

      await loadBtn.trigger("click");
      expect(wrapper.vm.isIframeLoaded).toBe(true);
      expect(wrapper.find("iframe").exists()).toBe(true);
    } else {
      expect(wrapper.find("iframe").exists()).toBe(true);
    }
  });
});
