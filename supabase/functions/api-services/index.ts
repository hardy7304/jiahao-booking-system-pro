import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [{ data: services }, { data: addons }] = await Promise.all([
      supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("addons").select("*").eq("is_active", true).order("sort_order"),
    ]);

    const regularAddons = (addons || []).filter((a: any) => a.addon_type !== "精油香味");
    const aromas = (addons || []).filter((a: any) => a.addon_type === "精油香味");

    return new Response(
      JSON.stringify({
        services: services || [],
        addons: regularAddons,
        aromas,
        business_hours: { open: 14, close: 26, timezone: "Asia/Taipei" },
      }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
