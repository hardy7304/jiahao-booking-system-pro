import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Calculate tomorrow's date in Asia/Taipei timezone (UTC+8)
    const now = new Date();
    const taipeiOffset = 8 * 60 * 60 * 1000;
    const taipeiNow = new Date(now.getTime() + taipeiOffset);
    const tomorrow = new Date(taipeiNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    console.log(`Sending reminders for date: ${tomorrowStr}`);

    // Fetch tomorrow's active bookings
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("date", tomorrowStr)
      .is("cancelled_at", null)
      .neq("status", "cancelled");

    if (error) throw error;

    if (!bookings || bookings.length === 0) {
      console.log("No bookings for tomorrow");
      return new Response(
        JSON.stringify({ ok: true, date: tomorrowStr, sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const baseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let lineSent = 0;
    let emailSent = 0;
    let lineSkipped = 0;

    for (const booking of bookings) {
      // LINE reminder
      try {
        const lineRes = await fetch(`${baseUrl}/functions/v1/send-line-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            type: "booking_reminder",
            phone: booking.phone,
            booking,
          }),
        });
        const lineResult = await lineRes.json();
        if (lineResult.ok) {
          lineSent++;
        } else {
          lineSkipped++;
        }
      } catch (e) {
        console.error(`LINE reminder failed for ${booking.id}:`, e);
        lineSkipped++;
      }

      // Email reminder (look up customer email)
      try {
        const { data: customer } = await supabase
          .from("customers")
          .select("email")
          .eq("phone", booking.phone)
          .maybeSingle();

        if (customer?.email) {
          const { data: storeRow } = await supabase
            .from("system_config")
            .select("value")
            .eq("key", "store_name")
            .maybeSingle();
          const storeName = storeRow?.value || "不老松足湯";

          const emailRes = await fetch(`${baseUrl}/functions/v1/send-booking-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              to: customer.email,
              booking,
              storeName,
              subject: `明日預約提醒 - ${storeName}`,
              template: "reminder",
            }),
          });
          if (emailRes.ok) emailSent++;
        }
      } catch (e) {
        console.error(`Email reminder failed for ${booking.id}:`, e);
      }
    }

    const summary = {
      ok: true,
      date: tomorrowStr,
      total_bookings: bookings.length,
      line_sent: lineSent,
      line_skipped: lineSkipped,
      email_sent: emailSent,
    };
    console.log("Reminder summary:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-booking-reminder error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
