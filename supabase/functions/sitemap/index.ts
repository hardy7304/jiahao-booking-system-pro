import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_ORIGIN = "https://booking.tainanboxing.com";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toLastmodDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

function xmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return new Response("Sitemap: missing Supabase env", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const supabase = createClient(url, key);

  const { data: rows, error } = await supabase
    .from("stores")
    .select("slug, updated_at, created_at")
    .eq("is_active", true)
    .order("slug");

  if (error) {
    return new Response(`Sitemap query error: ${error.message}`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const urls: string[] = [];

  urls.push(`  <url>
    <loc>${escapeXml(`${SITE_ORIGIN}/`)}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

  for (const row of rows ?? []) {
    const slug = typeof row.slug === "string" ? row.slug.trim() : "";
    if (!slug) continue;
    const lastmod =
      toLastmodDate(row.updated_at as string | null) ??
      toLastmodDate(row.created_at as string | null);
    const loc = `${SITE_ORIGIN}/s/${encodeURIComponent(slug)}`;
    const lastmodLine = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
    urls.push(`  <url>
    <loc>${escapeXml(loc)}</loc>${lastmodLine}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

  if (req.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  return xmlResponse(xml);
});
