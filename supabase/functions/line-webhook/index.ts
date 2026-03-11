import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-line-signature",
};

// HMAC-SHA256 signature verification for LINE webhook
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const base64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return base64 === signature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LINE_CHANNEL_SECRET = Deno.env.get("LINE_CHANNEL_SECRET");
  const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");

  if (!LINE_CHANNEL_SECRET || !LINE_CHANNEL_ACCESS_TOKEN) {
    console.error("Missing LINE secrets");
    return new Response(JSON.stringify({ error: "LINE secrets not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const bodyText = await req.text();

    // Verify LINE signature
    const signature = req.headers.get("x-line-signature") || "";
    const valid = await verifySignature(bodyText, signature, LINE_CHANNEL_SECRET);
    if (!valid) {
      console.error("Invalid LINE signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(bodyText);
    const events = body.events || [];

    for (const event of events) {
      const lineUserId = event.source?.userId;
      if (!lineUserId) continue;

      console.log(`LINE event: ${event.type}, userId: ${lineUserId}`);

      if (event.type === "follow") {
        // User added the bot as friend - get their profile
        const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
          headers: { "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
        });

        let displayName = "";
        if (profileRes.ok) {
          const profile = await profileRes.json();
          displayName = profile.displayName || "";
        }

        // Try to find existing customer with this LINE User ID
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("line_id", lineUserId)
          .maybeSingle();

        if (!existing) {
          // Store as unlinked - will be linked when customer provides phone
          console.log(`New LINE follower: ${displayName} (${lineUserId}) - no customer match yet`);
          
          // Send welcome message
          await sendLineMessage(LINE_CHANNEL_ACCESS_TOKEN, lineUserId, 
            `您好 ${displayName}！歡迎加入 🙌\n\n請輸入您的「手機號碼」以綁定帳號，之後就能收到預約提醒和專屬優惠唷！\n\n例如：0912345678`
          );
        } else {
          await sendLineMessage(LINE_CHANNEL_ACCESS_TOKEN, lineUserId,
            `歡迎回來！您的帳號已綁定，之後會收到預約提醒和專屬訊息 😊`
          );
        }
      }

      if (event.type === "message" && event.message?.type === "text") {
        const text = (event.message.text || "").trim();

        // Check if message looks like a phone number (Taiwan format)
        const phoneMatch = text.match(/^(09\d{8})$/);
        if (phoneMatch) {
          const phone = phoneMatch[1];

          // Try to bind LINE User ID to customer
          const { data: customer } = await supabase
            .from("customers")
            .select("id, name, line_id")
            .eq("phone", phone)
            .maybeSingle();

          if (customer) {
            if (customer.line_id && customer.line_id !== lineUserId) {
              await sendLineMessage(LINE_CHANNEL_ACCESS_TOKEN, lineUserId,
                `此電話號碼已綁定其他 LINE 帳號，若有疑問請聯繫我們 🙏`
              );
            } else {
              // Bind LINE User ID
              await supabase
                .from("customers")
                .update({ line_id: lineUserId })
                .eq("id", customer.id);

              await sendLineMessage(LINE_CHANNEL_ACCESS_TOKEN, lineUserId,
                `✅ 綁定成功！\n\n${customer.name} 您好，您的帳號已與 LINE 綁定完成！\n之後預約提醒和優惠訊息都會透過這裡通知您 😊`
              );
              console.log(`Bound LINE ${lineUserId} to customer ${customer.name} (${phone})`);
            }
          } else {
            await sendLineMessage(LINE_CHANNEL_ACCESS_TOKEN, lineUserId,
              `找不到此手機號碼的預約紀錄 😅\n請確認號碼是否正確，或先透過線上預約建立帳號後再來綁定！`
            );
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("LINE webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendLineMessage(token: string, userId: string, text: string) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: "text", text }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to send LINE message: ${err}`);
  }
}
