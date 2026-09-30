import { describe, it, expect } from "vitest";
import { parseUtcDate, getLatestTimestamp, formatRelativeTime } from "@/utils/timeAgo";

describe("timeAgo utility", () => {
  const fixedNow = new Date("2026-09-30T20:30:00Z").getTime();

  describe("parseUtcDate", () => {
    it("should parse SQLite space-separated UTC datetime", () => {
      const parsed = parseUtcDate("2026-09-30 20:25:00");
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.toISOString()).toBe("2026-09-30T20:25:00.000Z");
    });

    it("should parse standard ISO UTC datetime", () => {
      const parsed = parseUtcDate("2026-09-30T20:25:00Z");
      expect(parsed.toISOString()).toBe("2026-09-30T20:25:00.000Z");
    });

    it("should return null for null or invalid inputs", () => {
      expect(parseUtcDate(null)).toBeNull();
      expect(parseUtcDate("")).toBeNull();
    });
  });

  describe("getLatestTimestamp", () => {
    it("should find the most recent timestamp among items", () => {
      const items = [
        { id: 1, created_at: "2026-09-28 10:00:00", updated_at: "2026-09-28 12:00:00" },
        { id: 2, created_at: "2026-09-30 19:00:00", updated_at: "2026-09-30 20:15:00" },
        { id: 3, created_at: "2026-09-29 08:00:00", updated_at: "2026-09-29 09:00:00" },
      ];

      const latest = getLatestTimestamp(items);
      expect(latest).toBeInstanceOf(Date);
      expect(latest.toISOString()).toBe("2026-09-30T20:15:00.000Z");
    });

    it("should fallback to created_at if updated_at is null or not set", () => {
      const items = [
        { id: 1, created_at: "2026-09-30 18:00:00" },
        { id: 2, created_at: "2026-09-30 19:30:00" },
      ];

      const latest = getLatestTimestamp(items);
      expect(latest.toISOString()).toBe("2026-09-30T19:30:00.000Z");
    });

    it("should return null for empty or non-array inputs", () => {
      expect(getLatestTimestamp([])).toBeNull();
      expect(getLatestTimestamp(null)).toBeNull();
    });
  });

  describe("formatRelativeTime", () => {
    it("should return 'just now' when elapsed time is < 60 seconds", () => {
      const tenSecondsAgo = new Date(fixedNow - 10 * 1000);
      expect(formatRelativeTime(tenSecondsAgo, fixedNow)).toBe("just now");

      const fiftyNineSecondsAgo = new Date(fixedNow - 59 * 1000);
      expect(formatRelativeTime(fiftyNineSecondsAgo, fixedNow)).toBe("just now");
    });

    it("should return 'x minutes ago' when elapsed time is < 1 hour", () => {
      const oneMinuteAgo = new Date(fixedNow - 65 * 1000);
      expect(formatRelativeTime(oneMinuteAgo, fixedNow)).toBe("1 minute ago");

      const fifteenMinutesAgo = new Date(fixedNow - 15 * 60 * 1000);
      expect(formatRelativeTime(fifteenMinutesAgo, fixedNow)).toBe("15 minutes ago");
    });

    it("should return 'x hours ago' when elapsed time is < 24 hours", () => {
      const oneHourAgo = new Date(fixedNow - 3650 * 1000);
      expect(formatRelativeTime(oneHourAgo, fixedNow)).toBe("1 hour ago");

      const fiveHoursAgo = new Date(fixedNow - 5 * 3600 * 1000);
      expect(formatRelativeTime(fiveHoursAgo, fixedNow)).toBe("5 hours ago");
    });

    it("should return 'yesterday' when elapsed time is between 24 and 48 hours", () => {
      const twentyFiveHoursAgo = new Date(fixedNow - 25 * 3600 * 1000);
      expect(formatRelativeTime(twentyFiveHoursAgo, fixedNow)).toBe("yesterday");

      const fortySevenHoursAgo = new Date(fixedNow - 47 * 3600 * 1000);
      expect(formatRelativeTime(fortySevenHoursAgo, fixedNow)).toBe("yesterday");
    });

    it("should return 'x days ago' when elapsed time is between 2 and 7 days", () => {
      const twoDaysAgo = new Date(fixedNow - 2 * 24 * 3600 * 1000);
      expect(formatRelativeTime(twoDaysAgo, fixedNow)).toBe("2 days ago");

      const fiveDaysAgo = new Date(fixedNow - 5 * 24 * 3600 * 1000);
      expect(formatRelativeTime(fiveDaysAgo, fixedNow)).toBe("5 days ago");

      const sevenDaysAgo = new Date(fixedNow - 7 * 24 * 3600 * 1000);
      expect(formatRelativeTime(sevenDaysAgo, fixedNow)).toBe("7 days ago");
    });

    it("should return date and time when elapsed time is > 7 days", () => {
      // 10 days before 2026-09-30 20:30 UTC
      const tenDaysAgo = new Date(fixedNow - 10 * 24 * 3600 * 1000);
      const formatted = formatRelativeTime(tenDaysAgo, fixedNow);
      expect(formatted).toMatch(/\d{1,2}\s+[A-Za-z]{3}\s+\d{4},\s+\d{2}:\d{2}/);
    });

    it("should handle null or invalid date gracefully", () => {
      expect(formatRelativeTime(null)).toBeNull();
      expect(formatRelativeTime("invalid-date")).toBeNull();
    });
  });
});
