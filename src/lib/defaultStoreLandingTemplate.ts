/**
 * 新店家預設 Landing 內容由 Edge Function `api-admin`（action: initialize_store_settings）
 * 寫入；實作與佔位符邏輯位於 `supabase/functions/_shared/defaultStoreLandingTemplate.ts`。
 */
export const DEFAULT_LANDING_PLACEHOLDER_STORE = "[店名]";
export const DEFAULT_LANDING_PLACEHOLDER_SERVICE = "[服務名稱]";
