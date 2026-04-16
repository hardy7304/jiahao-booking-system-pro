/** 從店名產生建議 slug（英數與連字號）；純中文等無法轉成英數時改為 store-xxx */
export function suggestStoreSlug(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const lowered = trimmed.toLowerCase();
  const ascii = lowered
    .normalize("NFKC")
    .replace(/[''`]/g, "")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (ascii.length >= 1) return ascii.slice(0, 48);
  return `store-${Date.now().toString(36)}`;
}
