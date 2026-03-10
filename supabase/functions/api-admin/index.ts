import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatHourToTime(hour: number): string {
  const displayHour = hour >= 24 ? hour - 24 : hour;
  const h = Math.floor(displayHour);
  const m = (displayHour % 1) * 60;
  return `${h.toString().padStart(2, "0")}:${m === 0 ? "00" : "30"}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { action, password, ...data } = body;

    // Verify admin password
    const { data: configRow } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "admin_password")
      .single();
    const adminPassword = configRow?.value || "bulaosong2024";
    if (password !== adminPassword) {
      return jsonResponse({ error: "密碼錯誤" }, 401);
    }

    let result: any = { success: true };

    switch (action) {
      // ===== Bookings =====
      case "booking.cancel": {
        const { error } = await supabase.from("bookings").update({
          cancelled_at: new Date().toISOString(),
          status: "cancelled",
          cancel_reason: data.reason,
        }).eq("id", data.id);
        if (error) throw error;
        // Sync to Google Calendar
        const { data: bk } = await supabase.from("bookings").select("*").eq("id", data.id).single();
        if (bk?.google_calendar_event_id) {
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-sync`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
              body: JSON.stringify({ action: "cancel", booking: bk }),
            });
          } catch (e) { console.error("Calendar sync error:", e); }
        }
        break;
      }
      case "booking.restore": {
        const { error } = await supabase.from("bookings").update({
          cancelled_at: null, status: "confirmed", cancel_reason: null,
        }).eq("id", data.id);
        if (error) throw error;
        break;
      }
      case "booking.complete": {
        const { error } = await supabase.from("bookings").update({
          status: "completed", completed_at: new Date().toISOString(),
        }).eq("id", data.id);
        if (error) throw error;
        break;
      }
      case "booking.uncomplete": {
        const { error } = await supabase.from("bookings").update({
          status: "confirmed", completed_at: null,
        }).eq("id", data.id);
        if (error) throw error;
        break;
      }
      case "booking.update": {
        const { id, updates } = data;
        const { error } = await supabase.from("bookings").update(updates).eq("id", id);
        if (error) throw error;
        break;
      }
      case "booking.delete": {
        const { error } = await supabase.from("bookings").delete().eq("id", data.id);
        if (error) throw error;
        break;
      }
      case "booking.note": {
        const { error } = await supabase.from("bookings").update({ admin_note: data.note }).eq("id", data.id);
        if (error) throw error;
        break;
      }
      case "booking.create_manual": {
        const { data: inserted, error } = await supabase.from("bookings").insert(data.booking).select().single();
        if (error) throw error;
        // Sync to Google Calendar
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({ action: "create", booking: inserted }),
          });
        } catch (e) { console.error("Calendar sync error on manual create:", e); }
        result = { success: true, booking: inserted };
        break;
      }

      // ===== Holidays =====
      case "holiday.create": {
        const { data: inserted, error } = await supabase.from("holidays").insert(data.holiday).select().single();
        if (error) throw error;
        // Sync to Google Calendar
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({ action: "create_holiday", holiday: inserted }),
          });
        } catch (e) { console.error("Holiday sync error:", e); }
        result = { success: true, holiday: inserted };
        break;
      }
      case "holiday.create_batch": {
        const { data: inserted, error } = await supabase.from("holidays").insert(data.holidays).select();
        if (error) throw error;
        // Sync each to Google Calendar
        for (const h of (inserted || [])) {
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-sync`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
              body: JSON.stringify({ action: "create_holiday", holiday: h }),
            });
          } catch (e) { console.error("Holiday sync error:", e); }
        }
        result = { success: true, holidays: inserted };
        break;
      }
      case "holiday.delete": {
        // Get holiday for calendar sync
        const { data: holiday } = await supabase.from("holidays").select("*").eq("id", data.id).single();
        const { error } = await supabase.from("holidays").delete().eq("id", data.id);
        if (error) throw error;
        if (holiday?.google_calendar_event_id) {
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-sync`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
              body: JSON.stringify({ action: "delete_holiday", holiday }),
            });
          } catch (e) { console.error("Holiday sync error:", e); }
        }
        break;
      }

      // ===== Services =====
      case "service.create": {
        const { error } = await supabase.from("services").insert(data.service);
        if (error) throw error;
        break;
      }
      case "service.update": {
        const { id, ...updates } = data.service;
        const { error } = await supabase.from("services").update(updates).eq("id", id);
        if (error) throw error;
        break;
      }
      case "service.delete": {
        const { error } = await supabase.from("services").delete().eq("id", data.id);
        if (error) throw error;
        break;
      }

      // ===== Addons =====
      case "addon.create": {
        const { error } = await supabase.from("addons").insert(data.addon);
        if (error) throw error;
        break;
      }
      case "addon.update": {
        const { id, ...updates } = data.addon;
        const { error } = await supabase.from("addons").update(updates).eq("id", id);
        if (error) throw error;
        break;
      }
      case "addon.delete": {
        const { error } = await supabase.from("addons").delete().eq("id", data.id);
        if (error) throw error;
        break;
      }

      // ===== Customers =====
      case "customer.upsert": {
        const { error } = await supabase.from("customers").upsert(data.customer, { onConflict: "phone" });
        if (error) throw error;
        break;
      }
      case "customer.update": {
        const { error } = await supabase.from("customers").update(data.updates).eq("id", data.id);
        if (error) throw error;
        break;
      }
      case "customer_tag.add": {
        const { data: inserted, error } = await supabase.from("customer_tags").insert(data.tag).select().single();
        if (error) throw error;
        result = { success: true, tag: inserted };
        break;
      }
      case "customer_tag.remove": {
        const { error } = await supabase.from("customer_tags").delete().eq("id", data.id);
        if (error) throw error;
        break;
      }
      case "customer_note.add": {
        const { data: inserted, error } = await supabase.from("customer_notes").insert(data.note).select().single();
        if (error) throw error;
        result = { success: true, note: inserted };
        break;
      }
      case "customer_note.remove": {
        const { error } = await supabase.from("customer_notes").delete().eq("id", data.id);
        if (error) throw error;
        break;
      }

      // ===== System Config =====
      case "config.update": {
        for (const { key, value } of data.configs) {
          const { error } = await supabase.from("system_config").upsert({
            key, value, updated_at: new Date().toISOString(),
          });
          if (error) throw error;
        }
        break;
      }

      default:
        return jsonResponse({ error: "Unknown action" }, 400);
    }

    return jsonResponse(result);
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
