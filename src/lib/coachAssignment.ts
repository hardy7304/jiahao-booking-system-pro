export interface CoachAssignmentCoach {
  id: string;
  display_order: number;
  available_today: boolean;
}

export interface CoachAssignmentBooking {
  coach_id: string | null;
  start_hour: number;
  duration: number;
}

function hasConflict(
  startHour: number,
  durationMin: number,
  bufferMinutes: number,
  existing: Array<{ start_hour: number; duration: number }>,
) {
  const newEnd = startHour + durationMin / 60;
  return existing.some((b) => {
    const bEnd = b.start_hour + (b.duration + bufferMinutes) / 60;
    return startHour < bEnd && newEnd > b.start_hour;
  });
}

export function assignCoachForBooking(params: {
  start_hour: number;
  duration: number;
  buffer_minutes: number;
  coaches: CoachAssignmentCoach[];
  bookings: CoachAssignmentBooking[];
}): { assignedCoachId: string | null; reason: "main" | "backup" | "full" | "no_coach" } {
  const { start_hour, duration, buffer_minutes, coaches, bookings } = params;
  if (coaches.length === 0) return { assignedCoachId: null, reason: "no_coach" };

  const sorted = [...coaches].sort((a, b) => a.display_order - b.display_order);
  const main = sorted[0];
  const mainBookings = bookings
    .filter((b) => b.coach_id === main.id || b.coach_id == null)
    .map((b) => ({ start_hour: b.start_hour, duration: b.duration }));

  if (!hasConflict(start_hour, duration, buffer_minutes, mainBookings)) {
    return { assignedCoachId: main.id, reason: "main" };
  }

  const candidates = sorted
    .filter((c) => c.id !== main.id && c.available_today)
    .map((coach) => {
      const coachBookings = bookings
        .filter((b) => b.coach_id === coach.id)
        .map((b) => ({ start_hour: b.start_hour, duration: b.duration }));
      return {
        coach,
        canTake: !hasConflict(start_hour, duration, buffer_minutes, coachBookings),
        dailyLoad: coachBookings.length,
      };
    })
    .filter((x) => x.canTake)
    .sort((a, b) => a.dailyLoad - b.dailyLoad);

  if (candidates.length === 0) return { assignedCoachId: null, reason: "full" };
  return { assignedCoachId: candidates[0].coach.id, reason: "backup" };
}
