import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatMentariShareText,
  formatAgendaShareText,
  copyToClipboard,
} from "@/utils/scheduleShare";
import scheduleData from "@/data/schedule.json";

describe("scheduleShare.js", () => {
  describe("formatMentariShareText", () => {
    it("should return fallback message if pekan or daring is empty", () => {
      expect(formatMentariShareText(null)).toBe(
        "Tidak ada jadwal Mentari online untuk pekan ini."
      );
      expect(formatMentariShareText({ daring: [] })).toBe(
        "Tidak ada jadwal Mentari online untuk pekan ini."
      );
    });

    it("should format Pekan VI with Tambahan Online 3 SKS correctly", () => {
      // Pekan VI is index 5
      const pekanVI = scheduleData.jadwal_per_pekan[5];
      const result = formatMentariShareText(pekanVI, 5);

      expect(result).toContain("🌞 MENTARI (5 – 10 Oktober 2026)");
      expect(result).toContain("• Kelompok 1 (Tambahan Online 3 SKS):");
      expect(result).toContain("  - Pemrograman Berorientasi Obyek (Java I) — Pertemuan 9");
      expect(result).toContain("  - Design Grafis — Pertemuan 9");
      expect(result).toContain("• Kelompok 2:");
      expect(result).toContain("  - Arsitektur dan Infrastruktur IT (2 SKS) — Pertemuan 6");
      expect(result).toContain("  - Pengantar Big Data (2 SKS) — Pertemuan 6");
      expect(result).toContain("  - Aljabar Linier dan Matriks (2 SKS) — Pertemuan 6");
      expect(result).toContain("  - Komunikasi Data (2 SKS) — Pertemuan 6");
      expect(result).toContain("  - Pengantar Ekonomi, Manajemen & Bisnis (2 SKS) — Pertemuan 6");
      expect(result).toContain("Cek jadwal, tugas dan kalender 👉 https://sife003.vercel.app");
    });

    it("should format Pekan V without Tambahan Online 3 SKS correctly", () => {
      // Pekan V is index 4
      const pekanV = scheduleData.jadwal_per_pekan[4];
      const result = formatMentariShareText(pekanV, 4);

      expect(result).toContain("🌞 MENTARI (28 September – 3 Oktober 2026)");
      expect(result).not.toContain("Kelompok 1");
      expect(result).toContain("• Kelompok 2:");
      expect(result).toContain("  - Arsitektur dan Infrastruktur IT — Pertemuan 5");
      expect(result).not.toContain("(2 SKS)");
      expect(result).toContain("Cek jadwal, tugas dan kalender 👉 https://sife003.vercel.app");
    });

    it("should format other items if course is not in master list or is exam", () => {
      const customPekan = {
        tanggal_daring: "1 – 5 Januari 2027",
        daring: [
          { mata_kuliah: "Ujian Akhir Semester", pertemuan: [] },
        ],
      };
      const result = formatMentariShareText(customPekan, 7);
      expect(result).toContain("• Ujian / Agenda Lain:");
      expect(result).toContain("  - Ujian Akhir Semester — Ujian Mentari");
    });
  });

  describe("formatAgendaShareText", () => {
    it("should return fallback when agenda list is empty", () => {
      expect(formatAgendaShareText([])).toBe(
        "Tidak ada agenda tugas untuk pekan ini."
      );
      expect(formatAgendaShareText(null)).toBe(
        "Tidak ada agenda tugas untuk pekan ini."
      );
    });

    it("should format agenda assignments with and without description", () => {
      const mockAgendas = [
        {
          mata_kuliah: "Pemrograman Berorientasi Obyek (Java I)",
          judul: "Tugas Pertemuan 4",
          keterangan:
            "Lanjutan pengumpulan tugas sabtu kemarin bagi yg belum maju/mengumpulkan.",
        },
        {
          mata_kuliah: "Rekayasa Web",
          judul: "Tugas Pertemuan 4",
          keterangan: "Push Pertemuan 4 ke github.",
        },
        {
          mata_kuliah: "Design Grafis",
          judul: "Tugas Pertemuan 5",
          keterangan: "",
        },
      ];

      const result = formatAgendaShareText(mockAgendas);
      const expected =
`Tugas-Tugas:
*Pemrograman Berorientasi Obyek (Java I)*
Tugas Pertemuan 4
Lanjutan pengumpulan tugas sabtu kemarin bagi yg belum maju/mengumpulkan.

*Rekayasa Web*
Tugas Pertemuan 4
Push Pertemuan 4 ke github.

*Design Grafis*
Tugas Pertemuan 5`;

      expect(result).toBe(expected);
    });
  });

  describe("copyToClipboard", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should return false if text is empty", async () => {
      const ok = await copyToClipboard("");
      expect(ok).toBe(false);
    });

    it("should use navigator.clipboard.writeText when available", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      const ok = await copyToClipboard("Hello World");
      expect(ok).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith("Hello World");
    });

    it("should fallback to execCommand when navigator.clipboard fails", async () => {
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error("Denied")),
        },
        writable: true,
        configurable: true,
      });

      const execMock = vi.fn().mockReturnValue(true);
      document.execCommand = execMock;

      const ok = await copyToClipboard("Fallback text");
      expect(ok).toBe(true);
      expect(execMock).toHaveBeenCalledWith("copy");
    });
  });
});
