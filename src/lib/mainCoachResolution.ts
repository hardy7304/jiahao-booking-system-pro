/**
 * 主師傅以 CMS（Landing）調理師區標題為準，與 coaches.name 全字比對。
 * 若比對不到，再用後台 system_config 的 therapist_name；最後才用排序第一位。
 */
export function resolveMainCoachFromCoachRows(
  coaches: Array<{ id: string; name: string; display_order: number }>,
  cmsTherapistTitle: string,
  systemTherapistName?: string,
): { id: string; name: string } | null {
  const norm = (s: string) => s.trim();
  const sorted = [...coaches].sort((a, b) => a.display_order - b.display_order);
  if (sorted.length === 0) return null;

  const tryMatch = (label: string) => {
    const t = norm(label);
    if (!t) return null;
    const hit = sorted.find((c) => norm(c.name) === t);
    return hit ? { id: hit.id, name: hit.name } : null;
  };

  return (
    tryMatch(cmsTherapistTitle) ||
    tryMatch(systemTherapistName || "") ||
    (sorted[0] ? { id: sorted[0].id, name: sorted[0].name } : null)
  );
}
