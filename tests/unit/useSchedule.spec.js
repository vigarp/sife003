import { describe, it, expect, beforeEach } from "vitest";
import { useSchedule } from "@/composables/useSchedule";

describe("useSchedule composable", () => {
  let schedule;

  beforeEach(() => {
    schedule = useSchedule();
    schedule.resetToCurrentWeek();
  });

  it("should load schedule data with 16 weeks", () => {
    expect(schedule.allWeeks).toBeDefined();
    expect(schedule.allWeeks.length).toBe(16);
  });

  it("should have activeWeekIndex within valid range", () => {
    expect(schedule.activeWeekIndex).toBeGreaterThanOrEqual(0);
    expect(schedule.activeWeekIndex).toBeLessThan(schedule.allWeeks.length);
  });

  it("should allow navigating weeks via setWeek", () => {
    schedule.setWeek(5);
    expect(schedule.viewedWeekIndex.value).toBe(5);
    expect(schedule.currentWeek.value.pekan).toBe("VI");

    // Negative index should be ignored
    schedule.setWeek(-1);
    expect(schedule.viewedWeekIndex.value).toBe(5);

    // Out of bounds index should be ignored
    schedule.setWeek(99);
    expect(schedule.viewedWeekIndex.value).toBe(5);
  });

  it("should navigate with prevWeek and nextWeek", () => {
    schedule.setWeek(2);
    schedule.nextWeek();
    expect(schedule.viewedWeekIndex.value).toBe(3);

    schedule.prevWeek();
    expect(schedule.viewedWeekIndex.value).toBe(2);

    // Test edge 0
    schedule.setWeek(0);
    schedule.prevWeek();
    expect(schedule.viewedWeekIndex.value).toBe(0);

    // Test edge max
    schedule.setWeek(schedule.allWeeks.length - 1);
    schedule.nextWeek();
    expect(schedule.viewedWeekIndex.value).toBe(schedule.allWeeks.length - 1);
  });

  it("should compute isCurrentWeek, isPastWeek, isFutureWeek correctly", () => {
    schedule.resetToCurrentWeek();
    expect(schedule.isCurrentWeek.value).toBe(true);
    expect(schedule.isPastWeek.value).toBe(false);
    expect(schedule.isFutureWeek.value).toBe(false);

    if (schedule.activeWeekIndex > 0) {
      schedule.setWeek(schedule.activeWeekIndex - 1);
      expect(schedule.isCurrentWeek.value).toBe(false);
      expect(schedule.isPastWeek.value).toBe(true);
      expect(schedule.isFutureWeek.value).toBe(false);
    }

    if (schedule.activeWeekIndex < schedule.allWeeks.length - 1) {
      schedule.setWeek(schedule.activeWeekIndex + 1);
      expect(schedule.isCurrentWeek.value).toBe(false);
      expect(schedule.isPastWeek.value).toBe(false);
      expect(schedule.isFutureWeek.value).toBe(true);
    }
  });

  it("should return correct master course by name", () => {
    const master = schedule.getMaster("Aljabar Linier dan Matriks");
    expect(master).toBeDefined();
    expect(master.kode).toBe("22ILK0042");
    expect(master.sks).toBe(2);
    expect(master.dosen).toBe("CHRISTIEN ROZALI S.Si., M.Kom.");
  });

  it("should generate valid LMS Mentari URLs", () => {
    const item = { mata_kuliah: "Aljabar Linier dan Matriks", pertemuan: [1, 2] };
    const master = schedule.getMaster("Aljabar Linier dan Matriks");

    const url = schedule.getLmsUrl(item, master);
    expect(url).toContain("mentari.unpam.ac.id/u-courses/");
    expect(url).toContain(master.kode);
    expect(url).toContain("accord_pertemuan=PERTEMUAN_1");

    // Fallback when no master
    const fallbackUrl = schedule.getLmsUrl(item, null);
    expect(fallbackUrl).toBe("https://mentari.unpam.ac.id/u-courses");
  });

  it("should generate valid MyUNPAM presensi URLs", () => {
    const master = schedule.getMaster("Aljabar Linier dan Matriks");
    const url = schedule.getPresensiUrl(master);
    expect(url).toContain("my.unpam.ac.id/presensi/pertemuan/");
    expect(url).toContain(master.kode);

    // Fallback when no master
    const fallbackUrl = schedule.getPresensiUrl(null);
    expect(fallbackUrl).toBe("https://my.unpam.ac.id/presensi");
  });

  it("should partition daring courses into k1, k2, and other", () => {
    const week0 = schedule.allWeeks[0];
    const partitioned = schedule.partitionDaring(week0, 0);

    expect(partitioned).toHaveProperty("k1");
    expect(partitioned).toHaveProperty("k2");
    expect(partitioned).toHaveProperty("other");
    expect(partitioned.k1.length + partitioned.k2.length + partitioned.other.length).toBe(
      week0.daring.length
    );
  });

  it("should partition luring courses into k1, k2, and other", () => {
    const week0 = schedule.allWeeks[0];
    const partitioned = schedule.partitionLuring(week0);

    expect(partitioned).toHaveProperty("k1");
    expect(partitioned).toHaveProperty("k2");
    expect(partitioned).toHaveProperty("other");
    expect(partitioned.k1.length + partitioned.k2.length + partitioned.other.length).toBe(
      week0.luring.length
    );
  });
});
