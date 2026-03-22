import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** 與前端 StoreContext FALLBACK_STORE_ID 一致；body 未帶或空字串時使用 */
const FALLBACK_STORE_ID = "8e8388bf-860e-44f7-8e14-35b76c64fb52";

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
      const { date, start_hour, name, phone, service, addons, duration, total_price, email, store_id } = body;

      if (!date || start_hour == null || !name || !phone || !service || !duration || !total_price) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      const resolvedStoreId =
        typeof store_id === "string" && store_id.trim() !== "" ? store_id.trim() : FALLBACK_STORE_ID;

      // Fetch buffer_minutes from system_config
      const { data: configRows } = await supabase
        .from("system_config")
        .select("key, value")
        .eq("key", "buffer_minutes")
        .eq("store_id", resolvedStoreId)
        .maybeSingle();
      const bufferMinutes = configRows?.value ? parseInt(configRows.value) || 10 : 10;

      // Holiday check: block bookings on public holidays
      const { data: holidays } = await supabase
        .from("holidays")
        .select("type, start_hour, end_hour")
        .eq("date", date)
        .eq("store_id", resolvedStoreId);

      if (holidays?.some((h: { type: string }) => h.type === "整天公休")) {
        return new Response(
          JSON.stringify({ error: "該日為公休日，無法預約" }),
          { status: 409, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }

      const newStart = start_hour;
      const newEnd = start_hour + duration / 60;

      const partialHolidayConflict = (holidays || []).some((h: { type: string; start_hour?: number; end_hour?: number }) => {
        if (h.type !== "部分時段公休" || h.start_hour == null || h.end_hour == null) return false;
        return newStart < h.end_hour && newEnd > h.start_hour;
      });
      if (partialHolidayConflict) {
        return new Response(
          JSON.stringify({ error: "該時段為公休時段，無法預約" }),
          { status: 409, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }

      // Conflict check: fetch existing non-cancelled bookings for this date
      const { data: existingBookings } = await supabase
        .from("bookings")
        .select("start_hour, duration")
        .eq("date", date)
        .is("cancelled_at", null)
        .eq("store_id", resolvedStoreId);

      const hasConflict = (existingBookings || []).some((b: { start_hour: number; duration: number }) => {
        const bEnd = b.start_hour + (b.duration + bufferMinutes) / 60;
        return newStart < bEnd && newEnd > b.start_hour;
      });

      if (hasConflict) {
        return new Response(
          JSON.stringify({ error: "該時段已被預約，請選擇其他時段" }),
          { status: 409, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
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
        store_id: resolvedStoreId,
      };

      // customers 列由 DB 觸發器 update_customer_on_booking_change 依 booking.store_id 同步；
      // 若出現 customers.store_id NOT NULL 錯誤，請套用 migration 20260315120000_fix_customer_trigger_store_id.sql
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

      // Send confirmation email if email provided (fire-and-forget)
      let sendToEmail = email && typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? email.trim()
        : null;
      if (!sendToEmail) {
        // TODO: 多租戶下應依 store_id 篩選 customers，避免同電話跨店誤用 email
        const { data: customer } = await supabase
          .from("customers")
          .select("email")
          .eq("phone", phone)
          .eq("store_id", resolvedStoreId)
          .maybeSingle();
        if (customer?.email) sendToEmail = customer.email;
      }
      if (sendToEmail) {
        try {
          const { data: storeRow } = await supabase
            .from("system_config")
            .select("value")
            .eq("key", "store_name")
            .eq("store_id", resolvedStoreId)
            .maybeSingle();
          const storeName = storeRow?.value || "不老松足湯";
          const emailResp = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-booking-email`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
              body: JSON.stringify({ to: sendToEmail, booking: data, storeName }),
            }
          );
          if (!emailResp.ok) {
            console.error("Booking email failed:", await emailResp.text());
          }
        } catch (emailErr) {
          console.error("Booking email error:", emailErr);
        }
      }

      // Send LINE notification (fire-and-forget)
      try {
        await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-line-notification`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({
              type: "booking_confirmed",
              phone,
              booking: data,
              store_id: data?.store_id ?? resolvedStoreId,
            }),
          }
        );
      } catch (lineErr) {
        console.error("LINE notification error:", lineErr);
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

      // Read optional cancel_reason and store_id from request body
      let cancelReason: string | null = null;
      let bodyStoreId: string | undefined;
      try {
        const body = (await req.json()) as Record<string, unknown>;
        if (body?.cancel_reason && typeof body.cancel_reason === "string") {
          cancelReason = body.cancel_reason.trim().slice(0, 200) || null;
        }
        if (body?.store_id && typeof body.store_id === "string") {
          bodyStoreId = body.store_id;
        }
      } catch {
        // No body or invalid JSON — that's fine, cancel_reason stays null
      }

      // Fetch the booking first to get the google_calendar_event_id
      const { data: bookingData } = await supabase.from("bookings").select("*").eq("id", id).single();

      if (bodyStoreId && bookingData?.store_id && bookingData.store_id !== bodyStoreId) {
        return new Response(JSON.stringify({ error: "預約不屬於此店家" }), {
          status: 403,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      const updatePayload: Record<string, unknown> = { cancelled_at: new Date().toISOString() };
      if (cancelReason) updatePayload.cancel_reason = cancelReason;

      const { error } = await supabase.from("bookings").update(updatePayload).eq("id", id);
      if (error) throw error;

      const bookingWithReason = bookingData ? { ...bookingData, cancel_reason: cancelReason } : null;

      // Sync cancellation to Google Calendar
      if (bookingData?.google_calendar_event_id) {
        try {
          await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-sync`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
              body: JSON.stringify({ action: "cancel", booking: bookingData }),
            }
          );
        } catch (syncErr) {
          console.error("Google Calendar cancel sync error:", syncErr);
        }
      }

      // Send LINE cancellation notification (fire-and-forget)
      if (bookingData?.phone) {
        try {
          await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-line-notification`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
              body: JSON.stringify({ type: "booking_cancelled", phone: bookingData.phone, booking: bookingWithReason }),
            }
          );
        } catch (lineErr) {
          console.error("LINE cancel notification error:", lineErr);
        }
      }

      // Send cancellation email (fire-and-forget)
      if (bookingData?.phone) {
        let sendToEmail: string | null = null;
        let delCustQuery = supabase.from("customers").select("email").eq("phone", bookingData.phone);
        const bid = bookingData.store_id as string | undefined;
        if (bid) delCustQuery = delCustQuery.eq("store_id", bid);
        const { data: customer } = await delCustQuery.maybeSingle();
        if (customer?.email) sendToEmail = customer.email;
        if (sendToEmail) {
          try {
            let delNameQuery = supabase.from("system_config").select("value").eq("key", "store_name");
            if (bid) delNameQuery = delNameQuery.eq("store_id", bid);
            const { data: storeRow } = await delNameQuery.maybeSingle();
            const storeName = storeRow?.value || "不老松足湯";
            await fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-booking-email`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
                body: JSON.stringify({ to: sendToEmail, booking: bookingWithReason, storeName, type: "cancelled" }),
              }
            );
          } catch (emailErr) {
            console.error("Cancel email error:", emailErr);
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
});
