import { supabaseUrl } from "@/integrations/supabase/client";

export type AdminApiResult = Record<string, unknown>;

export async function adminApi(
  action: string,
  data: Record<string, unknown>,
  storeId: string,
): Promise<AdminApiResult> {
  const password = sessionStorage.getItem("admin_password") ?? "";
  const body: Record<string, unknown> = {
    action,
    password,
    store_id: storeId,
    ...data,
  };
  const resp = await fetch(`${supabaseUrl}/functions/v1/api-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result: unknown = await resp.json();
  if (!resp.ok) {
    const errObj = result as Record<string, unknown>;
    const msg = errObj.error;
    throw new Error(typeof msg === "string" ? msg : "操作失敗");
  }
  return result as AdminApiResult;
}
