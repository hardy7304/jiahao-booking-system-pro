const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Booking {
  date: string;
  start_time_str?: string;
  start_hour?: number;
  name: string;
  phone: string;
  service: string;
  addons?: string[];
  duration: number;
  total_price: number;
  needs_pair?: boolean;
  primary_coach_name?: string | null;
  secondary_coach_name?: string | null;
}

function formatHourToTime(hour: number): string {
  const displayHour = hour >= 24 ? hour - 24 : hour;
  const h = Math.floor(displayHour);
  const m = (displayHour % 1) * 60;
  return `${h.toString().padStart(2, "0")}:${m === 0 ? "00" : "30"}`;
}

const emailStyles = `
  body { font-family: "Microsoft JhengHei", "PingFang TC", sans-serif; line-height: 1.6; color: #333; max-width: 500px; margin: 0 auto; padding: 20px; }
  h1 { color: #166534; font-size: 1.5rem; }
  .card { background: #f8faf8; border-radius: 12px; padding: 20px; margin: 20px 0; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
  .row:last-child { border-bottom: none; }
  .label { color: #6b7280; }
  .value { font-weight: 500; }
  .footer { font-size: 12px; color: #9ca3af; margin-top: 24px; }
  .badge { background: #166534; color: white; padding: 4px 12px; border-radius: 999px; font-size: 12px; display: inline-block; margin-bottom: 12px; }
`;

function buildCustomerEmailHtml(booking: Booking, storeName: string): string {
  const startTime = booking.start_time_str ?? (booking.start_hour != null ? formatHourToTime(booking.start_hour) : "—");
  const addonsStr = (booking.addons?.length ?? 0) > 0 ? booking.addons!.join("、") : "無";
  const coachText = booking.needs_pair
    ? `${booking.primary_coach_name || "主師傅"} + ${booking.secondary_coach_name || "搭班師傅"}`
    : (booking.primary_coach_name || "主師傅");
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${emailStyles}</style></head>
<body>
  <h1>✨ 預約確認</h1>
  <p>您好 ${booking.name}，</p>
  <p>感謝您的預約，以下是您的預約資訊：</p>
  <div class="card">
    <div class="row"><span class="label">店家</span><span class="value">${storeName}</span></div>
    <div class="row"><span class="label">日期</span><span class="value">${booking.date}</span></div>
    <div class="row"><span class="label">時段</span><span class="value">${startTime}</span></div>
    <div class="row"><span class="label">服務</span><span class="value">${booking.service}</span></div>
    <div class="row"><span class="label">預約型態</span><span class="value">${booking.needs_pair ? "雙人" : "單人"}</span></div>
    <div class="row"><span class="label">安排師傅</span><span class="value">${coachText}</span></div>
    <div class="row"><span class="label">加購</span><span class="value">${addonsStr}</span></div>
    <div class="row"><span class="label">時長</span><span class="value">${booking.duration} 分鐘</span></div>
    <div class="row"><span class="label">金額</span><span class="value">NT$ ${booking.total_price.toLocaleString()}</span></div>
  </div>
  <p>如有變更需求，請盡早聯繫店家。</p>
  <div class="footer">此信由 ${storeName} 預約系統自動寄出，請勿直接回覆。</div>
</body>
</html>
`;
}

interface CancelBooking extends Booking {
  cancel_reason?: string | null;
}

function buildCancelEmailHtml(booking: CancelBooking, storeName: string): string {
  const startTime = booking.start_time_str ?? (booking.start_hour != null ? formatHourToTime(booking.start_hour) : "—");
  const cancelReason = booking.cancel_reason || "未提供";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${emailStyles}</style></head>
<body>
  <h1>预约已取消</h1>
  <p>您好 ${booking.name}，</p>
  <p>您的以下預約已取消：</p>
  <div class="card">
    <div class="row"><span class="label">店家</span><span class="value">${storeName}</span></div>
    <div class="row"><span class="label">日期</span><span class="value">${booking.date}</span></div>
    <div class="row"><span class="label">時段</span><span class="value">${startTime}</span></div>
    <div class="row"><span class="label">服務</span><span class="value">${booking.service}</span></div>
    <div class="row"><span class="label">取消原因</span><span class="value">${cancelReason}</span></div>
  </div>
  <p>如需重新預約，歡迎至官網預約頁面。</p>
  <div class="footer">此信由 ${storeName} 預約系統自動寄出，請勿直接回覆。</div>
</body>
</html>
`;
}

function buildStoreCancelNotificationHtml(booking: CancelBooking, storeName: string): string {
  const startTime = booking.start_time_str ?? (booking.start_hour != null ? formatHourToTime(booking.start_hour) : "—");
  const cancelReason = booking.cancel_reason || "未提供";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${emailStyles}</style></head>
<body>
  <span class="badge" style="background:#dc2626;">取消通知</span>
  <h1>有預約被取消</h1>
  <p>客人 ${booking.name} 已取消預約：</p>
  <div class="card">
    <div class="row"><span class="label">預約人</span><span class="value">${booking.name}</span></div>
    <div class="row"><span class="label">電話</span><span class="value">${booking.phone}</span></div>
    <div class="row"><span class="label">日期</span><span class="value">${booking.date}</span></div>
    <div class="row"><span class="label">時段</span><span class="value">${startTime}</span></div>
    <div class="row"><span class="label">服務</span><span class="value">${booking.service}</span></div>
    <div class="row"><span class="label">取消原因</span><span class="value">${cancelReason}</span></div>
  </div>
  <div class="footer">${storeName} 預約系統 · 店家通知</div>
</body>
</html>
`;
}

function buildStoreNotificationHtml(booking: Booking, storeName: string): string {
  const startTime = booking.start_time_str ?? (booking.start_hour != null ? formatHourToTime(booking.start_hour) : "—");
  const addonsStr = (booking.addons?.length ?? 0) > 0 ? booking.addons!.join("、") : "無";
  const coachText = booking.needs_pair
    ? `${booking.primary_coach_name || "主師傅"} + ${booking.secondary_coach_name || "搭班師傅"}`
    : (booking.primary_coach_name || "主師傅");
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${emailStyles}</style></head>
<body>
  <span class="badge">新預約通知</span>
  <h1>📋 有新預約</h1>
  <p>客人 ${booking.name} 已完成線上預約，請確認：</p>
  <div class="card">
    <div class="row"><span class="label">預約人</span><span class="value">${booking.name}</span></div>
    <div class="row"><span class="label">電話</span><span class="value">${booking.phone}</span></div>
    <div class="row"><span class="label">日期</span><span class="value">${booking.date}</span></div>
    <div class="row"><span class="label">時段</span><span class="value">${startTime}</span></div>
    <div class="row"><span class="label">服務</span><span class="value">${booking.service}</span></div>
    <div class="row"><span class="label">預約型態</span><span class="value">${booking.needs_pair ? "雙人" : "單人"}</span></div>
    <div class="row"><span class="label">安排師傅</span><span class="value">${coachText}</span></div>
    <div class="row"><span class="label">加購</span><span class="value">${addonsStr}</span></div>
    <div class="row"><span class="label">時長</span><span class="value">${booking.duration} 分鐘</span></div>
    <div class="row"><span class="label">金額</span><span class="value">NT$ ${booking.total_price.toLocaleString()}</span></div>
  </div>
  <div class="footer">${storeName} 預約系統 · 店家通知</div>
</body>
</html>
`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // GET: 診斷用，檢查設定狀態
    if (req.method === "GET") {
      const apiKey = Deno.env.get("RESEND_API_KEY");
      const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
      const storeEmail = Deno.env.get("RESEND_STORE_EMAIL");
      return new Response(
        JSON.stringify({
          ok: !!apiKey,
          resend_api_key_set: !!apiKey,
          resend_from_email: fromEmail ? "已設定" : "未設定（將用 onboarding@resend.dev）",
          resend_store_email: storeEmail ? "已設定" : "未設定",
          hint: !apiKey ? "請在 Supabase → Edge Functions → send-booking-email → Secrets 設定 RESEND_API_KEY" : null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("RESEND_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { to, booking, storeName = "不老松足湯", type = "confirmed" } = body;

    if (!to || typeof to !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!booking || !booking.name || !booking.service) {
      return new Response(
        JSON.stringify({ error: "Invalid booking data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    const fromName = Deno.env.get("RESEND_FROM_NAME") || storeName;
    const storeEmail = Deno.env.get("RESEND_STORE_EMAIL");
    const startTimeStr = booking.start_time_str ?? (booking.start_hour != null ? formatHourToTime(booking.start_hour) : "");
    const isCancelled = type === "cancelled";

    const resendHeaders = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    const customerSubject = isCancelled
      ? `【${storeName}】預約取消通知 - ${booking.date} ${startTimeStr}`
      : `【${storeName}】預約確認 - ${booking.date} ${startTimeStr}`;
    const customerHtml = isCancelled
      ? buildCancelEmailHtml(booking, storeName)
      : buildCustomerEmailHtml(booking, storeName);

    // 1. 寄信給客人（確認信 or 取消信）
    const customerRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: resendHeaders,
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject: customerSubject,
        html: customerHtml,
      }),
    });

    if (!customerRes.ok) {
      const errText = await customerRes.text();
      console.error("Resend API error (customer):", customerRes.status, errText);
      return new Response(
        JSON.stringify({
          error: isCancelled ? "Failed to send cancellation email" : "Failed to send confirmation email",
          resend_status: customerRes.status,
          resend_error: errText,
          from_used: `${fromName} <${fromEmail}>`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerResult = await customerRes.json();
    const ids: string[] = [customerResult.id];

    // 2. 同時寄一份通知給店家（若有設定 RESEND_STORE_EMAIL）
    if (storeEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(storeEmail)) {
      try {
        const storeSubject = isCancelled
          ? `【${storeName}】預約取消通知 - ${booking.name} · ${booking.date} ${startTimeStr}`
          : `【${storeName}】新預約通知 - ${booking.name} · ${booking.date} ${startTimeStr}`;
        const storeHtml = isCancelled
          ? buildStoreCancelNotificationHtml(booking, storeName)
          : buildStoreNotificationHtml(booking, storeName);

        const storeRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: resendHeaders,
          body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: [storeEmail],
            subject: storeSubject,
            html: storeHtml,
          }),
        });
        if (storeRes.ok) {
          const storeResult = await storeRes.json();
          ids.push(storeResult.id);
        } else {
          console.error("Store notification failed:", await storeRes.text());
        }
      } catch (storeErr) {
        console.error("Store notification error:", storeErr);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, ids }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-booking-email error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
