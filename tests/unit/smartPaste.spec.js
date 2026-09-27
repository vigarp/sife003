import { describe, it, expect } from "vitest";
import { parseExcelStudentText } from "@/utils/smartPaste";

describe("smartPaste.js parser", () => {
  it("should return empty array for empty input", () => {
    expect(parseExcelStudentText("")).toEqual([]);
    expect(parseExcelStudentText("   ")).toEqual([]);
  });

  it("should parse tab-separated Excel rows and skip header", () => {
    const raw = `NIM\tNAMA MAHASISWA
251011700310\tADAM BURHANUDIN LUBIS
251011700333\tAHMAD SANDI`;

    const parsed = parseExcelStudentText(raw);
    expect(parsed.length).toBe(2);
    expect(parsed[0]).toEqual({ nim: "251011700310", name: "ADAM BURHANUDIN LUBIS" });
    expect(parsed[1]).toEqual({ nim: "251011700333", name: "AHMAD SANDI" });
  });

  it("should parse comma/semicolon separated lines", () => {
    const raw = `251011700310, ADAM BURHANUDIN
251011700333; AHMAD SANDI`;

    const parsed = parseExcelStudentText(raw);
    expect(parsed.length).toBe(2);
    expect(parsed[0].nim).toBe("251011700310");
    expect(parsed[1].nim).toBe("251011700333");
  });

  it("should handle reversed column order (Name first, NIM second)", () => {
    const raw = `ADAM BURHANUDIN\t251011700310`;
    const parsed = parseExcelStudentText(raw);
    expect(parsed.length).toBe(1);
    expect(parsed[0]).toEqual({ nim: "251011700310", name: "ADAM BURHANUDIN" });
  });

  it("should deduplicate students by NIM", () => {
    const raw = `251011700310\tADAM BURHANUDIN
251011700310\tADAM BURHANUDIN DUPLICATE`;
    const parsed = parseExcelStudentText(raw);
    expect(parsed.length).toBe(1);
    expect(parsed[0].name).toBe("ADAM BURHANUDIN");
  });

  it("should parse 3-column rows containing WhatsApp numbers", () => {
    const raw = `NIM\tNAMA MAHASISWA\tNO WA
251011700310\tADAM BURHANUDIN\t0812-3456-7890
251011700333\tAHMAD SANDI\t+62 818-999-888`;

    const parsed = parseExcelStudentText(raw);
    expect(parsed.length).toBe(2);
    expect(parsed[0]).toEqual({
      nim: "251011700310",
      name: "ADAM BURHANUDIN",
      phone: "6281234567890",
    });
    expect(parsed[1]).toEqual({
      nim: "251011700333",
      name: "AHMAD SANDI",
      phone: "62818999888",
    });
  });

  it("should parse 4-column rows with index numbers and WhatsApp", () => {
    const raw = `1\t251011700310\tADAM BURHANUDIN\t081234567890`;
    const parsed = parseExcelStudentText(raw);
    expect(parsed.length).toBe(1);
    expect(parsed[0]).toEqual({
      nim: "251011700310",
      name: "ADAM BURHANUDIN",
      phone: "6281234567890",
    });
  });
});
