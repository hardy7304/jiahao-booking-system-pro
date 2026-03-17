import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-line-signature",
};

function jsonRes(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const base64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return base64 === signature;
}

async function sendReplyMessage(token: string, replyToken: string, text: string) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
}

async function sendPushMessage(token: string, userId: string, text: string) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: "text", text }],
    }),
  });
  if (!res.ok) {
    console.error("Failed to send LINE push:", await res.text());
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+08:00");
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return `${dateStr}（${weekdays[d.getDay()]}）`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. 擷取 Store ID
  const url = new URL(req.url);
  const storeId = url.searchParams.get("store_id");
  if (!storeId || !storeId.trim()) {
    return jsonRes({ error: "Missing store_id in URL" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 2. 動態抓取憑證
  const { data: configRows } = await supabase
    .from("system_config")
    .select("key, value")
    .eq("store_id", storeId)
    .in("key", ["line_channel_secret", "line_channel_token"]);
  const config: Record<string, string> = {};
  (configRows || []).forEach((r: { key: string; value: string }) => { config[r.key] = (r.value || "").trim(); });
  const LINE_CHANNEL_SECRET = config.line_channel_secret;
  const LINE_CHANNEL_ACCESS_TOKEN = config.line_channel_token;

  if (!LINE_CHANNEL_SECRET || !LINE_CHANNEL_ACCESS_TOKEN) {
    return jsonRes({ error: "LINE credentials not configured for this store" }, 400);
  }

  const bodyText = await req.text();
  const signature = req.headers.get("x-line-signature") || "";

  // 3. 簽章驗證（使用該店專屬 Secret）
  const valid = await verifySignature(bodyText, signature, LINE_CHANNEL_SECRET);
  if (!valid) {
    console.error("Invalid LINE signature");
    return jsonRes({ error: "Invalid signature" }, 401);
  }

  try {
    const body = JSON.parse(bodyText);
    const events = body.events || [];

    // 預約頁網址（從後台設定讀取，需加 store_id）
    const { data: bookingUrlRow } = await supabase
      .from("system_config")
      .select("value")
      .eq("store_id", storeId)
      .eq("key", "booking_page_url")
      .maybeSingle();
    const bookingPageUrl = (bookingUrlRow?.value || "").trim();
    const bookingPrompt = bookingPageUrl
      ? `\n\n📅 立即預約：${bookingPageUrl}`
      : "\n\n歡迎至官網預約！";

    for (const event of events) {
      const lineUserId = event.source?.userId;
      if (!lineUserId) continue;

      console.log(`LINE event: ${event.type}, userId: ${lineUserId}, storeId: ${storeId}`);

      // === FOLLOW EVENT ===
      if (event.type === "follow") {
        const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
          headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
        });

        let displayName = "";
        if (profileRes.ok) {
          const profile = await profileRes.json();
          displayName = profile.displayName || "";
        }

        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("store_id", storeId)
          .eq("line_id", lineUserId)
          .maybeSingle();

        if (!existing) {
          console.log(`New LINE follower: ${displayName} (${lineUserId})`);
          if (event.replyToken) {
            await sendReplyMessage(LINE_CHANNEL_ACCESS_TOKEN, event.replyToken,
              `您好 ${displayName}！歡迎加入 🙌\n\n請輸入您的「手機號碼」以綁定帳號，之後就能收到預約提醒和專屬優惠唷！\n\n例如：0912345678${bookingPrompt}`
            );
          }
        } else {
          if (event.replyToken) {
            await sendReplyMessage(LINE_CHANNEL_ACCESS_TOKEN, event.replyToken,
              `歡迎回來！您的帳號已綁定，之後會收到預約提醒和專屬訊息 😊\n\n輸入「查詢」可查看預約\n輸入「取消」可取消預約${bookingPrompt}`
            );
          }
        }
        continue;
      }

      // === MESSAGE EVENT ===
      if (event.type === "message" && event.message?.type === "text") {
        const text = (event.message.text || "").trim();
        const replyToken = event.replyToken;

        // --- Phone number binding ---
        const phoneMatch = text.match(/^(09\d{8})$/);
        if (phoneMatch) {
          const phone = phoneMatch[1];
          const { data: customer } = await supabase
            .from("customers")
            .select("id, name, line_id")
            .eq("store_id", storeId)
            .eq("phone", phone)
            .maybeSingle();

          if (customer) {
            if (customer.line_id && customer.line_id !== lineUserId) {
              if (replyToken) await sendReplyMessage(LINE_CHANNEL_ACCESS_TOKEN, replyToken,
                `此電話號碼已綁定其他 LINE 帳號，若有疑問請聯繫我們 🙏`
              );
            } else {
              await supabase.from("customers").update({ line_id: lineUserId }).eq("id", customer.id).eq("store_id", storeId);
              if (replyToken) await sendReplyMessage(LINE_CHANNEL_ACCESS_TOKEN, replyToken,
                `✅ 綁定成功！\n\n${customer.name} 您好，您的帳號已與 LINE 綁定完成！\n之後預約提醒和優惠訊息都會透過這裡通知您 😊\n\n輸入「查詢」可查看預約\n輸入「取消」可取消預約${bookingPrompt}`
              );
              console.log(`Bound LINE ${lineUserId} to customer ${customer.name} (${phone})`);
            }
          } else {
            if (replyToken) await sendReplyMessage(LINE_CHANNEL_ACCESS_TOKEN, replyToken,
              `找不到此手機號碼的預約紀錄 😅\n請確認號碼是否正確，或先透過線上預約建立帳號後再來綁定！${bookingPrompt}`
            );
          }
          continue;
        }

        // --- Command: 查詢 / 我的預約 ---
        if (/^(查詢|我的預約|預約)$/.test(text)) {
          const { data: customer } = await supabase
            .from("customers")
            .select("id, name, phone")
            .eq("store_id", storeId)
            .eq("line_id", lineUserId)
            .maybeSingle();

          if (!customer) {
            if (replyToken) await sendReplyMessage(LINE_CHANNEL_ACCESS_TOKEN, replyToken,
              `您尚未綁定帳號，請先輸入手機號碼進行綁定 📱\n\n例如：0912345678`
            );
            continue;
          }

          const today = new Date();
          const taipeiOffset = 8 * 60 * 60 * 1000;
          const taipeiToday = new Date(today.getTime() + taipeiOffset);
          const todayStr = taipeiToday.toISOString().slice(0, 10);

          const { data: bookings } = await supabase
            .from("bookings")
            .select("id, date, start_time_str, service, duration")
            .eq("store_id", storeId)
            .eq("phone", customer.phone)
            .gte("date", todayStr)
            .is("cancelled_at", null)
            .order("date", { ascending: true })
            .order("start_hour", { ascending: true })
            .limit(10);

          if (!bookings || bookings.length === 0) {
            if (replyToken) await sendReplyMessage(LINE_CHANNEL_ACCESS_TOKEN, replyToken,
              `${customer.name} 您好，目前沒有未來的預約紀錄 📋${bookingPrompt}`
            );
          } else {
            const lines = bookings.map((b, i) =>
              `${i + 1}. ${formatDate(b.date)} ${b.start_time_str}\n   ${b.service}（${b.duration}分鐘）`
            );
            if (replyToken) await sendReplyMessage(LINE_CHANNEL_ACCESS_TOKEN, replyToken,
              `${customer.name} 的預約：\n\n${lines.join("\n\n")}\n\n如需取消，請輸入「取消」`
            );
          }
          continue;
        }

        // --- Command: 取消 ---
        if (/^取消$/.test(text)) {
          const { data: customer } = await supabase
            .from("customers")
            .select("id, name, phone")
            .eq("store_id", storeId)
            .eq("line_id", lineUserId)
            .maybeSingle();

          if (!customer) {
            if (replyToken) await sendReplyMessage(LINE_CHANNEL_ACCESS_TOKEN, replyToken,
              `您尚未綁定帳號，請先輸入手機號碼進行綁定 📱`
            );
            continue;
          }

          const today = new Date();
          const taipeiOffset = 8 * 60 * 60 * 1000;
          const taipeiToday = new Date(today.getTime() + taipeiOffset);
          const todayStr = taipeiToday.toISOString().slice(0, 10);

          const { data: bookings } = await supabase
            .from("bookings")
            .select("id, date, start_time_str, service")
            .eq("store_id", storeId)
            .eq("phone", customer.phone)
            .gt("date", todayStr)
            .is("cancelled_at", null)
            .order("date", { ascending: true })
            .order("start_hour", { ascending: true })
            .limit(10);

          if (!bookings || bookings.length === 0) {
            if (replyToken) await sendReplyMessage(LINE_CHANNEL_ACCESS_TOKEN, replyToken,
              `目前沒有可取消的預約`
            );
          } else {
            const lines = bookings.map((b, i) =>
              `${i + 1}. ${formatDate(b.date)} ${b.start_time_str} ${b.service}`
            );
            if (replyToken) await sendReplyMessage(LINE_CHANNEL_ACCESS_TOKEN, replyToken,
              `請回覆要取消的編號：\n\n${lines.join("\n")}\n\n例如輸入「取消 1」`
            );
          }
          continue;
        }

        // --- Command: 取消 N ---
        const cancelMatch = text.match(/^取消\s*(\d+)$/);
        if (cancelMatch) {
          const cancelIndex = parseInt(cancelMatch[1]) - 1;

          const { data: customer } = await supabase
            .from("customers")
            .select("id, name, phone")
            .eq("store_id", storeId)
            .eq("line_id", lineUserId)
            .maybeSingle();

          if (!customer) {
            if (replyToken) await sendReplyMessage(LINE_CHANNEL_ACCESS_TOKEN, replyToken,
              `您尚未綁定帳號，請先輸入手機號碼 📱`
            );
            continue;
          }

          const today = new Date();
          const taipeiOffset = 8 * 60 * 60 * 1000;
          const taipeiToday = new Date(today.getTime() + taipeiOffset);
          const todayStr = taipeiToday.toISOString().slice(0, 10);

          const { data: bookings } = await supabase
            .from("bookings")
            .select("id, date, start_time_str, service, google_calendar_event_id")
            .eq("store_id", storeId)
            .eq("phone", customer.phone)
            .gt("date", todayStr)
            .is("cancelled_at", null)
            .order("date", { ascending: true })
            .order("start_hour", { ascending: true })
            .limit(10);

          if (!bookings || cancelIndex < 0 || cancelIndex >= bookings.length) {
            if (replyToken) await sendReplyMessage(LINE_CHANNEL_ACCESS_TOKEN, replyToken,
              `無效的編號，請先輸入「取消」查看可取消的預約`
            );
            continue;
          }

          const target = bookings[cancelIndex];

          const { error: cancelError } = await supabase
            .from("bookings")
            .update({ cancelled_at: new Date().toISOString(), status: "cancelled", cancel_reason: "LINE 自行取消" })
            .eq("id", target.id)
            .eq("store_id", storeId);

          if (cancelError) {
            if (replyToken) await sendReplyMessage(LINE_CHANNEL_ACCESS_TOKEN, replyToken,
              `取消失敗，請稍後再試或聯繫我們`
            );
            continue;
          }

          if (target.google_calendar_event_id) {
            try {
              await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-sync`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
                body: JSON.stringify({ action: "cancel", booking: target }),
              });
            } catch (e) { console.error("Calendar cancel sync error:", e); }
          }

          if (replyToken) await sendReplyMessage(LINE_CHANNEL_ACCESS_TOKEN, replyToken,
            `✅ 已取消預約\n\n${formatDate(target.date)} ${target.start_time_str}\n${target.service}\n\n如需重新預約，${bookingPageUrl ? `立即預約：${bookingPageUrl}` : "歡迎至官網預約！"}`
          );
          continue;
        }

        // --- Unknown command: show help ---
        if (replyToken) {
          await sendReplyMessage(LINE_CHANNEL_ACCESS_TOKEN, replyToken,
            `您好！您可以輸入以下指令：\n\n📋 「查詢」— 查看未來預約\n❌ 「取消」— 取消預約\n📱 手機號碼 — 綁定帳號${bookingPrompt}\n\n例如：查詢`
          );
        }
      }
    }

    return jsonRes({ success: true }, 200);
  } catch (err) {
    console.error("LINE webhook error:", err);
    return jsonRes({ error: "Internal error" }, 500);
  }
});
