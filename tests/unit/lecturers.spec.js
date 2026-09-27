import { describe, it, expect } from "vitest";
import {
  normalizeWhatsAppNumber,
  formatPhoneDisplay,
  getWhatsAppLink,
} from "@/utils/phoneUtils";

describe("Lecturers Data and WhatsApp Integration", () => {
  const mockLecturer = {
    id: "d-1",
    name: "AFIF EFENDI, S.Kom., M.Kom.",
    phone: "6281234567890",
    email: "afif@example.com",
    courses: [
      { id: "c-1", name: "REKAYASA WEB", code: "22SIF0132" },
    ],
  };

  it("should normalize lecturer WhatsApp numbers correctly", () => {
    expect(normalizeWhatsAppNumber("0812-3456-7890")).toBe("6281234567890");
    expect(normalizeWhatsAppNumber("+62 818-000-111")).toBe("62818000111");
  });

  it("should format display phone number nicely", () => {
    expect(formatPhoneDisplay(mockLecturer.phone)).toBe("0812-3456-7890");
  });

  it("should generate direct wa.me link for lecturer", () => {
    const link = getWhatsAppLink(mockLecturer.phone, "Halo Pak Dosen");
    expect(link).toBe("https://wa.me/6281234567890?text=Halo%20Pak%20Dosen");
  });

  it("should filter lecturers by search query matching name, phone, or course", () => {
    const lecturers = [
      mockLecturer,
      {
        id: "d-2",
        name: "ABDURRAHMAN HARITS, S.Kom., M.Kom.",
        phone: "628999888777",
        courses: [{ id: "c-2", name: "PEMROGRAMAN BERORIENTASI OBYEK", code: "22SIF0103" }],
      },
    ];

    const filter = (query) => {
      const q = query.trim().toLowerCase();
      const normQ = normalizeWhatsAppNumber(q);
      return lecturers.filter((l) => {
        const matchName = l.name.toLowerCase().includes(q);
        const matchPhone = l.phone && (l.phone.includes(q) || (normQ && l.phone.includes(normQ)));
        const matchCourse = Array.isArray(l.courses) && l.courses.some((c) => c.name.toLowerCase().includes(q));
        return matchName || matchPhone || matchCourse;
      });
    };

    expect(filter("afif").length).toBe(1);
    expect(filter("081234567890").length).toBe(1);
    expect(filter("rekayasa").length).toBe(1);
    expect(filter("pemrograman").length).toBe(1);
    expect(filter("none").length).toBe(0);
  });
});
