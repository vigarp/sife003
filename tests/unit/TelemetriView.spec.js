import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import TelemetriView from "@/views/TelemetriView.vue";
import { useTelemetri } from "@/composables/useTelemetri";

function createMockMentariFetch() {
  const mockDetail = {
    kode_course: "20261-03SIFE003-22SIF0103",
    coursename: "Pemrograman Berorientasi Obyek (Java I)",
    peserta: [
      { nim: "251011700088", nama_mahasiswa: "VIGAR RIVAI PUTRA" },
      { nim: "251011700826", nama_mahasiswa: "MUHAMMAD RIZKY" },
    ],
    data: [
      {
        kode_section: "PERTEMUAN_14",
        sub_section: [
          {
            id: "forum-uuid-14",
            kode_template: "FORUM_DISKUSI",
            konten: "<p>Wajib reply 2x</p>",
            warningAlert: null,
          },
        ],
      },
      {
        kode_section: "PERTEMUAN_10",
        sub_section: [
          {
            id: "forum-uuid-10",
            kode_template: "FORUM_DISKUSI",
            konten: "<p>Forum Web</p>",
            warningAlert: null,
          },
        ],
      },
    ],
  };

  const mockTopics = {
    topics: [
      { id: "top1", judul: "Absen" },
      { id: "top2", judul: "Soal" },
    ],
  };

  const mockReplies1 = {
    data: [{ id: "r1", nim: "251011700088", konten: "Hadir" }],
  };

  const mockReplies2 = {
    data: [{ id: "r2", nim: "251011700088", konten: "Jawaban Soal" }],
  };

  return vi.fn().mockImplementation(async (url) => {
    const urlStr = String(url);
    if (urlStr.includes("user-course?") || urlStr.endsWith("user-course")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id_mata_kuliah: "22SIF0103",
              kode_course: "20261-03SIFE003-22SIF0103",
              coursename: "[3] PEMROGRAMAN BERORIENTASI OBYEK (JAVA I)",
            },
            {
              id_mata_kuliah: "22SIF0132",
              kode_course: "20261-03SIFE003-22SIF0132",
              coursename: "[2] REKAYASA WEB",
            },
          ],
        }),
      };
    }
    if (urlStr.includes("forum%2Ftopic") || urlStr.includes("forum/topic")) {
      return { ok: true, status: 200, json: async () => mockTopics };
    }
    if (urlStr.includes("top1")) {
      return { ok: true, status: 200, json: async () => mockReplies1 };
    }
    if (urlStr.includes("top2")) {
      return { ok: true, status: 200, json: async () => mockReplies2 };
    }
    return { ok: true, status: 200, json: async () => mockDetail };
  });
}

describe("TelemetriView.vue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Pekan 10 (9 - 14 Nov 2026): Java I has Pertemuan 14 & 15, Rekayasa Web has Pertemuan 10
    vi.setSystemTime(new Date(2026, 10, 13, 12, 0, 0));
    localStorage.clear();
    vi.restoreAllMocks();
    useTelemetri().clearToken();
    global.fetch = createMockMentariFetch();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render Telemetri header and empty state when hasToken is false", async () => {
    const wrapper = mount(TelemetriView);
    await flushPromises();

    expect(wrapper.text()).toContain("Telemetri");
    expect(wrapper.text()).toContain("Teleskop Mentari");
    expect(wrapper.text()).toContain("Hubungkan Token Sesi Mentari Anda");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should NOT auto-scan forums on mount (lazy-load only), and render week accordion", async () => {
    const telemetri = useTelemetri();
    telemetri.saveToken("sample_jwt_token_for_telemetri_12345");
    telemetri.saveUserNim("251011700088");

    const wrapper = mount(TelemetriView);
    await flushPromises();

    expect(wrapper.text()).toContain("Pekan 10");
    expect(wrapper.text()).toContain("Pekan Berjalan");
    expect(wrapper.text()).toContain("Pemrograman Berorientasi Obyek (Java I)");
    expect(wrapper.text()).toContain("Rekayasa Web");

    // Only user-course list should be fetched on mount, NOT user-course/:id or forum/topic
    const calledUrls = global.fetch.mock.calls.map((c) => String(c[0]));
    expect(calledUrls.some((u) => u.includes("forum"))).toBe(false);
    expect(calledUrls.some((u) => u.includes("22SIF0103"))).toBe(false);
  });

  it("should expand 3 SKS course into sub-accordions without hitting API, then scan when a pertemuan is clicked", async () => {
    const telemetri = useTelemetri();
    telemetri.saveToken("sample_jwt_token_for_telemetri_12345");
    telemetri.saveUserNim("251011700088");

    const wrapper = mount(TelemetriView);
    await flushPromises();

    const callsAfterMount = global.fetch.mock.calls.length;

    // 1. Click 3 SKS course (Java I)
    const javaBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Pemrograman Berorientasi Obyek (Java I)"));
    expect(javaBtn).toBeTruthy();
    await javaBtn.trigger("click");
    await flushPromises();

    // Sub-accordions should be visible, and NO extra API calls should have been made yet
    const p14Btn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Pertemuan 14") && !b.text().includes("Java I"));
    const p15Btn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Pertemuan 15") && !b.text().includes("Java I"));
    expect(p14Btn).toBeTruthy();
    expect(p15Btn).toBeTruthy();
    expect(global.fetch.mock.calls.length).toBe(callsAfterMount);

    // 2. Click Pertemuan 14 sub-accordion
    await p14Btn.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Forum Diskusi Pertemuan 14 Terbuka");
    expect(wrapper.text()).toContain("Absen");
    expect(wrapper.text()).toContain("Soal");
    expect(wrapper.text()).toContain("Radar Pribadi Anda");
    expect(wrapper.text()).toContain("MEMENUHI SYARAT");
    expect(wrapper.text()).toContain("Radar Keaktifan Kelas (03SIFE003)");
    expect(wrapper.text()).toContain("VIGAR RIVAI PUTRA");
  });
});
