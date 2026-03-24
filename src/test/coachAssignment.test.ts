import { describe, expect, it } from "vitest";
import { assignCoachForBooking } from "@/lib/coachAssignment";

describe("assignCoachForBooking", () => {
  const coaches = [
    { id: "main", display_order: 1, available_today: false },
    { id: "backup-a", display_order: 2, available_today: true },
    { id: "backup-b", display_order: 3, available_today: true },
  ];

  it("主師傅可接時優先分配主師傅", () => {
    const result = assignCoachForBooking({
      start_hour: 16,
      duration: 60,
      buffer_minutes: 10,
      coaches,
      bookings: [],
    });
    expect(result).toEqual({ assignedCoachId: "main", reason: "main" });
  });

  it("主師傅不可接時分配今日可接的搭配師傅", () => {
    const result = assignCoachForBooking({
      start_hour: 16,
      duration: 60,
      buffer_minutes: 10,
      coaches,
      bookings: [{ coach_id: "main", start_hour: 15.5, duration: 90 }],
    });
    expect(result.assignedCoachId).toBe("backup-a");
    expect(result.reason).toBe("backup");
  });

  it("主師傅不可接且無可搭配師傅時回傳滿檔", () => {
    const result = assignCoachForBooking({
      start_hour: 16,
      duration: 60,
      buffer_minutes: 10,
      coaches,
      bookings: [
        { coach_id: "main", start_hour: 15.5, duration: 90 },
        { coach_id: "backup-a", start_hour: 15.5, duration: 90 },
        { coach_id: "backup-b", start_hour: 15.5, duration: 90 },
      ],
    });
    expect(result).toEqual({ assignedCoachId: null, reason: "full" });
  });
});
