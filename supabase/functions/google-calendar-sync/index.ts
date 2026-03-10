import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- JWT helpers for Google Service Account auth ---
function base64url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlEncode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  let cleaned = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/[\s\r\n]/g, "");
  while (cleaned.length % 4 !== 0) cleaned += "=";
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function createGoogleJWT(email: string, privateKeyPem: string, scopes: string[]): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: email,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signInput = `${encodedHeader}.${encodedPayload}`;
  const keyData = pemToArrayBuffer(privateKeyPem);
  const cryptoKey = await crypto.subtle.importKey("pkcs8", keyData, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(signInput));
  return `${signInput}.${base64urlEncode(new Uint8Array(signature))}`;
}

async function getAccessToken(email: string, privateKey: string): Promise<string> {
  const jwt = await createGoogleJWT(email, privateKey, ["https://www.googleapis.com/auth/calendar"]);
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google token error: ${resp.status} ${text}`);
  }
  const data = await resp.json();
  return data.access_token;
}

// --- Google Calendar API helpers ---
function formatHourToTimeISO(date: string, hour: number): string {
  const displayHour = hour >= 24 ? hour - 24 : hour;
  const h = Math.floor(displayHour);
  const m = Math.round((displayHour % 1) * 60);
  return `${date}T${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`;
}

interface BookingData {
  id: string;
  date: string;
  start_hour: number;
  duration: number;
  name: string;
  phone: string;
  service: string;
  addons?: string[];
  total_price: number;
  google_calendar_event_id?: string;
}

interface HolidayData {
  id: string;
  date: string;
  type: string;
  start_hour?: number | null;
  end_hour?: number | null;
  note?: string | null;
  google_calendar_event_id?: string | null;
}

async function createCalendarEvent(accessToken: string, calendarId: string, booking: BookingData): Promise<string> {
  const startTime = formatHourToTimeISO(booking.date, booking.start_hour);
  const endHour = booking.start_hour + booking.duration / 60;
  const endTime = formatHourToTimeISO(booking.date, endHour);
  const addonsText = booking.addons && booking.addons.length > 0 ? `\n加購項目：${booking.addons.join("、")}` : "";
  const event = {
    summary: `安平不老松72號張嘉豪師傅行程表 - ${booking.name}`,
    description: [
      `👤 客戶：${booking.name}`,
      `📞 電話：${booking.phone}`,
      `💆 服務：${booking.service}${addonsText}`,
      `⏱ 時長：${booking.duration} 分鐘`,
      `💰 金額：$${booking.total_price}`,
      `📋 預約編號：${booking.id}`,
    ].join("\n"),
    start: { dateTime: startTime, timeZone: "Asia/Taipei" },
    end: { dateTime: endTime, timeZone: "Asia/Taipei" },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }] },
  };
  const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google Calendar create event error: ${resp.status} ${text}`);
  }
  return (await resp.json()).id;
}

async function createHolidayEvent(accessToken: string, calendarId: string, holiday: HolidayData): Promise<string> {
  let event: any;
  if (holiday.type === "整天公休") {
    // All-day event
    const nextDay = new Date(holiday.date);
    nextDay.setDate(nextDay.getDate() + 1);
    const endDate = nextDay.toISOString().split("T")[0];
    event = {
      summary: `🚫 公休`,
      description: holiday.note || "整天公休",
      start: { date: holiday.date },
      end: { date: endDate },
      colorId: "11", // red
      reminders: { useDefault: false },
    };
  } else {
    // Partial day off
    const startTime = formatHourToTimeISO(holiday.date, holiday.start_hour!);
    const endTime = formatHourToTimeISO(holiday.date, holiday.end_hour!);
    event = {
      summary: `🚫 部分公休`,
      description: holiday.note || "部分時段公休",
      start: { dateTime: startTime, timeZone: "Asia/Taipei" },
      end: { dateTime: endTime, timeZone: "Asia/Taipei" },
      colorId: "11",
      reminders: { useDefault: false },
    };
  }
  const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google Calendar create holiday event error: ${resp.status} ${text}`);
  }
  return (await resp.json()).id;
}

async function deleteCalendarEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
  const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok && resp.status !== 404) {
    const text = await resp.text();
    throw new Error(`Google Calendar delete event error: ${resp.status} ${text}`);
  }
}

// --- Main handler ---
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const email = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const privateKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
    const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID")?.trim();

    if (!email || !privateKey || !calendarId) {
      throw new Error("Missing Google Calendar configuration secrets");
    }

    let formattedKey = privateKey.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");

    const body = await req.json();
    const { action, booking, holiday } = body;

    const accessToken = await getAccessToken(email, formattedKey);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- Booking actions ---
    if (action === "create" && booking) {
      const eventId = await createCalendarEvent(accessToken, calendarId, booking);
      await supabase.from("bookings").update({ google_calendar_event_id: eventId } as any).eq("id", booking.id);
      return new Response(JSON.stringify({ success: true, event_id: eventId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "cancel" && booking) {
      if (booking.google_calendar_event_id) {
        await deleteCalendarEvent(accessToken, calendarId, booking.google_calendar_event_id);
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Holiday actions ---
    if (action === "create_holiday" && holiday) {
      const eventId = await createHolidayEvent(accessToken, calendarId, holiday);
      await supabase.from("holidays").update({ google_calendar_event_id: eventId } as any).eq("id", holiday.id);
      return new Response(JSON.stringify({ success: true, event_id: eventId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_holiday" && holiday) {
      if (holiday.google_calendar_event_id) {
        await deleteCalendarEvent(accessToken, calendarId, holiday.google_calendar_event_id);
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // List events for a date range
    if (action === "list_events") {
      const { timeMin, timeMax } = body;
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!resp.ok) { const t = await resp.text(); throw new Error(`List events error: ${resp.status} ${t}`); }
      const data = await resp.json();
      return new Response(JSON.stringify({ events: data.items }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Delete a specific event by ID
    if (action === "delete_event") {
      await deleteCalendarEvent(accessToken, calendarId, body.event_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Google Calendar sync error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
