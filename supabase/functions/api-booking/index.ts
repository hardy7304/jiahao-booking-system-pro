import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assignCoachForBooking } from "../../../src/lib/coachAssignment.ts";
import { resolveMainCoachFromCoachRows } from "../../../src/lib/mainCoachResolution.ts";

function cmsTherapistTitleFromRow(row: Record<string, unknown> | null | undefined): string {
  if (!row) return "";
  const top = typeof row.therapist_section_title === "string" ? row.therapist_section_title.trim() : "";
  if (top) return top;
  const stats = row.stats;
  if (stats && typeof stats === "object" && stats !== null && !Array.isArray(stats)) {
    const s = (stats as Record<string, unknown>).therapist_section_title;
    if (typeof s === "string" && s.trim()) return s.trim();
  }
  return "";
}

/** 與前端 StoreContext FALLBACK_STORE_ID 一致；body 未帶或空字串時使用 */
const FALLBACK_STORE_ID = "8e8388bf-860e-44f7-8e14-35b76c64fb52";

function formatHourToTime(hour: number): string {
  const displayHour = hour >= 24 ? hour - 24 : hour;
  const h = Math.floor(displayHour);
  const m = (displayHour % 1) * 60;
  return `${h.toString().padStart(2, '0')}:${m === 0 ? '00' : '30'}`;
}

function hasSlotConflict(
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
      const { date, start_hour, name, phone, service, addons, duration, total_price, email, store_id, needs_pair, preferred_backup_coach_id } = body;

      if (!date || start_hour == null || !name || !phone || !service || !duration || !total_price) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      const resolvedStoreId =
        typeof store_id === "string" && store_id.trim() !== "" ? store_id.trim() : FALLBACK_STORE_ID;
      const isPairBooking = needs_pair === true;

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
        .select("start_hour, duration, coach_id")
        .eq("date", date)
        .is("cancelled_at", null)
        .eq("store_id", resolvedStoreId);

      const { data: coaches, error: coachErr } = await supabase
        .from("coaches")
        .select("id,name,is_active,available_today,shift_start_hour,shift_end_hour,display_order")
        .eq("store_id", resolvedStoreId)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      let coachRows = (coaches || []) as Array<{
        id: string;
        name: string;
        display_order: number;
        available_today: boolean;
        shift_start_hour?: number;
        shift_end_hour?: number;
      }>;
      if (coachErr?.message?.includes("shift_start_hour")) {
        const { data: fallbackCoaches, error: fallbackErr } = await supabase
          .from("coaches")
          .select("id,name,is_active,available_today,display_order")
          .eq("store_id", resolvedStoreId)
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: true });
        if (fallbackErr) throw fallbackErr;
        coachRows = ((fallbackCoaches || []) as Array<{
          id: string;
          name: string;
          display_order: number;
          available_today: boolean;
        }>).map((c) => ({ ...c, shift_start_hour: 14, shift_end_hour: 26 }));
      } else if (coachErr) {
        throw coachErr;
      }
      if (coachRows.length === 0) {
        return new Response(
          JSON.stringify({ error: "尚未設定可用師傅，請聯繫店家" }),
          { status: 409, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
        );
      }

      const [{ data: settingsRow }, { data: therapistNameRow }] = await Promise.all([
        supabase.from("store_settings").select("therapist_section_title, stats").eq("store_id", resolvedStoreId).maybeSingle(),
        supabase.from("system_config").select("value").eq("store_id", resolvedStoreId).eq("key", "therapist_name").maybeSingle(),
      ]);
      const cmsTitle = cmsTherapistTitleFromRow(settingsRow as Record<string, unknown> | null | undefined);
      const systemTherapistName =
        therapistNameRow?.value && typeof therapistNameRow.value === "string" ? therapistNameRow.value.trim() : "";

      const mainResolved = resolveMainCoachFromCoachRows(coachRows, cmsTitle, systemTherapistName);
      if (!mainResolved) {
        return new Response(
          JSON.stringify({ error: "無法判定主師傅，請聯繫店家" }),
          { status: 409, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
        );
      }
      const mainCoach = coachRows.find((c) => c.id === mainResolved.id)!;

      let assignedCoachId: string | null = null;
      let secondaryCoachId: string | null = null;
      let primaryCoachName: string | null = null;
      let secondaryCoachName: string | null = null;

      if (isPairBooking) {
        const sorted = [...coachRows].sort((a, b) => a.display_order - b.display_order);
        const allBookings = (existingBookings || []) as Array<{ coach_id: string | null; start_hour: number; duration: number }>;
        const mainBookings = allBookings
          .filter((b) => b.coach_id === mainCoach.id || b.coach_id == null)
          .map((b) => ({ start_hour: b.start_hour, duration: b.duration }));
        const mainAvailable = !hasSlotConflict(start_hour, duration, bufferMinutes, mainBookings);
        if (!mainAvailable) {
          return new Response(
            JSON.stringify({ error: "雙人時段已滿（主師傅已滿），請選擇其他時段" }),
            { status: 409, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
          );
        }

        const backupPool = sorted.filter(
          (c) =>
            c.id !== mainCoach.id &&
            c.available_today === true &&
            start_hour >= (c.shift_start_hour ?? 14) &&
            newEnd <= (c.shift_end_hour ?? 26),
        );
        const preferredBackupId =
          typeof preferred_backup_coach_id === "string" && preferred_backup_coach_id.trim()
            ? preferred_backup_coach_id.trim()
            : null;
        if (preferredBackupId && preferredBackupId === mainCoach.id) {
          return new Response(
            JSON.stringify({ error: "主師傅不可作為搭班師傅，請改選其他師傅" }),
            { status: 409, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
          );
        }
        const availableBackup = backupPool
          .map((coach) => {
            const coachBookings = allBookings
              .filter((b) => b.coach_id === coach.id)
              .map((b) => ({ start_hour: b.start_hour, duration: b.duration }));
            return {
              id: coach.id,
              name: coach.name,
              canTake: !hasSlotConflict(start_hour, duration, bufferMinutes, coachBookings),
              dailyLoad: coachBookings.length,
            };
          })
          .filter((x) => x.canTake)
          .sort((a, b) => a.dailyLoad - b.dailyLoad);
        if (preferredBackupId) {
          const preferredInPool = backupPool.find((c) => c.id === preferredBackupId);
          if (!preferredInPool) {
            return new Response(
              JSON.stringify({ error: "指定搭班師傅今日未開班或不可選，請改為不指定" }),
              { status: 409, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
            );
          }
          const preferredPick = availableBackup.find((x) => x.id === preferredBackupId);
          if (!preferredPick) {
            return new Response(
              JSON.stringify({ error: "指定搭班師傅此時段無法接班，請換時段或改為不指定" }),
              { status: 409, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
            );
          }
          assignedCoachId = mainCoach.id;
          primaryCoachName = mainCoach.name;
          secondaryCoachId = preferredPick.id;
          secondaryCoachName = preferredPick.name;
        } else if (availableBackup.length === 0) {
          return new Response(
            JSON.stringify({ error: "雙人時段已滿（暫無可搭班師傅），請選擇其他時段" }),
            { status: 409, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
          );
        } else {
          assignedCoachId = mainCoach.id;
          primaryCoachName = mainCoach.name;
          secondaryCoachId = availableBackup[0].id;
          secondaryCoachName = availableBackup[0].name;
        }
      } else {
        const mainBookings = ((existingBookings || []) as Array<{ coach_id: string | null; start_hour: number; duration: number }>)
          .filter((b) => b.coach_id === mainCoach.id || b.coach_id == null)
          .map((b) => ({ start_hour: b.start_hour, duration: b.duration }));
        const onlyMainAssignment = assignCoachForBooking({
          start_hour,
          duration,
          buffer_minutes: bufferMinutes,
          coaches: [{ id: mainCoach.id, display_order: 1, available_today: false }],
          bookings: mainBookings.map((b) => ({ coach_id: mainCoach.id, ...b })),
        });
        if (onlyMainAssignment.reason !== "main") {
          return new Response(
            JSON.stringify({ error: "主師傅此時段已滿，請選擇其他時段" }),
            { status: 409, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
          );
        }
        assignedCoachId = mainCoach.id;
        primaryCoachName = mainCoach.name;
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
        coach_id: assignedCoachId,
        secondary_coach_id: secondaryCoachId,
        needs_pair: isPairBooking,
      };

      // customers 列由 DB 觸發器 update_customer_on_booking_change 依 booking.store_id 同步；
      // 若出現 customers.store_id NOT NULL 錯誤，請套用 migration 20260315120000_fix_customer_trigger_store_id.sql
      const { data, error } = await supabase.from("bookings").insert(bookingData).select().single();
      if (error) throw error;

      const bookingForNotifications = {
        ...data,
        primary_coach_name: primaryCoachName,
        secondary_coach_name: secondaryCoachName,
      };

      // Sync to Google Calendar (fire-and-forget, don't block booking response)
      try {
        const syncResp = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-sync`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({ action: "create", booking: bookingForNotifications }),
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
              body: JSON.stringify({ to: sendToEmail, booking: bookingForNotifications, storeName }),
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
              booking: bookingForNotifications,
              store_id: data?.store_id ?? resolvedStoreId,
            }),
          }
        );
      } catch (lineErr) {
        console.error("LINE notification error:", lineErr);
      }

      return new Response(JSON.stringify({ booking: data, assignment: { primaryCoachName, secondaryCoachName } }), { status: 201, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
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
