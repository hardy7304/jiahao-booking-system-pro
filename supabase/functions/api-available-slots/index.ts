import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function formatHourToTime(hour: number): string {
  const displayHour = hour >= 24 ? hour - 24 : hour;
  const h = Math.floor(displayHour);
  const m = (displayHour % 1) * 60;
  return `${h.toString().padStart(2, '0')}:${m === 0 ? '00' : '30'}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
  }

  try {
    const url = new URL(req.url);
    const dateStr = url.searchParams.get("date");
    const totalDuration = parseInt(url.searchParams.get("duration") || "0");

    if (!dateStr || !totalDuration) {
      return new Response(JSON.stringify({ error: "Missing date or duration" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch config
    const { data: configData } = await supabase
      .from("system_config")
      .select("key, value")
      .in("key", ["buffer_minutes", "pre_block_minutes"]);

    let bufferMinutes = 10;
    let preBlockMinutes = 60;
    configData?.forEach((row: any) => {
      if (row.key === "buffer_minutes") bufferMinutes = parseInt(row.value) || 10;
      if (row.key === "pre_block_minutes") preBlockMinutes = parseInt(row.value) || 60;
    });

    const { data: bookings } = await supabase
      .from("bookings")
      .select("start_hour, duration, cancelled_at")
      .eq("date", dateStr)
      .is("cancelled_at", null);

    const { data: holidays } = await supabase
      .from("holidays")
      .select("date, type, start_hour, end_hour")
      .eq("date", dateStr);

    if (holidays?.some((h: any) => h.type === "整天公休")) {
      return new Response(JSON.stringify({ slots: [], formatted: [] }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    // 營業日區間固定為 14:00~26:00，前一天資料不應影響當天 14:00 後時段
    const allBookings = bookings || [];
    const blockMinutes = totalDuration + bufferMinutes;
    const blockHours = blockMinutes / 60;
    const preBlockHours = preBlockMinutes / 60;

    const slots: number[] = [];
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    for (let hour = 14; hour < 26; hour += 0.5) {
      const endHour = hour + blockHours;
      if (endHour > 26) continue;

      if (dateStr === today) {
        const currentHour = now.getHours() + now.getMinutes() / 60;
        if (hour <= currentHour + 0.5) continue;
      }

      const holidayConflict = holidays?.some((h: any) => {
        if (h.type === "部分時段公休" && h.start_hour != null && h.end_hour != null) {
          return hour < h.end_hour && endHour > h.start_hour;
        }
        return false;
      });
      if (holidayConflict) continue;

      const bookingConflict = allBookings.some((b: any) => {
        const bEnd = b.start_hour + (b.duration + bufferMinutes) / 60;
        return hour < bEnd && endHour > b.start_hour;
      });
      if (bookingConflict) continue;

      // Pre-block rule: for services > 60min, don't allow if existing booking
      // starts within pre_block_minutes after this slot
      if (totalDuration > 60) {
        const preConflict = allBookings.some((b: any) => {
          return b.start_hour > hour && b.start_hour < hour + preBlockHours;
        });
        if (preConflict) continue;
      }

      slots.push(hour);
    }

    return new Response(
      JSON.stringify({ slots, formatted: slots.map((s) => ({ hour: s, time: formatHourToTime(s) })) }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
});
