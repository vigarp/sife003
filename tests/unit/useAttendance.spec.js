import { describe, it, expect, beforeEach } from "vitest";
import { useAttendance } from "@/composables/useAttendance";

describe("useAttendance.js composable", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should create and save a new session in localStorage", () => {
    const attendance = useAttendance();
    const session = attendance.getOrCreateSession("c-test", "2026-09-27", 5);

    expect(session.id).toBe("c-test_2026-09-27");
    expect(session.meetingNo).toBe(5);
    expect(attendance.pendingCount.value).toBe(1);
  });

  it("should update student status and persist record", () => {
    const attendance = useAttendance();
    const session = attendance.getOrCreateSession("c-test", "2026-09-27", 5);

    attendance.updateSessionRecord(session.id, "s-1", "permit");
    expect(attendance.sessions.value[0].records["s-1"]).toBe("permit");

    attendance.updateSessionRecord(session.id, "s-1", "absent");
    expect(attendance.sessions.value[0].records["s-1"]).toBe("absent");
  });

  it("should mark all students present", () => {
    const attendance = useAttendance();
    const session = attendance.getOrCreateSession("c-test", "2026-09-27", 5);
    const mockStudents = [{ id: "s-1" }, { id: "s-2" }, { id: "s-3" }];

    attendance.markAllPresentForSession(session.id, mockStudents);
    expect(attendance.sessions.value[0].records["s-1"]).toBe("present");
    expect(attendance.sessions.value[0].records["s-2"]).toBe("present");
    expect(attendance.sessions.value[0].records["s-3"]).toBe("present");
  });

  it("should filter regular vs guest students for a course", () => {
    const attendance = useAttendance();
    attendance.students.value = [
      { id: "s-reg", name: "Regular Student", isGuest: false },
      { id: "s-guest-1", name: "Guest In Course", isGuest: true, courseIds: ["c-1"] },
      { id: "s-guest-2", name: "Guest Other Course", isGuest: true, courseIds: ["c-2"] },
    ];

    const course1Students = attendance.getStudentsForCourse("c-1");
    expect(course1Students.length).toBe(2);
    expect(course1Students.map((s) => s.id)).toEqual(["s-reg", "s-guest-1"]);

    const course2Students = attendance.getStudentsForCourse("c-2");
    expect(course2Students.length).toBe(2);
    expect(course2Students.map((s) => s.id)).toEqual(["s-reg", "s-guest-2"]);
  });
});
