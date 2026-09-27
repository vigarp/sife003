import { describe, it, expect } from "vitest";
import { formatWhatsAppReport, formatIndonesianDate } from "@/utils/whatsappFormatter";

describe("whatsappFormatter.js", () => {
  const dummyCourse = {
    id: "c-1",
    name: "REKAYASA WEB",
    code: "22SIF0132",
    className: "03SIFE003",
    lecturer: "IR AGUS SUHARTO, M.KOM",
    time: "Sabtu, 09.20 - 11.00",
  };

  const dummyStudents = [
    { id: "s-1", nim: "251011700310", name: "ADAM BURHANUDIN LUBIS" },
    { id: "s-2", nim: "251011700333", name: "AHMAD SANDI" },
    { id: "s-3", nim: "251011700334", name: "ALI SOPYAN", isGuest: true },
  ];

  it("should format indonesian date properly", () => {
    const formatted = formatIndonesianDate("2026-09-26");
    expect(formatted.toLowerCase()).toContain("sabtu");
    expect(formatted.toLowerCase()).toContain("september");
  });

  it("should format absent_only mode reporting only absent/permit/sick", () => {
    const records = {
      "s-1": "present",
      "s-2": "permit",
      "s-3": "absent",
    };

    const text = formatWhatsAppReport({
      course: dummyCourse,
      date: "2026-09-26",
      meetingNo: 4,
      students: dummyStudents,
      records,
      filterMode: "absent_only",
    });

    expect(text).toContain("*LAPORAN PRESENSI KELAS*");
    expect(text).toContain("REKAYASA WEB 22SIF0132");
    expect(text).toContain("03SIFE003");
    expect(text).toContain("*DAFTAR TIDAK MASUK (2 orang):*");
    expect(text).toContain("AHMAD SANDI");
    expect(text).toContain("ALI SOPYAN *(Revisi)*");
    expect(text).not.toContain("ADAM BURHANUDIN LUBIS");
  });

  it("should display 'Nihil' when everyone is present in absent_only mode", () => {
    const records = {
      "s-1": "present",
      "s-2": "present",
      "s-3": "present",
    };

    const text = formatWhatsAppReport({
      course: dummyCourse,
      date: "2026-09-26",
      meetingNo: 4,
      students: dummyStudents,
      records,
      filterMode: "absent_only",
    });

    expect(text).toContain("Nihil (Semua mahasiswa hadir)");
  });

  it("should format full class recap in 'all' mode", () => {
    const records = {
      "s-1": "present",
      "s-2": "sick",
      "s-3": "absent",
    };

    const text = formatWhatsAppReport({
      course: dummyCourse,
      date: "2026-09-26",
      meetingNo: 4,
      students: dummyStudents,
      records,
      filterMode: "all",
    });

    expect(text).toContain("*REKAP LENGKAP PRESENSI (3 Mahasiswa):*");
    expect(text).toContain("*1. HADIR (1):*");
    expect(text).toContain("*3. SAKIT (1):*");
    expect(text).toContain("*4. ALPA / TANPA KETERANGAN (1):*");
  });
});
