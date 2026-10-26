import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTelemetri } from "@/composables/useTelemetri";

describe("useTelemetri composable", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("should handle token and user NIM storage correctly", () => {
    const telemetri = useTelemetri();
    expect(telemetri.hasToken.value).toBe(false);
    expect(telemetri.courses.value).toEqual([]);
    expect(telemetri.userNim.value).toBe("");

    // Simulate saving a JWT that contains a payload with username (NIM)
    const mockPayload = btoa(JSON.stringify({ username: "251011700088", role: "MAHASISWA" }));
    const mockJwt = `header.${mockPayload}.signature`;

    telemetri.saveToken(mockJwt);
    expect(telemetri.token.value).toBe(mockJwt);
    expect(telemetri.hasToken.value).toBe(true);
    // Auto-extracted NIM
    expect(telemetri.userNim.value).toBe("251011700088");

    telemetri.saveUserNim("251011700999");
    expect(telemetri.userNim.value).toBe("251011700999");

    telemetri.clearToken();
    expect(telemetri.token.value).toBe("");
    expect(telemetri.hasToken.value).toBe(false);
    expect(telemetri.courses.value).toEqual([]);
  });

  it("should parse Mentari localStorage 'access' JSON array format and auto-extract profile", () => {
    const telemetri = useTelemetri();
    const mockPayload = btoa(
      JSON.stringify({
        username: "251011700088",
        fullname: "VIGAR RIVAI PUTRA",
        role: "MAHASISWA",
      })
    );
    const mockJwt = `header.${mockPayload}.signature`;
    const accessJson = JSON.stringify([{ role: "MAHASISWA", token: mockJwt }]);

    const parsed = telemetri.parseMentariAuth(accessJson);
    expect(parsed.valid).toBe(true);
    expect(parsed.token).toBe(mockJwt);
    expect(parsed.nim).toBe("251011700088");
    expect(parsed.fullname).toBe("VIGAR RIVAI PUTRA");
    expect(parsed.role).toBe("MAHASISWA");

    // Saving via saveToken directly accepts this accessJson
    telemetri.saveToken(accessJson);
    expect(telemetri.token.value).toBe(mockJwt);
    expect(telemetri.userNim.value).toBe("251011700088");
    expect(telemetri.userName.value).toBe("VIGAR RIVAI PUTRA");
    expect(telemetri.hasToken.value).toBe(true);
  });

  it("should import data snapshot smoothly via importSnapshot", () => {
    const telemetri = useTelemetri();
    const snapshot = {
      userNim: "251011700088",
      userName: "VIGAR RIVAI PUTRA",
      selectedCourseKode: "20261-03SIFE003-22SIF0142",
      selectedPertemuanNum: 8,
      courses: [{ kode_course: "20261-03SIFE003-22SIF0142", coursename: "Arsitektur IT" }],
      courseDetail: { data: [] },
      forumTopics: [{ id: "top1", judul: "Topik 1" }],
      topicReplies: [{ id: "r1", nim: "251011700088" }],
    };

    telemetri.importSnapshot(snapshot);
    expect(telemetri.userNim.value).toBe("251011700088");
    expect(telemetri.userName.value).toBe("VIGAR RIVAI PUTRA");
    expect(telemetri.selectedCourseKode.value).toBe("20261-03SIFE003-22SIF0142");
    expect(telemetri.selectedPertemuanNum.value).toBe(8);
    expect(telemetri.courses.value.length).toBe(1);
    expect(telemetri.forumTopics.value.length).toBe(1);
    expect(telemetri.topicReplies.value.length).toBe(1);
    expect(telemetri.isCloudflareBlocked.value).toBe(false);
  });

  it("should generate browser console script with target course & pertemuan", () => {
    const telemetri = useTelemetri();
    const script = telemetri.generateBrowserScript("20261-03SIFE003-22SIF0142", 8);
    expect(script).toContain("20261-03SIFE003-22SIF0142");
    expect(script).toContain("8");
    expect(script).toContain('localStorage.getItem("access")');
    expect(script).toContain("copy(JSON.stringify(snapshot))");
  });

  it("should detect closed forum when warningAlert is present", () => {
    const telemetri = useTelemetri();
    telemetri.selectedPertemuanNum.value = 1;
    telemetri.courseDetail.value = {
      data: [
        {
          kode_section: "PERTEMUAN_1",
          sub_section: [
            {
              id: null,
              kode_template: "FORUM_DISKUSI",
              warningAlert: "Soal forum diskusi belum tersedia, silahkan menghubungi dosen pengampu mata kuliah",
            },
          ],
        },
      ],
    };

    expect(telemetri.isForumOpen.value).toBe(false);
    expect(telemetri.forumWarning.value).toContain("Soal forum diskusi belum tersedia");
  });

  it("should detect open forum when valid ID exists and no warningAlert", () => {
    const telemetri = useTelemetri();
    telemetri.selectedPertemuanNum.value = 8;
    telemetri.courseDetail.value = {
      data: [
        {
          kode_section: "PERTEMUAN_8",
          sub_section: [
            {
              id: "forum-uuid-12345",
              kode_template: "FORUM_DISKUSI",
              warningAlert: null,
            },
          ],
        },
      ],
    };

    expect(telemetri.isForumOpen.value).toBe(true);
    expect(telemetri.forumWarning.value).toBeNull();
  });

  it("should aggregate student replies across multiple topics and calculate eligibility", () => {
    const telemetri = useTelemetri();
    telemetri.saveUserNim("251011700088");

    telemetri.courseDetail.value = {
      peserta: [
        { nim: "251011700088", nama_mahasiswa: "VIGAR RIVAI PUTRA" },
        { nim: "251011700826", nama_mahasiswa: "MUHAMMAD RIZKY" },
        { nim: "251011700310", nama_mahasiswa: "ADAM BURHANUDIN" },
        { nim: "251011700333", nama_mahasiswa: "AHMAD SANDI" },
      ],
    };

    // Simulated replies across 2 topics: "Absen" and "Soal"
    telemetri.topicReplies.value = [
      // Vigar: 1 reply in Absen + 1 reply in Soal => Total 2x (Eligible)
      { id: "r1", id_parent: "topic1", nim: "251011700088", _topicJudul: "Absen", konten: "Hadir" },
      { id: "r2", id_parent: "topic2", nim: "251011700088", _topicJudul: "Soal", konten: "Jawaban Soal Vigar" },

      // Rizky: 2 replies in Soal => Total 2x (Eligible)
      { id: "r3", id_parent: "topic2", nim: "251011700826", _topicJudul: "Soal", konten: "Jawaban 1" },
      { id: "r4", id_parent: "r3", nim: "251011700826", _topicJudul: "Soal", konten: "Jawaban 2" },

      // Adam: 1 reply in Absen only => Total 1x (Partial / Kurang 1x)
      { id: "r5", id_parent: "topic1", nim: "251011700310", _topicJudul: "Absen", konten: "Hadir" },

      // Sandi has 0 replies => (None)
    ];

    const stats = telemetri.classStats.value;
    expect(stats.totalStudents).toBe(4);
    expect(stats.eligibleCount).toBe(2); // Vigar & Rizky
    expect(stats.partialCount).toBe(1);  // Adam
    expect(stats.noneCount).toBe(1);     // Sandi
    expect(stats.percentage).toBe("50.0");

    // Personal Stats for Vigar
    const personal = telemetri.personalStats.value;
    expect(personal.myReplyCount).toBe(2);
    expect(personal.isEligible).toBe(true);
    expect(personal.topicBreakdown["Absen"]).toBe(1);
    expect(personal.topicBreakdown["Soal"]).toBe(1);
    expect(personal.hasLecturerFeedback).toBe(false);
  });

  it("should detect when a lecturer replies to the student answer", () => {
    const telemetri = useTelemetri();
    telemetri.saveUserNim("251011700088");

    telemetri.topicReplies.value = [
      { id: "my-reply-id-1", id_parent: "topic-soal", nim: "251011700088", konten: "Analisis arsitektur saya" },
      // Lecturer replies directly to my reply
      {
        id: "dosen-reply-id",
        id_parent: "my-reply-id-1",
        nim: null,
        id_dosen: "02682",
        dosen: { nama_gelar: "Ghema Nusa Persada M.TI" },
        konten: "Apakah perlu cloud computing dalam kasus ini?",
        createdAt: "2026-10-26T10:00:00Z",
      },
    ];

    const personal = telemetri.personalStats.value;
    expect(personal.hasLecturerFeedback).toBe(true);
    expect(personal.lecturerReplies.length).toBe(1);
    expect(personal.lecturerReplies[0].dosen).toContain("Ghema Nusa Persada");
    expect(personal.lecturerReplies[0].konten).toContain("Apakah perlu cloud computing");
  });

  it("should generate WhatsApp reminder summary cleanly", () => {
    const telemetri = useTelemetri();
    telemetri.selectedPertemuanNum.value = 8;
    telemetri.courses.value = [
      { kode_course: "20261-03SIFE003-22SIF0142", coursename: "Arsitektur dan Infrastruktur IT" },
    ];
    telemetri.selectedCourseKode.value = "20261-03SIFE003-22SIF0142";

    telemetri.courseDetail.value = {
      peserta: [
        { nim: "111", nama_mahasiswa: "Mahasiswa A" },
        { nim: "222", nama_mahasiswa: "Mahasiswa B" },
      ],
    };

    telemetri.topicReplies.value = [
      { id: "r1", nim: "111", _topicJudul: "Soal" }, // only 1x
    ];

    const waText = telemetri.formatWhatsAppSummary();
    expect(waText).toContain("TELEMETRI — TELESKOP MENTARI");
    expect(waText).toContain("Arsitektur dan Infrastruktur IT");
    expect(waText).toContain("Pertemuan 8");
    expect(waText).toContain("Mahasiswa A");
    expect(waText).toContain("Mahasiswa B");
    expect(waText).toContain("Kurang 1x Reply Lagi");
    expect(waText).toContain("Belum Reply Sama Sekali");
  });

  it("should sort courses into E-1 followed by E-2 in designated sequence", () => {
    const telemetri = useTelemetri();
    const rawCourses = [
      { id_mata_kuliah: "22ILK0042", coursename: "[2] ALJABAR LINIER DAN MATRIKS # 03SIFE003 (Sabtu) [E-2]" },
      { id_mata_kuliah: "22SIF0092", coursename: "[2] PENGANTAR EKONOMI, MANAJEMEN & BISNIS # 03SIFE003 (Sabtu) [E-2]" },
      { id_mata_kuliah: "22SIF0103", coursename: "[3] PEMROGRAMAN BERORIENTASI OBYEK (JAVA I) # 03SIFE003 (Sabtu) [E-1]" },
      { id_mata_kuliah: "22SIF0112", coursename: "[2] ANALISA PROSES BISNIS # 03SIFE003 (Sabtu) [E-1]" },
      { id_mata_kuliah: "22SIF0123", coursename: "[3] DESIGN GRAFIS # 03SIFE003 (Sabtu) [E-1]" },
      { id_mata_kuliah: "22SIF0132", coursename: "[2] REKAYASA WEB # 03SIFE003 (Sabtu) [E-1]" },
      { id_mata_kuliah: "22SIF0142", coursename: "[2] ARSITEKTUR DAN INFRASTRUKTUR IT # 03SIFE003 (Sabtu) [E-2]" },
      { id_mata_kuliah: "22SIF0152", coursename: "[2] PENGANTAR BIG DATA # 03SIFE003 (Sabtu) [E-2]" },
    ];

    const sorted = telemetri.sortCourses(rawCourses);
    expect(sorted.map((c) => c.id_mata_kuliah)).toEqual([
      "22SIF0103", // Java (E-1)
      "22SIF0132", // Rekayasa Web (E-1)
      "22SIF0123", // Design Grafis (E-1)
      "22SIF0112", // Analisa Proses Bisnis (E-1)
      "22SIF0142", // AIIT (E-2)
      "22SIF0152", // Big Data (E-2)
      "22ILK0042", // Aljabar (E-2)
      "22SIF0092", // PEMB (E-2)
    ]);
  });
});

