import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function formatHourToTime(hour: number): string {
  const displayHour = hour >= 24 ? hour - 24 : hour;
  const h = Math.floor(displayHour);
  const m = (displayHour % 1) * 60;
  return `${h.toString().padStart(2, '0')}:${m === 0 ? '00' : '30'}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // GET: List bookings for a date
    if (req.method === "GET") {
      const url = new URL(req.url);
      const dateStr = url.searchParams.get("date");
      let query = supabase.from("bookings").select("*").is("cancelled_at", null).order("date", { ascending: true }).order("start_hour", { ascending: true });
      if (dateStr) query = query.eq("date", dateStr);
      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ bookings: data }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    // POST: Create a booking
    if (req.method === "POST") {
      const body = await req.json();
      const { date, start_hour, name, phone, service, addons, duration, total_price } = body;

      if (!date || start_hour == null || !name || !phone || !service || !duration || !total_price) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      const bookingData = {
        date,
        start_hour,
        start_time_str: formatHourToTime(start_hour),
        name,
        phone,
        service,
        addons: addons || [],
        duration,
        total_price,
      };

      const { data, error } = await supabase.from("bookings").insert(bookingData).select().single();
      if (error) throw error;

      // Sync to Google Calendar (fire-and-forget, don't block booking response)
      try {
        const syncResp = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-sync`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({ action: "create", booking: data }),
          }
        );
        if (!syncResp.ok) {
          console.error("Google Calendar sync failed:", await syncResp.text());
        }
      } catch (syncErr) {
        console.error("Google Calendar sync error:", syncErr);
      }

      return new Response(JSON.stringify({ booking: data }), { status: 201, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    // DELETE: Cancel a booking (soft delete)
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing booking id" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
      const { error } = await supabase.from("bookings").update({ cancelled_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
});
