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
    const { action, password, store_id: storeId, ...data } = body;

    // Verify admin password
    let configQuery = supabase.from("system_config").select("value").eq("key", "admin_password");
    if (storeId) configQuery = configQuery.eq("store_id", storeId);
    const { data: configRow } = await configQuery.single();
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
        // Sync to Google Calendar + LINE notification
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
        if (bk?.phone) {
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-line-notification`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
              body: JSON.stringify({ type: "booking_cancelled", phone: bk.phone, booking: bk }),
            });
          } catch (e) { console.error("LINE cancel notify error:", e); }
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
        const bookingPayload = { ...data.booking };
        if (storeId && !bookingPayload.store_id) bookingPayload.store_id = storeId;
        const { data: inserted, error } = await supabase.from("bookings").insert(bookingPayload).select().single();
        if (error) throw error;
        // Sync to Google Calendar
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({ action: "create", booking: inserted }),
          });
        } catch (e) { console.error("Calendar sync error on manual create:", e); }
        // LINE notification for manual booking
        if (inserted?.phone) {
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-line-notification`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
              body: JSON.stringify({ type: "booking_confirmed", phone: inserted.phone, booking: inserted }),
            });
          } catch (e) { console.error("LINE notify error on manual create:", e); }
        }
        result = { success: true, booking: inserted };
        break;
      }

      // ===== Holidays =====
      case "holiday.create": {
        const holidayPayload = { ...data.holiday };
        if (storeId && !holidayPayload.store_id) holidayPayload.store_id = storeId;
        const { data: inserted, error } = await supabase.from("holidays").insert(holidayPayload).select().single();
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
        const holidaysPayload = (data.holidays || []).map((h: any) => (storeId && !h.store_id ? { ...h, store_id: storeId } : h));
        const { data: inserted, error } = await supabase.from("holidays").insert(holidaysPayload).select();
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
        const servicePayload = { ...data.service };
        if (storeId && !servicePayload.store_id) servicePayload.store_id = storeId;
        const { error } = await supabase.from("services").insert(servicePayload);
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
        const addonPayload = { ...data.addon };
        if (storeId && !addonPayload.store_id) addonPayload.store_id = storeId;
        const { error } = await supabase.from("addons").insert(addonPayload);
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
        const customerPayload = { ...data.customer };
        if (storeId && !customerPayload.store_id) customerPayload.store_id = storeId;
        const { error } = await supabase.from("customers").upsert(customerPayload, { onConflict: "phone" });
        if (error) throw error;
        break;
      }
      case "customer.update": {
        const { error } = await supabase.from("customers").update(data.updates).eq("id", data.id);
        if (error) throw error;
        break;
      }
      case "customer_tag.add": {
        const tagPayload = { ...data.tag };
        if (storeId && !tagPayload.store_id) tagPayload.store_id = storeId;
        const { data: inserted, error } = await supabase.from("customer_tags").insert(tagPayload).select().single();
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
        const notePayload = { ...data.note };
        if (storeId && !notePayload.store_id) notePayload.store_id = storeId;
        const { data: inserted, error } = await supabase.from("customer_notes").insert(notePayload).select().single();
        if (error) throw error;
        result = { success: true, note: inserted };
        break;
      }
      case "customer_note.remove": {
        const { error } = await supabase.from("customer_notes").delete().eq("id", data.id);
        if (error) throw error;
        break;
      }

      // ===== Custom Fields =====
      case "custom_field.create": {
        const fieldPayload = { ...data.field };
        if (storeId && !fieldPayload.store_id) fieldPayload.store_id = storeId;
        const { data: inserted, error } = await supabase.from("customer_custom_fields").insert(fieldPayload).select().single();
        if (error) throw error;
        result = { success: true, field: inserted };
        break;
      }
      case "custom_field.update": {
        const { id, ...updates } = data.field;
        const { error } = await supabase.from("customer_custom_fields").update(updates).eq("id", id);
        if (error) throw error;
        break;
      }
      case "custom_field.delete": {
        const { error } = await supabase.from("customer_custom_fields").delete().eq("id", data.id);
        if (error) throw error;
        break;
      }
      case "custom_field_value.upsert": {
        const { customer_id, field_id, value } = data;
        const upsertPayload: any = { customer_id, field_id, value, updated_at: new Date().toISOString() };
        if (storeId) upsertPayload.store_id = storeId;
        const { error } = await supabase.from("customer_field_values").upsert(
          upsertPayload,
          { onConflict: "customer_id,field_id" }
        );
        if (error) throw error;
        break;
      }

      // ===== System Config =====
      case "config.update": {
        for (const { key, value } of data.configs) {
          const upsertPayload: any = { key, value, updated_at: new Date().toISOString() };
          if (storeId) upsertPayload.store_id = storeId;
          const { error } = await supabase.from("system_config").upsert(upsertPayload);
          if (error) throw error;
        }
        break;
      }

      // ===== Calendar Full Sync =====
      case "calendar.full_sync": {
        const syncUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-sync`;
        const syncHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` };
        let synced = 0;
        let deleted = 0;
        let errors: string[] = [];

        // 1. Sync all active bookings without google_calendar_event_id
        let unsyncedQuery = supabase.from("bookings").select("*").is("google_calendar_event_id", null).in("status", ["confirmed", "completed"]);
        if (storeId) unsyncedQuery = unsyncedQuery.eq("store_id", storeId);
        const { data: unsyncedBookings } = await unsyncedQuery;

        for (const bk of (unsyncedBookings || [])) {
          try {
            await fetch(syncUrl, { method: "POST", headers: syncHeaders, body: JSON.stringify({ action: "create", booking: bk }) });
            synced++;
          } catch (e) { errors.push(`Booking ${bk.id}: ${(e as Error).message}`); }
        }

        // 2. Delete calendar events for cancelled bookings that still have event IDs
        let cancelledQuery = supabase.from("bookings").select("*").eq("status", "cancelled").not("google_calendar_event_id", "is", null);
        if (storeId) cancelledQuery = cancelledQuery.eq("store_id", storeId);
        const { data: cancelledWithEvents } = await cancelledQuery;

        for (const bk of (cancelledWithEvents || [])) {
          try {
            await fetch(syncUrl, { method: "POST", headers: syncHeaders, body: JSON.stringify({ action: "cancel", booking: bk }) });
            await supabase.from("bookings").update({ google_calendar_event_id: null }).eq("id", bk.id);
            deleted++;
          } catch (e) { errors.push(`Cancel sync ${bk.id}: ${(e as Error).message}`); }
        }

        // 3. Sync holidays without event IDs
        let holidaysQuery = supabase.from("holidays").select("*").is("google_calendar_event_id", null);
        if (storeId) holidaysQuery = holidaysQuery.eq("store_id", storeId);
        const { data: unsyncedHolidays } = await holidaysQuery;

        for (const h of (unsyncedHolidays || [])) {
          try {
            await fetch(syncUrl, { method: "POST", headers: syncHeaders, body: JSON.stringify({ action: "create_holiday", holiday: h }) });
            synced++;
          } catch (e) { errors.push(`Holiday ${h.id}: ${(e as Error).message}`); }
        }

        result = { success: true, synced, deleted, errors: errors.length > 0 ? errors : undefined };
        break;
      }

      case "config.get_calendar_id": {
        const calId = Deno.env.get("GOOGLE_CALENDAR_ID") || "";
        result = { success: true, calendar_id: calId };
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
