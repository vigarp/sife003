import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import TelemetriView from "@/views/TelemetriView.vue";
import { useTelemetri } from "@/composables/useTelemetri";

describe("TelemetriView.vue", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [] }),
    });
  });

  it("should render Telemetri header with branding and controls", async () => {
    const wrapper = mount(TelemetriView);
    await flushPromises();

    expect(wrapper.text()).toContain("Telemetri");
    expect(wrapper.text()).toContain("Teleskop Mentari");
    expect(wrapper.text()).toContain("Target Mata Kuliah");
    expect(wrapper.text()).toContain("Sesi Pertemuan");
  });

  it("should show empty state prompting token when hasToken is false", async () => {
    const wrapper = mount(TelemetriView);
    await flushPromises();

    expect(wrapper.text()).toContain("Hubungkan Token Sesi Mentari Anda");
  });

  it("should render forum banner, personal stats and class monitor when course detail is loaded", async () => {
    const mockDetail = {
      kode_course: "20261-03SIFE003-22SIF0142",
      coursename: "Arsitektur dan Infrastruktur IT",
      peserta: [
        { nim: "251011700088", nama_mahasiswa: "VIGAR RIVAI PUTRA" },
        { nim: "251011700826", nama_mahasiswa: "MUHAMMAD RIZKY" },
      ],
      data: [
        {
          kode_section: "PERTEMUAN_8",
          sub_section: [
            {
              id: "forum-uuid-abc",
              kode_template: "FORUM_DISKUSI",
              konten: "<p>Wajib reply 2x</p>",
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
      data: [
        { id: "r1", nim: "251011700088", konten: "Hadir" },
      ],
    };

    const mockReplies2 = {
      data: [
        { id: "r2", nim: "251011700088", konten: "Jawaban Soal" },
      ],
    };

    global.fetch = vi.fn().mockImplementation(async (url) => {
      const urlStr = String(url);
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

    const telemetri = useTelemetri();
    telemetri.saveToken("sample_jwt_token_for_telemetri_12345");
    telemetri.saveUserNim("251011700088");

    const wrapper = mount(TelemetriView);
    await flushPromises();

    // Check Forum Banner
    expect(wrapper.text()).toContain("Forum Diskusi Pertemuan 8 Terbuka");
    expect(wrapper.text()).toContain("Absen");
    expect(wrapper.text()).toContain("Soal");

    // Check Personal Card
    expect(wrapper.text()).toContain("Radar Pribadi Anda");
    expect(wrapper.text()).toContain("MEMENUHI SYARAT");

    // Check Class Monitor
    expect(wrapper.text()).toContain("Radar Keaktifan Kelas (03SIFE003)");
    expect(wrapper.text()).toContain("VIGAR RIVAI PUTRA");
  });
});
