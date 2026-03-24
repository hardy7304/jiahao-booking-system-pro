import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useCommission } from "@/hooks/useCommission";
import { adminApi } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Save, X, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { AdminLandingImageField } from "@/components/admin/AdminLandingImageField";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface ServiceRow {
  id: string;
  name: string;
  duration: number;
  price: number;
  category: string;
  is_active: boolean;
  sort_order: number;
  deduction: number;
}

interface AddonRow {
  id: string;
  name: string;
  extra_duration: number;
  extra_price: number;
  deduction: number;
  applicable_categories: string[];
  addon_type: string;
  is_active: boolean;
  sort_order: number;
}

interface CoachRow {
  id: string;
  name: string;
  phone: string | null;
  specialty: string | null;
  is_active: boolean;
  available_today: boolean;
  shift_start_hour: number;
  shift_end_hour: number;
  display_order: number;
  landing_visible: boolean;
  portrait_url: string | null;
  created_at: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  foot: "腳底按摩",
  body: "全身指壓",
  "fascia-foot": "筋膜刀腳底",
  "fascia-body": "筋膜刀身體",
  "fascia-neck": "筋膜刀肩頸",
  combo: "深層雙拼",
  package: "套餐",
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS);

const ADDON_TYPE_OPTIONS = ["加購", "升級", "精油香味"];

const APPLICABLE_CAT_OPTIONS = [
  { value: "foot", label: "腳底按摩" },
  { value: "body", label: "全身指壓" },
  { value: "fascia-foot", label: "筋膜刀腳底" },
  { value: "fascia-body", label: "筋膜刀身體" },
  { value: "fascia-neck", label: "筋膜刀肩頸" },
  { value: "combo", label: "深層雙拼" },
  { value: "package", label: "套餐" },
];

/** 店內預約軸：24+ 表示隔日凌晨（26 = 隔日 02:00）；內部仍存數字，畫面只顯示鐘點 */
function formatCoachShiftEndpoint(hour: number): string {
  const h = Number(hour);
  if (!Number.isFinite(h)) return "—";
  if (h >= 24) {
    const sub = h - 24;
    return `${String(Math.floor(sub)).padStart(2, "0")}:00（隔日）`;
  }
  return `${String(Math.floor(h)).padStart(2, "0")}:00`;
}

const COACH_SHIFT_HOUR_OPTIONS: { value: string; label: string }[] = (() => {
  const out: { value: string; label: string }[] = [];
  for (let n = 10; n <= 26; n += 1) {
    out.push({ value: String(n), label: formatCoachShiftEndpoint(n) });
  }
  return out;
})();

function CoachShiftHourSelect({
  value,
  onChange,
  id,
}: {
  value: number;
  onChange: (n: number) => void;
  id?: string;
}) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-[min(50vh,280px)]">
        {COACH_SHIFT_HOUR_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function ServiceManagement({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const { storeId } = useStore();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [addons, setAddons] = useState<AddonRow[]>([]);
  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const { commissionRate } = useCommission();
  const [editingService, setEditingService] = useState<ServiceRow | null>(null);
  const [editingAddon, setEditingAddon] = useState<AddonRow | null>(null);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showAddonDialog, setShowAddonDialog] = useState(false);
  const [showCoachDialog, setShowCoachDialog] = useState(false);
  const [editingCoach, setEditingCoach] = useState<CoachRow | null>(null);
  const [newService, setNewService] = useState({ name: "", duration: 60, price: 1000, category: "foot", is_active: true, deduction: 0 });
  const [newAddon, setNewAddon] = useState({ name: "", extra_duration: 0, extra_price: 0, deduction: 0, applicable_categories: [] as string[], addon_type: "加購", is_active: true });
  const [newCoach, setNewCoach] = useState({
    name: "",
    phone: "",
    specialty: "",
    is_active: true,
    available_today: false,
    shift_start_hour: 14,
    shift_end_hour: 26,
    landing_visible: false,
    portrait_url: "",
  });
  const [coachPortraitColumnReady, setCoachPortraitColumnReady] = useState(true);
  const [coachShiftColumnsReady, setCoachShiftColumnsReady] = useState(true);

  const toNonNegativeInt = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (!digitsOnly) return 0;
    return parseInt(digitsOnly, 10);
  };

  const fetchAll = async () => {
    const [{ data: s }, { data: a }] = await Promise.all([
      supabase.from("services").select("*").eq("store_id", storeId).order("sort_order"),
      supabase.from("addons").select("*").eq("store_id", storeId).order("sort_order"),
    ]);
    let c: CoachRow[] | null = null;
    const withPortrait = await supabase
      .from("coaches")
      .select("id,name,phone,specialty,is_active,available_today,shift_start_hour,shift_end_hour,display_order,landing_visible,portrait_url,created_at")
      .eq("store_id", storeId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (
      withPortrait.error?.message?.includes("portrait_url") ||
      withPortrait.error?.message?.includes("shift_start_hour")
    ) {
      if (withPortrait.error?.message?.includes("shift_start_hour")) {
        setCoachShiftColumnsReady(false);
      } else {
        setCoachShiftColumnsReady(true);
      }
      setCoachPortraitColumnReady(false);
      const fallback = await supabase
        .from("coaches")
        .select("id,name,phone,specialty,is_active,available_today,display_order,landing_visible,created_at")
        .eq("store_id", storeId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (fallback.data) {
        c = (fallback.data as Array<Omit<CoachRow, "portrait_url">>).map((x) => ({
          ...x,
          portrait_url: null,
          shift_start_hour: 14,
          shift_end_hour: 26,
        })) as CoachRow[];
      }
    } else {
      setCoachPortraitColumnReady(true);
      setCoachShiftColumnsReady(true);
      if (withPortrait.data) c = withPortrait.data as CoachRow[];
    }
    if (s) setServices(s as ServiceRow[]);
    if (a) setAddons(a as AddonRow[]);
    if (c) setCoaches((c as CoachRow[]).map((x) => ({
      ...x,
      is_active: !!x.is_active,
      available_today: !!x.available_today,
      shift_start_hour: Number.isFinite(x.shift_start_hour) ? x.shift_start_hour : 14,
      shift_end_hour: Number.isFinite(x.shift_end_hour) ? x.shift_end_hour : 26,
      landing_visible: !!x.landing_visible,
      portrait_url: x.portrait_url || "",
      display_order: Number.isFinite(x.display_order) ? x.display_order : 100,
    })));
  };

  useEffect(() => { fetchAll(); }, [storeId]);

  const activeServiceCount = services.filter(s => s.is_active).length;
  const activeAddonCount = addons.filter(a => a.is_active).length;
  const activeCoachCount = coaches.filter((c) => c.is_active).length;

  const updateCoachField = async (coach: CoachRow, patch: Partial<CoachRow>) => {
    const prev = coaches;
    setCoaches((current) =>
      current.map((c) => (c.id === coach.id ? { ...c, ...patch } : c)),
    );
    const { error } = await supabase.from("coaches").update(patch).eq("id", coach.id).eq("store_id", storeId);
    if (error) {
      setCoaches(prev);
      toast.error(error.message);
      return;
    }
  };

  const toggleCoachActive = async (coach: CoachRow) => {
    if (coach.is_active && activeCoachCount <= 1) {
      toast.error("至少需保留一位啟用中的師傅");
      return;
    }
    await updateCoachField(coach, { is_active: !coach.is_active });
  };

  const moveCoach = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= coaches.length) return;
    const current = coaches[index];
    const next = coaches[target];
    const { error: errorA } = await supabase
      .from("coaches")
      .update({ display_order: next.display_order })
      .eq("id", current.id)
      .eq("store_id", storeId);
    const { error: errorB } = await supabase
      .from("coaches")
      .update({ display_order: current.display_order })
      .eq("id", next.id)
      .eq("store_id", storeId);
    if (errorA || errorB) {
      toast.error(errorA?.message || errorB?.message || "排序更新失敗");
      return;
    }
    await fetchAll();
  };

  const createCoach = async () => {
    if (!newCoach.name.trim()) {
      toast.error("請輸入師傅名稱");
      return;
    }
    const nextOrder =
      coaches.length > 0 ? Math.max(...coaches.map((c) => c.display_order || 0)) + 1 : 1;
    const payload: Record<string, unknown> = {
      store_id: storeId,
      name: newCoach.name.trim(),
      phone: newCoach.phone.trim() || null,
      specialty: newCoach.specialty.trim() || null,
      is_active: newCoach.is_active,
      available_today: newCoach.available_today,
      shift_start_hour: newCoach.shift_start_hour,
      shift_end_hour: newCoach.shift_end_hour,
      landing_visible: newCoach.landing_visible,
      display_order: nextOrder,
    };
    if (coachPortraitColumnReady) {
      payload.portrait_url = newCoach.portrait_url.trim() || null;
    }
    const { error } = await supabase.from("coaches").insert(payload);
    if (error) {
      if (error.message?.includes("portrait_url") || error.message?.includes("shift_start_hour")) {
        setCoachPortraitColumnReady(false);
        if (error.message?.includes("shift_start_hour")) {
          setCoachShiftColumnsReady(false);
          toast.error("資料庫尚未升級師傅時段欄位，已先用預設時段建立師傅。請稍後套用 migration。");
        } else {
          toast.error("資料庫尚未升級頭像欄位，先忽略頭像已可建立。請稍後套用 migration。");
        }
      } else {
        toast.error(error.message);
      }
      return;
    }
    setShowCoachDialog(false);
    setNewCoach({
      name: "",
      phone: "",
      specialty: "",
      is_active: true,
      available_today: false,
      shift_start_hour: 14,
      shift_end_hour: 26,
      landing_visible: false,
      portrait_url: "",
    });
    await fetchAll();
    toast.success("已新增搭配師傅");
  };

  const saveEditCoach = async () => {
    if (!editingCoach) return;
    const updatePayload: Record<string, unknown> = {
      name: editingCoach.name.trim(),
      phone: editingCoach.phone?.trim() || null,
      specialty: editingCoach.specialty?.trim() || null,
      is_active: editingCoach.is_active,
      available_today: editingCoach.available_today,
      shift_start_hour: editingCoach.shift_start_hour,
      shift_end_hour: editingCoach.shift_end_hour,
      landing_visible: editingCoach.landing_visible,
    };
    if (coachPortraitColumnReady) {
      updatePayload.portrait_url = editingCoach.portrait_url?.trim() || null;
    }
    const { error } = await supabase
      .from("coaches")
      .update(updatePayload)
      .eq("id", editingCoach.id)
      .eq("store_id", storeId);
    if (error) {
      if (error.message?.includes("portrait_url") || error.message?.includes("shift_start_hour")) {
        setCoachPortraitColumnReady(false);
        if (error.message?.includes("shift_start_hour")) {
          setCoachShiftColumnsReady(false);
          toast.error("資料庫尚未升級師傅時段欄位，已先忽略時段設定。請稍後套用 migration。");
        } else {
          toast.error("資料庫尚未升級頭像欄位，已先忽略頭像更新。請稍後套用 migration。");
        }
      } else {
        toast.error(error.message);
      }
      return;
    }
    setEditingCoach(null);
    await fetchAll();
    toast.success("已更新師傅資料");
  };

  const deleteCoach = async (coach: CoachRow) => {
    if (coach.is_active && activeCoachCount <= 1) {
      toast.error("至少需保留一位啟用中的師傅");
      return;
    }
    const { error } = await supabase.from("coaches").delete().eq("id", coach.id).eq("store_id", storeId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await fetchAll();
    toast.success("已刪除師傅");
  };

  // ===== Services CRUD =====
  const toggleServiceActive = async (s: ServiceRow) => {
    await adminApi("service.update", { service: { id: s.id, is_active: !s.is_active } }, storeId);
    fetchAll();
  };

  const deleteService = async (id: string) => {
    await adminApi("service.delete", { id }, storeId);
    fetchAll();
    toast.success("已刪除服務");
  };

  const saveEditService = async () => {
    if (!editingService) return;
    await adminApi("service.update", { service: editingService }, storeId);
    setEditingService(null);
    fetchAll();
    toast.success("已更新服務");
  };

  const createService = async () => {
    if (!newService.name.trim()) { toast.error("請輸入服務名稱"); return; }
    const maxOrder = services.length > 0 ? Math.max(...services.map(s => s.sort_order)) + 1 : 0;
    await adminApi("service.create", { service: { ...newService, sort_order: maxOrder, store_id: storeId } }, storeId);
    setShowServiceDialog(false);
    setNewService({ name: "", duration: 60, price: 1000, category: "foot", is_active: true, deduction: 0 });
    fetchAll();
    toast.success("已新增服務");
  };

  const updateDeduction = async (s: ServiceRow, val: number) => {
    await adminApi("service.update", { service: { id: s.id, deduction: val } }, storeId);
    setServices(prev => prev.map(x => x.id === s.id ? { ...x, deduction: val } : x));
    toast.success(`已更新「${s.name}」差價為 NT$${val}`);
  };

  const moveService = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= services.length) return;
    await Promise.all([
      adminApi("service.update", { service: { id: services[index].id, sort_order: services[target].sort_order } }, storeId),
      adminApi("service.update", { service: { id: services[target].id, sort_order: services[index].sort_order } }, storeId),
    ]);
    fetchAll();
  };

  // ===== Addons CRUD =====
  const toggleAddonActive = async (a: AddonRow) => {
    await adminApi("addon.update", { addon: { id: a.id, is_active: !a.is_active } }, storeId);
    fetchAll();
  };

  const deleteAddon = async (id: string) => {
    await adminApi("addon.delete", { id }, storeId);
    fetchAll();
    toast.success("已刪除加購項目");
  };

  const saveEditAddon = async () => {
    if (!editingAddon) return;
    await adminApi("addon.update", { addon: editingAddon }, storeId);
    setEditingAddon(null);
    fetchAll();
    toast.success("已更新加購項目");
  };

  const createAddon = async () => {
    if (!newAddon.name.trim()) { toast.error("請輸入加購名稱"); return; }
    const maxOrder = addons.length > 0 ? Math.max(...addons.map(a => a.sort_order)) + 1 : 0;
    await adminApi("addon.create", { addon: { ...newAddon, sort_order: maxOrder, store_id: storeId } }, storeId);
    setShowAddonDialog(false);
    setNewAddon({ name: "", extra_duration: 0, extra_price: 0, deduction: 0, applicable_categories: [], addon_type: "加購", is_active: true });
    fetchAll();
    toast.success("已新增加購項目");
  };

  const moveAddon = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= addons.length) return;
    await Promise.all([
      adminApi("addon.update", { addon: { id: addons[index].id, sort_order: addons[target].sort_order } }, storeId),
      adminApi("addon.update", { addon: { id: addons[target].id, sort_order: addons[index].sort_order } }, storeId),
    ]);
    fetchAll();
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex gap-3 flex-wrap">
        <Badge variant="secondary" className="text-sm px-3 py-1">{activeServiceCount} 個服務上架中</Badge>
        <Badge variant="secondary" className="text-sm px-3 py-1">{activeAddonCount} 個加購上架中</Badge>
        <Badge variant="secondary" className="text-sm px-3 py-1">{activeCoachCount} 位師傅啟用中</Badge>
      </div>

      {/* === Section 0: Coaches Quick Toggle === */}
      <div className="bg-card rounded-xl shadow p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-lg">可搭配師傅（快速調度）</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              此處皆為可搭配師傅；主師傅以 Landing/CMS「調理師區標題」為準，請讓該標題與某位師傅「姓名」完全一致。排序僅影響列表與前台顯示順序。
            </span>
            <Button size="sm" onClick={() => setShowCoachDialog(true)}>
              <Plus className="w-4 h-4 mr-1" /> 新增師傅
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="p-2 w-10"></th>
                <th className="text-left p-2">師傅</th>
                <th className="text-left p-2">專長</th>
                <th className="text-center p-2">啟用</th>
                <th className="text-center p-2">今日可接</th>
                <th className="text-center p-2">可接時段</th>
                <th className="text-center p-2">Landing 顯示</th>
                <th className="text-center p-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {coaches.map((c, i) => (
                <tr key={c.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="p-1">
                    <div className="flex flex-col items-center gap-0.5">
                      <button onClick={() => moveCoach(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button onClick={() => moveCoach(i, 1)} disabled={i === coaches.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    <span className="font-medium">{c.name}</span>
                    <div className="text-xs text-muted-foreground mt-1">{c.portrait_url ? "已設定頭像" : "未設定頭像"}</div>
                  </td>
                  <td className="p-2 text-muted-foreground">{c.specialty || "-"}</td>
                  <td className="p-2 text-center">
                    <div className="inline-flex items-center justify-center">
                      <Switch checked={c.is_active} onCheckedChange={() => toggleCoachActive(c)} />
                    </div>
                  </td>
                  <td className="p-2 text-center text-xs text-muted-foreground whitespace-nowrap">
                    {`${formatCoachShiftEndpoint(c.shift_start_hour)} → ${formatCoachShiftEndpoint(c.shift_end_hour)}`}
                  </td>
                  <td className="p-2 text-center">
                    <div className="inline-flex items-center justify-center">
                      <Switch
                        checked={c.available_today}
                        disabled={!c.is_active}
                        onCheckedChange={() =>
                          updateCoachField(c, { available_today: !c.available_today })
                        }
                      />
                    </div>
                  </td>
                  <td className="p-2 text-center">
                    <div className="inline-flex items-center justify-center">
                      <Switch
                        checked={c.landing_visible}
                        onCheckedChange={() =>
                          updateCoachField(c, { landing_visible: !c.landing_visible })
                        }
                      />
                    </div>
                  </td>
                  <td className="p-2 text-center">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="ghost" size="sm" title="編輯師傅" onClick={() => setEditingCoach({ ...c })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" title="刪除師傅">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>確認刪除師傅？</AlertDialogTitle>
                            <AlertDialogDescription>刪除「{c.name}」後無法復原。</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteCoach(c)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">確認刪除</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {coaches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted-foreground p-8">尚未建立師傅資料（可點右上「新增師傅」）</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showCoachDialog} onOpenChange={setShowCoachDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增搭配師傅</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm">師傅名稱</Label>
              <Input value={newCoach.name} onChange={(e) => setNewCoach({ ...newCoach, name: e.target.value })} placeholder="例：阿明師傅" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">電話（選填）</Label>
              <Input value={newCoach.phone} onChange={(e) => setNewCoach({ ...newCoach, phone: e.target.value })} placeholder="09xxxxxxxx" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">專長（選填）</Label>
              <Input value={newCoach.specialty} onChange={(e) => setNewCoach({ ...newCoach, specialty: e.target.value })} placeholder="例：筋膜刀、肩頸放鬆" />
            </div>
            <AdminLandingImageField
              storeId={typeof storeId === "string" ? storeId : ""}
              label="搭班師傅頭像（可上傳）"
              hint="可貼公開網址，或按上傳。"
              value={newCoach.portrait_url}
              onChange={(url) => setNewCoach({ ...newCoach, portrait_url: url })}
            />
            {!coachPortraitColumnReady ? (
              <p className="text-xs text-amber-600">目前資料庫尚未升級頭像欄位，圖片將暫不寫入。</p>
            ) : null}
            <div className="flex items-center gap-2">
              <Switch checked={newCoach.is_active} onCheckedChange={(v) => setNewCoach({ ...newCoach, is_active: v })} />
              <Label className="text-sm">啟用</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newCoach.available_today} onCheckedChange={(v) => setNewCoach({ ...newCoach, available_today: v })} />
              <Label className="text-sm">今日可接</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">可接開始</Label>
                <CoachShiftHourSelect
                  value={newCoach.shift_start_hour}
                  onChange={(n) => setNewCoach({ ...newCoach, shift_start_hour: n })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">可接結束</Label>
                <CoachShiftHourSelect
                  value={newCoach.shift_end_hour}
                  onChange={(n) => setNewCoach({ ...newCoach, shift_end_hour: n })}
                />
              </div>
            </div>
            {!coachShiftColumnsReady ? (
              <p className="text-xs text-amber-600">目前資料庫尚未升級時段欄位，暫用預設 14:00～02:00（隔日）。</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                選「02:00（隔日）」代表營業至凌晨 2 點；早班例如 10:00～22:00 請分別選開始與結束。
              </p>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={newCoach.landing_visible} onCheckedChange={(v) => setNewCoach({ ...newCoach, landing_visible: v })} />
              <Label className="text-sm">前台顯示</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCoachDialog(false)}>取消</Button>
            <Button onClick={createCoach}>新增師傅</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCoach} onOpenChange={(open) => !open && setEditingCoach(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>編輯搭班師傅</DialogTitle></DialogHeader>
          {editingCoach ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">師傅名稱</Label>
                <Input value={editingCoach.name} onChange={(e) => setEditingCoach({ ...editingCoach, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">電話（選填）</Label>
                <Input value={editingCoach.phone || ""} onChange={(e) => setEditingCoach({ ...editingCoach, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">專長（選填）</Label>
                <Input value={editingCoach.specialty || ""} onChange={(e) => setEditingCoach({ ...editingCoach, specialty: e.target.value })} />
              </div>
              <AdminLandingImageField
                storeId={typeof storeId === "string" ? storeId : ""}
                label="搭班師傅頭像（可上傳）"
                value={editingCoach.portrait_url || ""}
                onChange={(url) => setEditingCoach({ ...editingCoach, portrait_url: url })}
              />
              {!coachPortraitColumnReady ? (
                <p className="text-xs text-amber-600">目前資料庫尚未升級頭像欄位，圖片將暫不寫入。</p>
              ) : null}
              <div className="flex items-center gap-2">
                <Switch checked={editingCoach.is_active} onCheckedChange={(v) => setEditingCoach({ ...editingCoach, is_active: v })} />
                <Label className="text-sm">啟用</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingCoach.available_today} onCheckedChange={(v) => setEditingCoach({ ...editingCoach, available_today: v })} />
                <Label className="text-sm">今日可接</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">可接開始</Label>
                  <CoachShiftHourSelect
                    value={editingCoach.shift_start_hour}
                    onChange={(n) => setEditingCoach({ ...editingCoach, shift_start_hour: n })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">可接結束</Label>
                  <CoachShiftHourSelect
                    value={editingCoach.shift_end_hour}
                    onChange={(n) => setEditingCoach({ ...editingCoach, shift_end_hour: n })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingCoach.landing_visible} onCheckedChange={(v) => setEditingCoach({ ...editingCoach, landing_visible: v })} />
                <Label className="text-sm">前台顯示</Label>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCoach(null)}>取消</Button>
            <Button onClick={saveEditCoach}>儲存師傅</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Section 1: Services === */}
      <div className="bg-card rounded-xl shadow p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-lg">主要服務</h2>
          <Button size="sm" onClick={() => setShowServiceDialog(true)}>
            <Plus className="w-4 h-4 mr-1" /> 新增服務
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="p-2 w-10"></th>
                <th className="text-left p-2">服務名稱</th>
                <th className="text-left p-2">時長</th>
                <th className="text-left p-2">價格</th>
                <th className="text-left p-2">差價</th>
                <th className="text-left p-2">業績金額</th>
                <th className="text-left p-2">師傅預估</th>
                <th className="text-left p-2">分類</th>
                <th className="text-center p-2">狀態</th>
                <th className="text-center p-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s, i) => (
                <tr key={s.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="p-1">
                    <div className="flex flex-col items-center gap-0.5">
                      <button onClick={() => moveService(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button onClick={() => moveService(i, 1)} disabled={i === services.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="p-2 max-w-[200px]">
                    <span className="truncate block">{s.name}</span>
                  </td>
                  <td className="p-2 whitespace-nowrap">{s.duration} 分</td>
                  <td className="p-2 whitespace-nowrap font-medium text-primary">NT${s.price.toLocaleString()}</td>
                  <td className="p-2 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="w-20 h-7 text-xs"
                        defaultValue={s.deduction.toString()}
                        key={`ded-${s.id}-${s.deduction}`}
                        onFocus={(e) => e.target.select()}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          updateDeduction(s, val);
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); } }}
                        placeholder="0"
                      />
                      <Save className="w-3 h-3 text-muted-foreground opacity-50" />
                    </div>
                  </td>
                  <td className="p-2 whitespace-nowrap font-medium text-accent-foreground">
                    NT${(s.price - s.deduction).toLocaleString()}
                  </td>
                  <td className="p-2 whitespace-nowrap font-semibold text-primary">
                    NT${Math.floor((s.price - s.deduction) * commissionRate).toLocaleString()}
                  </td>
                  <td className="p-2">
                    <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[s.category] || s.category}</Badge>
                  </td>
                  <td className="p-2 text-center">
                    <Switch checked={s.is_active} onCheckedChange={() => toggleServiceActive(s)} />
                  </td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingService({ ...s })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>確認刪除服務？</AlertDialogTitle>
                            <AlertDialogDescription>刪除「{s.name}」後無法復原。</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteService(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">確認刪除</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr><td colSpan={10} className="text-center text-muted-foreground p-8">尚無服務項目</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>差價 = 從售價扣除後才計算業績的金額（公司規定）</p>
          <p>目前抽成比例：<span className="font-semibold text-foreground">{(commissionRate * 100).toFixed(0)}%</span>（師傅 {(commissionRate * 100).toFixed(0)}% ／ 店家 {((1 - commissionRate) * 100).toFixed(0)}%）{onOpenSettings && <button onClick={onOpenSettings} className="ml-1 text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">修改</button>}</p>
        </div>
      </div>

      {/* === Section 2: Addons === */}
      <div className="bg-card rounded-xl shadow p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-lg">加購項目</h2>
          <Button size="sm" onClick={() => setShowAddonDialog(true)}>
            <Plus className="w-4 h-4 mr-1" /> 新增加購
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="p-2 w-10"></th>
                <th className="text-left p-2">名稱</th>
                <th className="text-left p-2">額外時長</th>
                <th className="text-left p-2">額外價格</th>
                <th className="text-left p-2">差價</th>
                <th className="text-left p-2">適用分類</th>
                <th className="text-left p-2">類型</th>
                <th className="text-center p-2">狀態</th>
                <th className="text-center p-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {addons.map((a, i) => (
                <tr key={a.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="p-1">
                    <div className="flex flex-col items-center gap-0.5">
                      <button onClick={() => moveAddon(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button onClick={() => moveAddon(i, 1)} disabled={i === addons.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="p-2 max-w-[180px]"><span className="truncate block">{a.name}</span></td>
                  <td className="p-2 whitespace-nowrap">{a.extra_duration} 分</td>
                  <td className="p-2 whitespace-nowrap font-medium text-primary">{a.extra_price > 0 ? `NT$${a.extra_price.toLocaleString()}` : "-"}</td>
                  <td className="p-2 whitespace-nowrap">{a.deduction > 0 ? `NT$${a.deduction.toLocaleString()}` : "-"}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {a.applicable_categories.length === 0 ? (
                        <Badge variant="outline" className="text-[10px]">全部</Badge>
                      ) : a.applicable_categories.map(c => (
                        <Badge key={c} variant="outline" className="text-[10px]">{CATEGORY_LABELS[c] || c}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-2">
                    <Badge variant="secondary" className="text-xs">{a.addon_type}</Badge>
                  </td>
                  <td className="p-2 text-center">
                    <Switch checked={a.is_active} onCheckedChange={() => toggleAddonActive(a)} />
                  </td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingAddon({ ...a })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>確認刪除加購項目？</AlertDialogTitle>
                            <AlertDialogDescription>刪除「{a.name}」後無法復原。</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteAddon(a.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">確認刪除</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {addons.length === 0 && (
                <tr><td colSpan={9} className="text-center text-muted-foreground p-8">尚無加購項目</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* === Edit Service Dialog === */}
      <Dialog open={!!editingService} onOpenChange={(open) => !open && setEditingService(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>編輯服務</DialogTitle></DialogHeader>
          {editingService && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">服務名稱</Label>
                <Input value={editingService.name} onChange={e => setEditingService({ ...editingService, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">時長（分鐘）</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editingService.duration}
                    onChange={e => setEditingService({ ...editingService, duration: toNonNegativeInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">價格（NT$）</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editingService.price}
                    onChange={e => setEditingService({ ...editingService, price: toNonNegativeInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">差價（NT$）</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editingService.deduction}
                    onChange={e => setEditingService({ ...editingService, deduction: toNonNegativeInt(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">服務分類</Label>
                <Select value={editingService.category} onValueChange={v => setEditingService({ ...editingService, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingService.is_active} onCheckedChange={v => setEditingService({ ...editingService, is_active: v })} />
                <Label className="text-sm">{editingService.is_active ? "上架" : "下架"}</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingService(null)}>取消</Button>
            <Button onClick={saveEditService}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === New Service Dialog === */}
      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增服務</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm">服務名稱</Label>
              <Input value={newService.name} onChange={e => setNewService({ ...newService, name: e.target.value })} placeholder="例：腳底按摩 (60分)" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">時長（分鐘）</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newService.duration}
                  onChange={e => setNewService({ ...newService, duration: toNonNegativeInt(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">價格（NT$）</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newService.price}
                  onChange={e => setNewService({ ...newService, price: toNonNegativeInt(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">差價（NT$）</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newService.deduction}
                  onChange={e => setNewService({ ...newService, deduction: toNonNegativeInt(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">服務分類</Label>
              <Select value={newService.category} onValueChange={v => setNewService({ ...newService, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newService.is_active} onCheckedChange={v => setNewService({ ...newService, is_active: v })} />
              <Label className="text-sm">{newService.is_active ? "上架" : "下架"}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServiceDialog(false)}>取消</Button>
            <Button onClick={createService}>新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Edit Addon Dialog === */}
      <Dialog open={!!editingAddon} onOpenChange={(open) => !open && setEditingAddon(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>編輯加購項目</DialogTitle></DialogHeader>
          {editingAddon && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">加購名稱</Label>
                <Input value={editingAddon.name} onChange={e => setEditingAddon({ ...editingAddon, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">額外時長（分鐘）</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editingAddon.extra_duration}
                    onChange={e => setEditingAddon({ ...editingAddon, extra_duration: toNonNegativeInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">額外價格（NT$）</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editingAddon.extra_price}
                    onChange={e => setEditingAddon({ ...editingAddon, extra_price: toNonNegativeInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">差價（NT$）</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editingAddon.deduction}
                    onChange={e => setEditingAddon({ ...editingAddon, deduction: toNonNegativeInt(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">類型</Label>
                <Select value={editingAddon.addon_type} onValueChange={v => setEditingAddon({ ...editingAddon, addon_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ADDON_TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">適用服務分類</Label>
                <div className="flex flex-wrap gap-2">
                  {APPLICABLE_CAT_OPTIONS.map(opt => (
                    <div key={opt.value} className="flex items-center gap-1.5">
                      <Checkbox
                        checked={editingAddon.applicable_categories.includes(opt.value)}
                        onCheckedChange={(checked) => {
                          setEditingAddon({
                            ...editingAddon,
                            applicable_categories: checked
                              ? [...editingAddon.applicable_categories, opt.value]
                              : editingAddon.applicable_categories.filter(c => c !== opt.value),
                          });
                        }}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingAddon.is_active} onCheckedChange={v => setEditingAddon({ ...editingAddon, is_active: v })} />
                <Label className="text-sm">{editingAddon.is_active ? "上架" : "下架"}</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAddon(null)}>取消</Button>
            <Button onClick={saveEditAddon}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === New Addon Dialog === */}
      <Dialog open={showAddonDialog} onOpenChange={setShowAddonDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增加購項目</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm">加購名稱</Label>
              <Input value={newAddon.name} onChange={e => setNewAddon({ ...newAddon, name: e.target.value })} placeholder="例：加購：刮痧 (30分)" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">額外時長（分鐘）</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newAddon.extra_duration}
                  onChange={e => setNewAddon({ ...newAddon, extra_duration: toNonNegativeInt(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">額外價格（NT$）</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newAddon.extra_price}
                  onChange={e => setNewAddon({ ...newAddon, extra_price: toNonNegativeInt(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">差價（NT$）</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newAddon.deduction}
                  onChange={e => setNewAddon({ ...newAddon, deduction: toNonNegativeInt(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">類型</Label>
              <Select value={newAddon.addon_type} onValueChange={v => setNewAddon({ ...newAddon, addon_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADDON_TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">適用服務分類</Label>
              <div className="flex flex-wrap gap-2">
                {APPLICABLE_CAT_OPTIONS.map(opt => (
                  <div key={opt.value} className="flex items-center gap-1.5">
                    <Checkbox
                      checked={newAddon.applicable_categories.includes(opt.value)}
                      onCheckedChange={(checked) => {
                        setNewAddon({
                          ...newAddon,
                          applicable_categories: checked
                            ? [...newAddon.applicable_categories, opt.value]
                            : newAddon.applicable_categories.filter(c => c !== opt.value),
                        });
                      }}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newAddon.is_active} onCheckedChange={v => setNewAddon({ ...newAddon, is_active: v })} />
              <Label className="text-sm">{newAddon.is_active ? "上架" : "下架"}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddonDialog(false)}>取消</Button>
            <Button onClick={createAddon}>新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
