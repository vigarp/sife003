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
    expect(wrapper.text()).toMatch(/Pekan (\d+|UTS|UAS) \((Upcoming|Ongoing)\)/);
    expect(wrapper.text()).toContain("Target tugas yang");
  });

  it("should fetch agendas for pekan UTS during UTS week and update when navigating", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
      }),
    });
    global.fetch = fetchMock;

    const { useSchedule } = await import("@/composables/useSchedule");
    const { setWeek, resetToCurrentWeek } = useSchedule();
    setWeek(7); // Index 7 is UTS

    mount(AgendaSection, { global: globalConfig });
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("pekan=UTS"));

    setWeek(8); // Index 8 is Pekan VIII (Week 8)
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("pekan=8"));

    resetToCurrentWeek();
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

  it("should display last update relative time based on newest task", async () => {
    const mockTasks = [
      {
        id: 1,
        pekan: 5,
        mata_kuliah: "Analisa Proses Bisnis",
        judul: "Tugas 1",
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        pekan: 5,
        mata_kuliah: "PBO",
        judul: "Tugas 2",
        created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
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

    expect(wrapper.text()).toContain("Last update: 2 minutes ago");
    expect(wrapper.text()).not.toContain("Automated synced");
  });

  it("should not render copy button for non-admin users", async () => {
    localStorage.clear();
    const { user } = await import("@/composables/useAdminAuth").then((m) => m.useAdminAuth());
    user.value = null;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [{ id: 1, mata_kuliah: "PBO", judul: "Tugas 1" }],
      }),
    });

    const wrapper = mount(AgendaSection, { global: globalConfig });
    await flushPromises();

    expect(wrapper.find('button[aria-label="Salin format tugas pekan ini"]').exists()).toBe(false);
  });

  it("should render copy button and copy formatted agendas for admin users", async () => {
    const { user } = await import("@/composables/useAdminAuth").then((m) => m.useAdminAuth());
    user.value = { id: 1, role: "admin", isAdmin: true };

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    const mockTasks = [
      {
        id: 1,
        mata_kuliah: "Pemrograman Berorientasi Obyek (Java I)",
        judul: "Tugas Pertemuan 4",
        keterangan: "Lanjutan pengumpulan tugas.",
      },
      {
        id: 2,
        mata_kuliah: "Rekayasa Web",
        judul: "Tugas Pertemuan 4",
        keterangan: "Push Pertemuan 4 ke github.",
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

    const copyBtn = wrapper.find('button[aria-label="Salin format tugas pekan ini"]');
    expect(copyBtn.exists()).toBe(true);

    await copyBtn.trigger("click");
    await flushPromises();

    expect(writeTextMock).toHaveBeenCalledWith(
      `Tugas-Tugas:\n*Pemrograman Berorientasi Obyek (Java I)*\nTugas Pertemuan 4\nLanjutan pengumpulan tugas.\n\n*Rekayasa Web*\nTugas Pertemuan 4\nPush Pertemuan 4 ke github.`
    );
    expect(wrapper.text()).toContain("Tersalin");

    // Clean up
    user.value = null;
  });
});
