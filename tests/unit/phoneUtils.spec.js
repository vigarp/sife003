import { describe, it, expect } from "vitest";
import {
  normalizeWhatsAppNumber,
  formatPhoneDisplay,
  getWhatsAppLink,
} from "@/utils/phoneUtils";

describe("phoneUtils.js", () => {
  describe("normalizeWhatsAppNumber", () => {
    it("should handle 08xx format", () => {
      expect(normalizeWhatsAppNumber("081234567890")).toBe("6281234567890");
      expect(normalizeWhatsAppNumber("0812-3456-7890")).toBe("6281234567890");
      expect(normalizeWhatsAppNumber("0812 3456 7890")).toBe("6281234567890");
    });

    it("should handle +628xx format", () => {
      expect(normalizeWhatsAppNumber("+6281234567890")).toBe("6281234567890");
      expect(normalizeWhatsAppNumber("+62 818-123-456")).toBe("62818123456");
      expect(normalizeWhatsAppNumber("+62 812 3456 7890")).toBe("6281234567890");
    });

    it("should handle 628xx and 8xx format", () => {
      expect(normalizeWhatsAppNumber("6281234567890")).toBe("6281234567890");
      expect(normalizeWhatsAppNumber("81234567890")).toBe("6281234567890");
      expect(normalizeWhatsAppNumber("818-999-000")).toBe("62818999000");
    });

    it("should return null for invalid or empty inputs", () => {
      expect(normalizeWhatsAppNumber("")).toBeNull();
      expect(normalizeWhatsAppNumber(null)).toBeNull();
      expect(normalizeWhatsAppNumber(undefined)).toBeNull();
      expect(normalizeWhatsAppNumber("abc")).toBeNull();
      expect(normalizeWhatsAppNumber("123")).toBeNull(); // too short
    });
  });

  describe("formatPhoneDisplay", () => {
    it("should format normalized number into 08xx-xxxx-xxxx", () => {
      expect(formatPhoneDisplay("6281234567890")).toBe("0812-3456-7890");
      expect(formatPhoneDisplay("081234567890")).toBe("0812-3456-7890");
      expect(formatPhoneDisplay("+62 812-3456-7890")).toBe("0812-3456-7890");
    });

    it("should return '-' for empty input", () => {
      expect(formatPhoneDisplay("")).toBe("-");
      expect(formatPhoneDisplay(null)).toBe("-");
    });
  });

  describe("getWhatsAppLink", () => {
    it("should generate valid https://wa.me/ URL", () => {
      expect(getWhatsAppLink("081234567890")).toBe("https://wa.me/6281234567890");
      expect(getWhatsAppLink("+62 818-999-000")).toBe("https://wa.me/62818999000");
    });

    it("should include encoded message when provided", () => {
      const link = getWhatsAppLink("081234567890", "Halo Mahasiswa");
      expect(link).toBe("https://wa.me/6281234567890?text=Halo%20Mahasiswa");
    });

    it("should return null for invalid number", () => {
      expect(getWhatsAppLink("")).toBeNull();
      expect(getWhatsAppLink(null)).toBeNull();
    });
  });
});
