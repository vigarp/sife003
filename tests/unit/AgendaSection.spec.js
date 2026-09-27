import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";
import AgendaSection from "@/components/agenda/AgendaSection.vue";

describe("AgendaSection.vue", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const globalConfig = {
    stubs: {
      "router-link": RouterLinkStub,
    },
  };

  it("should render section header with active week indicator (Upcoming or Ongoing)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
      }),
    });

    const wrapper = mount(AgendaSection, { global: globalConfig });
    await flushPromises();

    expect(wrapper.text()).toContain("Agenda Kelas");
    expect(wrapper.text()).toMatch(/Pekan \d+ \((Upcoming|Ongoing)\)/);
    expect(wrapper.text()).toContain("Target tugas yang");
  });

  it("should display empty state when no tasks exist for the week", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
      }),
    });

    const wrapper = mount(AgendaSection, { global: globalConfig });
    await flushPromises();
    expect(wrapper.text()).toContain("Tidak ada agenda tugas untuk pekan ini");
  });

  it("should render agenda tasks with proper deadline formatting", async () => {
    const mockTasks = [
      {
        id: 1,
        pekan: 5,
        pertemuan: 4,
        mata_kuliah: "Analisa Proses Bisnis",
        judul: "Tugas 2: Pemodelan Diagram BPMN",
        tipe_deadline: "datetime",
        tanggal: "2026-10-02",
        jam: "23:59",
      },
      {
        id: 2,
        pekan: 5,
        pertemuan: 4,
        mata_kuliah: "Pemrograman Berorientasi Obyek (Java I)",
        judul: "Latihan Polymorphism",
        tipe_deadline: "week_only",
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTasks,
      }),
    });

    const wrapper = mount(AgendaSection, { global: globalConfig });
    await flushPromises();

    expect(wrapper.text()).toContain("Analisa Proses Bisnis");
    expect(wrapper.text()).toContain("Tugas 2: Pemodelan Diagram BPMN");
    expect(wrapper.text()).toContain("Jumat, 2 Okt • 23:59 WIB");

    expect(wrapper.text()).toContain("Pemrograman Berorientasi Obyek (Java I)");
    expect(wrapper.text()).toContain("Latihan Polymorphism");
    expect(wrapper.text()).toContain("Pekan 5");
  });
});
