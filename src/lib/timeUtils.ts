import { supabase } from "@/integrations/supabase/client";
import { BUFFER_MINUTES, formatHourToTime } from "./services";

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

export async function getAvailableSlots(dateStr: string, totalDuration: number): Promise<number[]> {
  // Fetch active bookings for this date (exclude cancelled)
  const { data: bookings } = await supabase
    .from('bookings')
    .select('start_hour, duration, cancelled_at')
    .eq('date', dateStr)
    .is('cancelled_at', null);

  // Also check previous day bookings that might cross midnight
  const prevDate = new Date(dateStr);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = prevDate.toISOString().split('T')[0];
  
  const { data: prevBookings } = await supabase
    .from('bookings')
    .select('start_hour, duration, cancelled_at')
    .eq('date', prevDateStr)
    .is('cancelled_at', null);

  // Fetch holidays
  const { data: holidays } = await supabase
    .from('holidays')
    .select('date, type, start_hour, end_hour')
    .eq('date', dateStr);

  const allBookings = [...(bookings || []), ...(prevBookings || []).map(b => ({
    ...b,
    start_hour: b.start_hour // prev day bookings with hours >= 24 affect this day's 0-2am
  }))];

  // Check if full day holiday
  if (holidays?.some(h => h.type === '整天公休')) {
    return [];
  }

  const blockMinutes = totalDuration + BUFFER_MINUTES;
  const blockHours = blockMinutes / 60;

  const slots: number[] = [];
  const now = new Date();
  const today = new Date().toISOString().split('T')[0];

  for (let hour = 14; hour < 26; hour += 0.5) {
    const endHour = hour + blockHours;

    // Can't go past 26:00 (2am next day)
    if (endHour > 26) continue;

    // Skip past times for today
    if (dateStr === today) {
      const currentHour = now.getHours() + now.getMinutes() / 60;
      // For hours >= 24, they represent next day's 0-2am
      const compareHour = hour >= 24 ? hour : hour;
      if (compareHour <= currentHour + 0.5) continue;
    }

    // Check holiday conflicts
    const holidayConflict = holidays?.some(h => {
      if (h.type === '部分時段公休' && h.start_hour != null && h.end_hour != null) {
        return hour < h.end_hour && endHour > h.start_hour;
      }
      return false;
    });
    if (holidayConflict) continue;

    // Check booking conflicts
    const bookingConflict = allBookings.some(b => {
      const bEnd = b.start_hour + (b.duration + BUFFER_MINUTES) / 60;
      return hour < bEnd && endHour > b.start_hour;
    });
    if (bookingConflict) continue;

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
  calendarNotes?: string;
  storeName?: string;
  therapistName?: string;
  storeLocation?: string;
}): string {
  const { date, start_hour, duration, service, name, phone, addons, total_price, calendarNotes, storeName = '不老松足湯安平店', therapistName = '嘉豪師傅', storeLocation = '不老松足湯安平店' } = booking;
  
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
  detailLines.push(`👨‍🔧 師傅：${therapistName}`);
  detailLines.push(`📍 地點：${storeLocation}`);
  detailLines.push(`══════════════════`);
  if (calendarNotes && calendarNotes.trim()) {
    detailLines.push(``);
    detailLines.push(`⚠️ 注意事項：`);
    calendarNotes.split('\n').forEach(line => detailLines.push(line));
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${storeName} - ${service}`,
    dates: `${fmt(startDate)}/${fmt(endDate)}`,
    details: detailLines.join('\n'),
    location: storeLocation,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
