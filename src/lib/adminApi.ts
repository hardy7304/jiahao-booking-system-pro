import { supabaseUrl } from "@/integrations/supabase/client";

export async function adminApi(action: string, data: Record<string, any> = {}, storeId?: string) {
  const password = sessionStorage.getItem("admin_password") || "";
  const body: Record<string, any> = { action, password, ...data };
  if (storeId) body.store_id = storeId;
  const resp = await fetch(`${supabaseUrl}/functions/v1/api-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await resp.json();
  if (!resp.ok) throw new Error(result.error || "操作失敗");
  return result;
}
