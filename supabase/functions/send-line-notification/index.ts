import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatBookingMessage(
  type: "booking_confirmed" | "booking_cancelled" | "booking_reminder",
  booking: Record<string, unknown>,
): string {
  const date = String(booking.date || "");
  const time = String(booking.start_time_str || "");
  const service = String(booking.service || "");
  const name = String(booking.name || "顧客");

  switch (type) {
    case "booking_confirmed":
      return [
        `${name} 您好，預約成功！`,
        "",
        `日期：${date}`,
        `時間：${time}`,
        `服務：${service}`,
        "",
        `如需查詢或取消，請輸入「查詢」或「取消」`,
      ].join("\n");

    case "booking_cancelled": {
      const cancelReason = String(booking.cancel_reason || "");
      const lines = [
        `${name} 您好，您的預約已取消`,
        "",
        `日期：${date}`,
        `時間：${time}`,
        `服務：${service}`,
      ];
      if (cancelReason) {
        lines.push(`取消原因：${cancelReason}`);
      }
      lines.push("", `如需重新預約，歡迎至官網預約頁面`);
      return lines.join("\n");
    }

    case "booking_reminder":
      return [
        `${name} 您好，明日預約提醒`,
        "",
        `日期：${date}`,
        `時間：${time}`,
        `服務：${service}`,
        "",
        `期待您的到來！如需取消請輸入「取消」`,
      ].join("\n");

    default:
      return `您有一則來自預約系統的通知`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    return jsonRes({ error: "LINE_CHANNEL_ACCESS_TOKEN not configured" }, 500);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const {
      type,
      phone,
      booking,
      store_id: bodyStoreId,
    }: {
      type: "booking_confirmed" | "booking_cancelled" | "booking_reminder";
      phone: string;
      booking: Record<string, unknown>;
      store_id?: string;
    } = body;

    if (!type || !phone) {
      return jsonRes({ error: "Missing type or phone" }, 400);
    }

    const storeId = bodyStoreId ?? (booking?.store_id as string | undefined);

    // 0. 老闆預約通知（booking_confirmed 或 booking_cancelled）
    if ((type === "booking_confirmed" || type === "booking_cancelled") && storeId) {
      const { data: configRows } = await supabase
        .from("system_config")
        .select("key, value")
        .eq("store_id", storeId)
        .in("key", ["line_channel_token", "line_admin_user_id", "store_name"]);
      const config: Record<string, string> = {};
      (configRows || []).forEach((r: { key: string; value: string }) => { config[r.key] = r.value; });
      const lineChannelToken = (config.line_channel_token || "").trim() || LINE_CHANNEL_ACCESS_TOKEN;
      const lineAdminUserId = (config.line_admin_user_id || "").trim();
      const storeName = config.store_name || "店家";
      if (lineChannelToken && lineAdminUserId) {
        const customer = String(booking?.name || "顧客");
        const time = String(booking?.start_time_str || "");
        
        let adminMsg = "";
        if (type === "booking_cancelled") {
          const reason = booking?.cancel_reason ? ` (原因：${booking.cancel_reason})` : "";
          adminMsg = `❌ ${storeName} 取消通知：${customer} ${time}${reason}`;
        } else {
          adminMsg = `🎉 ${storeName} 新預約：${customer} ${time}`;
        }
        
        try {
          await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lineChannelToken}`,
            },
            body: JSON.stringify({
              to: lineAdminUserId,
              messages: [{ type: "text", text: adminMsg }],
            }),
          });
        } catch (e) {
          console.error("LINE admin notify error:", e);
        }
      }
    }

    // 1. Look up customer
    const { data: customer } = await supabase
      .from("customers")
      .select("id, line_id, visit_count, is_blacklisted")
      .eq("phone", phone)
      .maybeSingle();

    if (!customer?.line_id) {
      return jsonRes({ skipped: true, reason: "no_line_id" });
    }

    if (customer.is_blacklisted) {
      return jsonRes({ skipped: true, reason: "blacklisted" });
    }

    // 2. Check VIP-only setting
    const { data: vipOnlyRow } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "line_notify_vip_only")
      .maybeSingle();
    const vipOnly = vipOnlyRow?.value === "true";

    if (vipOnly) {
      const visitCount = customer.visit_count || 0;

      // Also check for VIP tag
      const { data: tags } = await supabase
        .from("customer_tags")
        .select("tag")
        .eq("customer_id", customer.id);
      const hasVipTag = (tags || []).some(
        (t: { tag: string }) => t.tag === "VIP" || t.tag === "常客",
      );

      if (visitCount < 5 && !hasVipTag) {
        return jsonRes({ skipped: true, reason: "not_vip" });
      }
    }

    // 3. Check monthly quota
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: sentThisMonth } = await supabase
      .from("line_message_log")
      .select("id", { count: "exact", head: true })
      .eq("cost_counted", true)
      .eq("success", true)
      .gte("sent_at", monthStart);

    const { data: quotaRow } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "line_monthly_quota")
      .maybeSingle();
    const monthlyQuota = parseInt(quotaRow?.value || "200") || 200;

    const { data: thresholdRow } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "line_quota_alert_threshold")
      .maybeSingle();
    const alertThreshold = parseInt(thresholdRow?.value || "180") || 180;

    const used = sentThisMonth ?? 0;

    if (used >= monthlyQuota) {
      await supabase.from("line_message_log").insert({
        customer_phone: phone,
        line_user_id: customer.line_id,
        message_type: type,
        booking_id: (booking?.id as string) || null,
        success: false,
        cost_counted: false,
        error_message: `quota_exceeded (${used}/${monthlyQuota})`,
      });
      console.warn(`LINE quota exceeded: ${used}/${monthlyQuota}`);
      return jsonRes({ skipped: true, reason: "quota_exceeded", used, quota: monthlyQuota });
    }

    if (used >= alertThreshold) {
      console.warn(`LINE quota alert: ${used}/${monthlyQuota} (threshold: ${alertThreshold})`);
    }

    // 4. Send LINE push message
    const message = formatBookingMessage(type, booking || {});

    const lineRes = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: customer.line_id,
        messages: [{ type: "text", text: message }],
      }),
    });

    const success = lineRes.ok;
    let errorMessage: string | null = null;
    if (!success) {
      errorMessage = await lineRes.text();
      console.error("LINE push failed:", errorMessage);
    }

    // 5. Log the message
    await supabase.from("line_message_log").insert({
      customer_phone: phone,
      line_user_id: customer.line_id,
      message_type: type,
      booking_id: (booking?.id as string) || null,
      success,
      cost_counted: true,
      error_message: errorMessage,
    });

    return jsonRes({ ok: success, type, used: used + 1, quota: monthlyQuota });
  } catch (err) {
    console.error("send-line-notification error:", err);
    return jsonRes({ error: (err as Error).message }, 500);
  }
});
