import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

vi.mock("@fullcalendar/vue3", () => ({
  default: {
    name: "FullCalendar",
    template: "<div class='fullcalendar-mock'></div>",
    props: ["options"],
  },
}));

import CalendarSection from "@/components/calendar/CalendarSection.vue";

describe("CalendarSection.vue (Pure FullCalendar)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            id: 1,
            title: "Seminar Teknologi Web",
            category: "event",
            start_date: "2026-10-12",
            end_date: "2026-10-14",
            color: "#3b82f6",
            academic_year: "20261",
            description: "Seminar dan workshop teknologi",
          },
          {
            id: 2,
            title: "Batas Pengisian KRS",
            category: "prodi",
            start_date: "2026-10-05",
            end_date: "2026-10-05",
            color: "#8b5cf6",
            academic_year: "20261",
            description: "KRS Online Semester Ganjil",
          },
          {
            id: 3,
            title: "Dies Natalis UNPAM",
            category: "kampus",
            start_date: "2026-10-20",
            end_date: "2026-10-20",
            color: "#10b981",
            academic_year: "20261",
            description: "Perayaan Dies Natalis Universitas Pamulang",
          },
        ],
      }),
    });
  });

  const mountOptions = {
    global: {
      stubs: {
        FullCalendar: {
          name: "FullCalendar",
          template: '<div class="fc-stub"></div>',
          props: ["options"],
        },
        "router-link": {
          template: "<a><slot /></a>",
        },
      },
    },
  };

  it("should render section title 'Kalender'", () => {
    const wrapper = mount(CalendarSection, mountOptions);
    expect(wrapper.text()).toContain("Kalender");
  });

  it("should render category legends for Event, Prodi, and Kampus without All/Semua", () => {
    const wrapper = mount(CalendarSection, mountOptions);
    expect(wrapper.text()).not.toContain("Semua");
    expect(wrapper.text()).toContain("Event");
    expect(wrapper.text()).toContain("Prodi");
    expect(wrapper.text()).toContain("Kampus");
  });

  it("should configure FullCalendar to start on Sunday (firstDay = 0)", () => {
    const wrapper = mount(CalendarSection, mountOptions);
    expect(wrapper.vm.calendarOptions.firstDay).toBe(0);
  });

  it("should format calendarEvents for FullCalendar with proper date boundaries", async () => {
    const wrapper = mount(CalendarSection, mountOptions);
    await wrapper.vm.$nextTick();

    const events = wrapper.vm.calendarEvents;
    expect(events.length).toBe(3);

    // Multi-day event (start: 2026-10-12, end: 2026-10-14) should have exclusive end: 2026-10-15
    const multiDay = events.find((e) => e.title === "Seminar Teknologi Web");
    expect(multiDay.start).toBe("2026-10-12");
    expect(multiDay.end).toBe("2026-10-15");
    expect(multiDay.allDay).toBe(true);

    // Single-day event should have undefined end
    const singleDay = events.find((e) => e.title === "Batas Pengisian KRS");
    expect(singleDay.start).toBe("2026-10-05");
    expect(singleDay.end).toBeUndefined();
  });

  it("should open and close event detail modal when an event is selected", async () => {
    const wrapper = mount(CalendarSection, mountOptions);
    await wrapper.vm.$nextTick();

    const sampleEvent = {
      id: 99,
      title: "Ujian Tengah Semester",
      category: "prodi",
      start_date: "2026-11-01",
      end_date: "2026-11-07",
      color: "#8b5cf6",
      academic_year: "20261",
      description: "UTS semester ganjil",
    };

    wrapper.vm.openEventModal(sampleEvent);
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.isModalOpen).toBe(true);
    expect(wrapper.vm.selectedEvent.title).toBe("Ujian Tengah Semester");
    expect(wrapper.text()).toContain("Ujian Tengah Semester");

    wrapper.vm.closeModal();
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.isModalOpen).toBe(false);
  });

  it("should display last update footer inside calendar container", async () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000 - 60 * 1000).toISOString();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            id: 1,
            title: "Seminar Teknologi Web",
            category: "event",
            start_date: "2026-10-12",
            created_at: threeHoursAgo,
          },
        ],
      }),
    });

    const wrapper = mount(CalendarSection, mountOptions);
    await flushPromises();

    expect(wrapper.text()).toContain("Last update: 3 hours ago");
    expect(wrapper.text()).toContain("Kelola di Zona Pengurus");
  });
});
