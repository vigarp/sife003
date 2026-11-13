import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import TelemetriActivityChart from "@/components/telemetri/TelemetriActivityChart.vue";
import { useTelemetri } from "@/composables/useTelemetri";

describe("TelemetriActivityChart.vue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Pekan 10: 9 – 14 November 2026 (Sen 9 .. Sab 14)
    vi.setSystemTime(new Date(2026, 10, 13, 12, 0, 0));
    localStorage.clear();
    useTelemetri().clearToken();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("aggregates unique student and lecturer replies across topics per day in the active week", () => {
    const telemetri = useTelemetri();
    telemetri.selectedPertemuanNum.value = 14;
    telemetri.courseDetail.value = {
      data: [
        {
          kode_section: "PERTEMUAN_14",
          sub_section: [
            {
              id: "forum-14",
              kode_template: "FORUM_DISKUSI",
              warningAlert: null,
            },
          ],
        },
      ],
    };

    telemetri.topicReplies.value = [
      // Topic 1 on Nov 9 (Sen)
      { id: "s1", nim: "251011700088", _topicJudul: "Topik 1", createdAt: "2026-11-09T08:00:00" },
      // Topic 2 on Nov 9 (Sen)
      { id: "s2", nim: "251011700826", _topicJudul: "Topik 2", createdAt: "2026-11-09T10:00:00" },
      // Duplicate ID should be ignored
      { id: "s2", nim: "251011700826", _topicJudul: "Topik 2", createdAt: "2026-11-09T10:00:00" },
      // Lecturer reply on Nov 11 (Rab)
      { id: "d1", nim: null, id_dosen: "02682", dosen: { nama_gelar: "Dosen" }, createdAt: "2026-11-11T14:00:00" },
      // Student reply on Nov 13 (Jum)
      { id: "s3", nim: "251011700088", _topicJudul: "Topik 2", createdAt: "2026-11-13T09:00:00" },
    ];

    const wrapper = mount(TelemetriActivityChart);
    const text = wrapper.text();

    expect(text).toContain("Aktivitas Reply Pekan Ini");
    expect(text).toContain("Total 4 balasan (3 Mahasiswa, 1 Dosen)");
    expect(text).toContain("Sen");
    expect(text).toContain("Sab");
    expect(text).toContain("Topik 1");
    expect(text).toContain("Topik 2");
    expect(text).toContain("1 Mhs");
    expect(text).toContain("0 Dsn");
  });
});
