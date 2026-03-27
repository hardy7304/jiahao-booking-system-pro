/**
 * 主師傅以 CMS（Landing）調理師區標題為準，與 coaches.name 全字比對。
 * 若比對不到，再用後台 system_config 的 therapist_name；最後才用排序第一位。
 * 支援模糊比對：若全字比對無結果，會嘗試部分匹配（去掉「師傅」「教練」等後綴）。
 */
export function resolveMainCoachFromCoachRows(
  coaches: Array<{ id: string; name: string; display_order: number }>,
  cmsTherapistTitle: string,
  systemTherapistName?: string,
): { id: string; name: string } | null {
  const norm = (s: string) => s.trim();
  const sorted = [...coaches].sort((a, b) => a.display_order - b.display_order);
  if (sorted.length === 0) return null;

  // 去掉常見後綴以取得核心名稱
  const stripSuffix = (s: string) => s.replace(/(師傅|教練|老師|師|大師)$/g, "").trim();

  const tryMatch = (label: string) => {
    const t = norm(label);
    if (!t) return null;
    // 1. 精確比對
    const exact = sorted.find((c) => norm(c.name) === t);
    if (exact) return { id: exact.id, name: exact.name };
    // 2. 模糊比對：去後綴比較核心名稱
    const core = stripSuffix(t);
    if (core) {
      const fuzzy = sorted.find((c) => stripSuffix(norm(c.name)) === core);
      if (fuzzy) return { id: fuzzy.id, name: fuzzy.name };
      // 3. 包含比對
      const partial = sorted.find((c) => norm(c.name).includes(core) || core.includes(stripSuffix(norm(c.name))));
      if (partial) return { id: partial.id, name: partial.name };
    }
    return null;
  };

  return (
    tryMatch(cmsTherapistTitle) ||
    tryMatch(systemTherapistName || "") ||
    (sorted[0] ? { id: sorted[0].id, name: sorted[0].name } : null)
  );
}
