import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- JWT helpers for Google Service Account auth ---
function base64url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}


function base64urlEncode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 從 PEM 字串取出 base64 並解碼，相容 Supabase Secrets 常見格式 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  if (!pem || typeof pem !== "string") {
    throw new Error("Private key is empty or not a string");
  }
  // 去掉前後引號（JSON 貼上時可能帶有）
  let raw = pem.replace(/^["'\s]+|["'\s]+$/g, "");
  // 統一換行：\n 字面量 → 實際換行
  raw = raw.replace(/\\n/g, "\n");
  // 只保留 -----BEGIN...----- 與 -----END...----- 之間的內容
  const begin = "-----BEGIN PRIVATE KEY-----";
  const end = "-----END PRIVATE KEY-----";
  const i = raw.indexOf(begin);
  const j = raw.indexOf(end);
  if (i !== -1 && j > i) {
    raw = raw.slice(i + begin.length, j);
  } else if (i !== -1) {
    raw = raw.slice(i + begin.length);
  } else if (j !== -1) {
    raw = raw.slice(0, j);
  }
  // 移除所有空白與換行，只留 base64 字元
  let b64 = raw.replace(/[\s\r\n]/g, "");
  // 只保留合法 base64 字元（避免非法字元導致 atob 失敗）
  b64 = b64.replace(/[^A-Za-z0-9+/=]/g, "");
  if (!b64.length) {
    throw new Error("No base64 content found in private key. Check GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: include -----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----");
  }
  while (b64.length % 4 !== 0) b64 += "=";
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  } catch (e) {
    const msg = (e as Error).message || String(e);
    throw new Error(`Failed to decode private key base64: ${msg}. Ensure the key is the full PEM (from JSON private_key) without extra characters.`);
  }
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
  let actualDate = date;
  let displayHour = hour;
  if (hour >= 24) {
    // Cross-midnight: add 1 day to the date
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    actualDate = d.toISOString().split("T")[0];
    displayHour = hour - 24;
  }
  const h = Math.floor(displayHour);
  const m = Math.round((displayHour % 1) * 60);
  return `${actualDate}T${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`;
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
  needs_pair?: boolean;
  primary_coach_name?: string | null;
  secondary_coach_name?: string | null;
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
    summary: `${booking.needs_pair ? "[雙人] " : ""}安平不老松72號張嘉豪師傅行程表 - ${booking.name}`,
    description: [
      `👤 客戶：${booking.name}`,
      `📞 電話：${booking.phone}`,
      `💆 服務：${booking.service}${addonsText}`,
      `⏱ 時長：${booking.duration} 分鐘`,
      `💰 金額：$${booking.total_price}`,
      booking.needs_pair ? `👥 型態：雙人預約` : `👤 型態：單人預約`,
      booking.primary_coach_name ? `👨‍🔧 主師傅：${booking.primary_coach_name}` : null,
      booking.secondary_coach_name ? `🧑‍🔧 搭班師傅：${booking.secondary_coach_name}` : null,
      `📋 預約編號：${booking.id}`,
    ].filter(Boolean).join("\n"),
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
  /** 公休常批次建立：不發 Google 日曆「活動通知」信（與 Resend 客人預約信無關） */
  const resp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=none`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    },
  );
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

    const body = await req.json();

    // action "check": 診斷用，檢查設定狀態
    if (body?.action === "check") {
      // 嘗試實際取得 token 來驗證私鑰是否能用
      let tokenTest = "未測試";
      if (email && privateKey && calendarId) {
        try {
          const fk = privateKey.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
          await getAccessToken(email, fk);
          tokenTest = "成功（私鑰有效）";
        } catch (e) {
          tokenTest = `失敗：${(e as Error).message}`;
        }
      }
      return new Response(
        JSON.stringify({
          ok: !!(email && privateKey && calendarId) && tokenTest.startsWith("成功"),
          google_calendar_id: calendarId || "未設定",
          google_service_account_email: email || "未設定",
          google_private_key: privateKey ? `已設定（${privateKey.length} 字元）` : "未設定",
          token_test: tokenTest,
          hint: !(email && privateKey && calendarId)
            ? "請在 Supabase → Edge Functions → google-calendar-sync → Secrets 設定 GOOGLE_CALENDAR_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"
            : null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email || !privateKey || !calendarId) {
      throw new Error("Missing Google Calendar configuration secrets");
    }

    let formattedKey = privateKey.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
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
    const err = e as Error;
    console.error("Google Calendar sync error:", err.message, err.stack);
    return new Response(
      JSON.stringify({ error: err.message, stack: err.stack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
