const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function adminApi(action: string, data: Record<string, any> = {}) {
  const password = sessionStorage.getItem("admin_password") || "";
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/api-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, password, ...data }),
  });
  const result = await resp.json();
  if (!resp.ok) throw new Error(result.error || "操作失敗");
  return result;
}
