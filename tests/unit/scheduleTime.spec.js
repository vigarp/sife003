import { describe, it, expect } from "vitest";
import { parseTimeRange, getWibTime, isScheduleOngoing } from "@/utils/scheduleTime";

describe("scheduleTime.js", () => {
  describe("parseTimeRange", () => {
    it("should correctly parse dot-separated and colon-separated time ranges", () => {
      expect(parseTimeRange("07.40 - 09.20")).toEqual({
        startMinutes: 7 * 60 + 40, // 460
        endMinutes: 9 * 60 + 20,   // 560
      });

      expect(parseTimeRange("09.20 - 11.00")).toEqual({
        startMinutes: 9 * 60 + 20, // 560
        endMinutes: 11 * 60,       // 660
      });

      expect(parseTimeRange("11.00 - 13.50")).toEqual({
        startMinutes: 11 * 60,     // 660
        endMinutes: 13 * 60 + 50,  // 830
      });

      expect(parseTimeRange("13.50 - 15.30")).toEqual({
        startMinutes: 13 * 60 + 50, // 830
        endMinutes: 15 * 60 + 30,  // 930
      });

      expect(parseTimeRange("07:40 - 09:20")).toEqual({
        startMinutes: 460,
        endMinutes: 560,
      });
    });

    it("should return null for invalid or empty time strings", () => {
      expect(parseTimeRange("")).toBeNull();
      expect(parseTimeRange(null)).toBeNull();
      expect(parseTimeRange("invalid time")).toBeNull();
    });
  });

  describe("getWibTime", () => {
    it("should format a known Saturday UTC time into Jakarta WIB", () => {
      // 2026-10-03 01:45:00 UTC = 2026-10-03 08:45:00 WIB (Saturday)
      const date = new Date("2026-10-03T01:45:00Z");
      const wib = getWibTime(date);

      expect(wib.isSaturday).toBe(true);
      expect(wib.dayOfWeek).toBe("Sat");
      expect(wib.currentMinutes).toBe(8 * 60 + 45); // 525
      expect(wib.timeString).toBe("08:45");
    });

    it("should format a non-Saturday UTC time properly", () => {
      // 2026-10-02 05:00:00 UTC = 2026-10-02 12:00:00 WIB (Friday)
      const date = new Date("2026-10-02T05:00:00Z");
      const wib = getWibTime(date);

      expect(wib.isSaturday).toBe(false);
      expect(wib.dayOfWeek).toBe("Fri");
    });
  });

  describe("isScheduleOngoing", () => {
    // 2026-10-03 01:45:00 UTC is 08:45 WIB on Saturday
    const saturdayMorning = new Date("2026-10-03T01:45:00Z");

    it("should return true for slot 07.40 - 09.20 on Saturday morning at 08:45 WIB", () => {
      const active = isScheduleOngoing("07.40 - 09.20", {
        isLuring: true,
        isCurrentWeek: true,
        now: saturdayMorning,
      });
      expect(active).toBe(true);
    });

    it("should return false for slots that are not currently running", () => {
      const activeLater = isScheduleOngoing("09.20 - 11.00", {
        isLuring: true,
        isCurrentWeek: true,
        now: saturdayMorning,
      });
      expect(activeLater).toBe(false);
    });

    it("should return false when isLuring is false", () => {
      const active = isScheduleOngoing("07.40 - 09.20", {
        isLuring: false,
        isCurrentWeek: true,
        now: saturdayMorning,
      });
      expect(active).toBe(false);
    });

    it("should return false when isCurrentWeek is false", () => {
      const active = isScheduleOngoing("07.40 - 09.20", {
        isLuring: true,
        isCurrentWeek: false,
        now: saturdayMorning,
      });
      expect(active).toBe(false);
    });

    it("should return false on Friday even if time matches", () => {
      // 2026-10-02 01:45:00 UTC = Friday 08:45 WIB
      const fridayMorning = new Date("2026-10-02T01:45:00Z");
      const active = isScheduleOngoing("07.40 - 09.20", {
        isLuring: true,
        isCurrentWeek: true,
        now: fridayMorning,
      });
      expect(active).toBe(false);
    });
  });
});

