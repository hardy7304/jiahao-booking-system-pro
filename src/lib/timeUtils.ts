import { supabase } from "@/integrations/supabase/client";
import { formatHourToTime } from "./services";

interface Booking {
  date: string;
  start_hour: number;
  duration: number;
}

interface Holiday {
  date: string;
  type: string;
  start_hour: number | null;
  end_hour: number | null;
}

async function getBookingConfig(): Promise<{ buffer_minutes: number; free_addon_duration: number; pre_block_minutes: number }> {
  const { data } = await supabase
    .from("system_config")
    .select("key, value")
    .in("key", ["buffer_minutes", "free_addon_duration", "pre_block_minutes"]);
  const config = { buffer_minutes: 10, free_addon_duration: 10, pre_block_minutes: 60 };
  data?.forEach((row) => {
    if (row.key in config) {
      (config as any)[row.key] = parseInt(row.value) || (config as any)[row.key];
    }
  });
  return config;
}

export async function getAvailableSlots(
  dateStr: string,
  totalDuration: number,
  storeId?: string,
  needsPair = false,
  preferredBackupCoachId?: string,
  /** 與 CMS 調理師標題 / coaches.name 一致，用於辨識主師傅（服務管理皆為搭班池） */
  mainCoachName?: string,
): Promise<number[]> {
  const config = await getBookingConfig();

  let bookingsQuery = supabase
    .from('bookings')
    .select('start_hour, duration, cancelled_at, coach_id')
    .eq('date', dateStr)
    .is('cancelled_at', null);
  if (storeId) bookingsQuery = bookingsQuery.eq('store_id', storeId);
  const { data: bookings } = await bookingsQuery;

  const allBookings = bookings || [];
  let coaches: Array<{ id: string; name: string; display_order: number; available_today: boolean; is_active: boolean }> = [];
  if (needsPair) {
    let coachQuery = supabase
      .from("coaches")
      .select("id,name,display_order,available_today,shift_start_hour,shift_end_hour,is_active")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (storeId) coachQuery = coachQuery.eq("store_id", storeId);
    const { data: coachRows, error: coachErr } = await coachQuery;
    if (coachErr?.message?.includes("shift_start_hour")) {
      let fallbackQuery = supabase
        .from("coaches")
        .select("id,name,display_order,available_today,is_active")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (storeId) fallbackQuery = fallbackQuery.eq("store_id", storeId);
      const { data: fallbackRows } = await fallbackQuery;
      coaches = ((fallbackRows || []) as Array<{
        id: string;
        name: string;
        display_order: number;
        available_today: boolean;
        is_active: boolean;
      }>).map((c) => ({ ...c, shift_start_hour: 14, shift_end_hour: 26 }));
    } else {
      coaches = (coachRows || []) as Array<{
      id: string;
      name: string;
      display_order: number;
      available_today: boolean;
      shift_start_hour?: number;
      shift_end_hour?: number;
      is_active: boolean;
      }>;
    }
  }

  let holidaysQuery = supabase
    .from('holidays')
    .select('date, type, start_hour, end_hour')
    .eq('date', dateStr);
  if (storeId) holidaysQuery = holidaysQuery.eq('store_id', storeId);
  const { data: holidays } = await holidaysQuery;

  // Check if full day holiday
  if (holidays?.some(h => h.type === '整天公休')) {
    return [];
  }

  const blockMinutes = totalDuration + config.buffer_minutes;
  const blockHours = blockMinutes / 60;
  const preBlockHours = config.pre_block_minutes / 60;

  const slots: number[] = [];
  const now = new Date();
  // Use local date for "today" comparison (avoid timezone bugs near midnight)
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  for (let hour = 14; hour < 26; hour += 0.5) {
    const endHour = hour + blockHours;

    // Can't go past 26:00 (2am next day)
    if (endHour > 26) continue;

    // Skip past times for today
    if (dateStr === today) {
      const currentHour = now.getHours() + now.getMinutes() / 60;
      if (hour <= currentHour + 0.5) continue;
    }

    // Check holiday conflicts
    const holidayConflict = holidays?.some(h => {
      if (h.type === '部分時段公休' && h.start_hour != null && h.end_hour != null) {
        return hour < h.end_hour && endHour > h.start_hour;
      }
      return false;
    });
    if (holidayConflict) continue;

    if (!needsPair) {
      // 單人：沿用既有衝突邏輯
      const bookingConflict = allBookings.some((b: any) => {
        const bEnd = b.start_hour + (b.duration + config.buffer_minutes) / 60;
        return hour < bEnd && endHour > b.start_hour;
      });
      if (bookingConflict) continue;
    } else {
      const sorted = [...coaches].sort((a, b) => a.display_order - b.display_order);
      if (sorted.length === 0) continue;
      const trimmedMain = mainCoachName?.trim();
      const mainCoach = trimmedMain
        ? sorted.find((c) => c.name.trim() === trimmedMain) || sorted[0]
        : sorted[0];
      const overlap = (rows: Array<{ start_hour: number; duration: number }>) =>
        rows.some((b) => {
          const bEnd = b.start_hour + (b.duration + config.buffer_minutes) / 60;
          return hour < bEnd && endHour > b.start_hour;
        });

      const mainBookings = allBookings
        .filter((b: any) => b.coach_id === mainCoach.id || b.coach_id == null)
        .map((b: any) => ({ start_hour: b.start_hour, duration: b.duration }));
      if (overlap(mainBookings)) continue;

      const backups = sorted.filter(
        (c) =>
          c.id !== mainCoach.id &&
          c.available_today &&
          hour >= (c.shift_start_hour ?? 14) &&
          endHour <= (c.shift_end_hour ?? 26),
      );
      const candidateBackups = preferredBackupCoachId
        ? backups.filter((c) => c.id === preferredBackupCoachId)
        : backups;
      const backupAvailable = candidateBackups.some((backup) => {
        const rows = allBookings
          .filter((b: any) => b.coach_id === backup.id)
          .map((b: any) => ({ start_hour: b.start_hour, duration: b.duration }));
        return !overlap(rows);
      });
      if (!backupAvailable) continue;
    }

    // Pre-block rule: for long services (>60min), ensure no booking starts within
    // pre_block_minutes after our slot ends (need buffer between appointments)
    if (totalDuration > 60) {
      const slotEnd = hour + blockHours;
      const preConflict = allBookings.some(b => {
        return b.start_hour >= slotEnd && b.start_hour < slotEnd + preBlockHours;
      });
      if (preConflict) continue;
    }

    slots.push(hour);
  }

  return slots;
}

export function generateGoogleCalendarLink(booking: {
  date: string;
  start_hour: number;
  duration: number;
  service: string;
  name: string;
  phone?: string;
  addons?: string[];
  total_price?: number;
  needs_pair?: boolean;
  primaryCoachName?: string;
  secondaryCoachName?: string;
  calendarNotes?: string;
  storeName?: string;
  therapistName?: string;
  storeLocation?: string;
}): string {
  const {
    date,
    start_hour,
    duration,
    service,
    name,
    phone,
    addons,
    total_price,
    needs_pair,
    primaryCoachName,
    secondaryCoachName,
    calendarNotes,
    storeName = '不老松足湯安平店',
    therapistName = '嘉豪師傅',
    storeLocation = '不老松足湯安平店',
  } = booking;
  
  const startDate = new Date(date);
  const displayHour = start_hour >= 24 ? start_hour - 24 : start_hour;
  startDate.setHours(Math.floor(displayHour), (displayHour % 1) * 60, 0);
  if (start_hour >= 24) {
    startDate.setDate(startDate.getDate() + 1);
  }
  
  const endDate = new Date(startDate.getTime() + duration * 60000);
  
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const startTimeStr = `${String(Math.floor(displayHour)).padStart(2, '0')}:${String(Math.round((displayHour % 1) * 60)).padStart(2, '0')}`;
  const endHour = displayHour + duration / 60;
  const endTimeStr = `${String(Math.floor(endHour)).padStart(2, '0')}:${String(Math.round((endHour % 1) * 60)).padStart(2, '0')}`;

  const detailLines = [
    `══════════════════`,
    `📋 預約確認單`,
    `══════════════════`,
    `📅 日期：${date}`,
    `⏰ 時段：${startTimeStr} ~ ${endTimeStr}（共 ${duration} 分鐘）`,
    `👤 預約人：${name}`,
  ];
  if (phone) detailLines.push(`📞 電話：${phone}`);
  detailLines.push(`💆 服務：${service}`);
  if (addons && addons.length > 0) {
    detailLines.push(`➕ 加購：${addons.join('、')}`);
  }
  if (total_price != null) {
    detailLines.push(`💰 金額：NT$ ${total_price.toLocaleString()}`);
  }
  if (needs_pair) {
    detailLines.push(`👥 預約型態：雙人`);
    detailLines.push(`👨‍🔧 主師傅：${primaryCoachName || therapistName}`);
    if (secondaryCoachName) detailLines.push(`🧑‍🔧 搭班師傅：${secondaryCoachName}`);
  } else {
    detailLines.push(`👨‍🔧 師傅：${primaryCoachName || therapistName}`);
  }
  detailLines.push(`📍 地點：${storeLocation}`);
  detailLines.push(`══════════════════`);
  if (calendarNotes && calendarNotes.trim()) {
    detailLines.push(``);
    detailLines.push(`⚠️ 注意事項：`);
    calendarNotes.split('\n').forEach(line => detailLines.push(line));
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${storeName} - ${needs_pair ? "[雙人] " : ""}${service}`,
    dates: `${fmt(startDate)}/${fmt(endDate)}`,
    details: detailLines.join('\n'),
    location: storeLocation,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
