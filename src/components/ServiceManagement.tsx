import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCommission } from "@/hooks/useCommission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Save, X, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
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
  applicable_categories: string[];
  addon_type: string;
  is_active: boolean;
  sort_order: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  foot: "腳底按摩",
  body: "全身指壓",
  "fascia-foot": "筋膜刀腳底",
  "fascia-body": "筋膜刀身體",
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
  { value: "combo", label: "深層雙拼" },
  { value: "package", label: "套餐" },
];

export default function ServiceManagement() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [addons, setAddons] = useState<AddonRow[]>([]);
  const { commissionRate } = useCommission();
  const [editingService, setEditingService] = useState<ServiceRow | null>(null);
  const [editingAddon, setEditingAddon] = useState<AddonRow | null>(null);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showAddonDialog, setShowAddonDialog] = useState(false);
  const [newService, setNewService] = useState({ name: "", duration: 60, price: 1000, category: "foot", is_active: true, deduction: 0 });
  const [newAddon, setNewAddon] = useState({ name: "", extra_duration: 0, extra_price: 0, applicable_categories: [] as string[], addon_type: "加購", is_active: true });

  const toNonNegativeInt = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (!digitsOnly) return 0;
    return parseInt(digitsOnly, 10);
  };

  const fetchAll = async () => {
    const [{ data: s }, { data: a }] = await Promise.all([
      supabase.from("services").select("*").order("sort_order"),
      supabase.from("addons").select("*").order("sort_order"),
    ]);
    if (s) setServices(s as ServiceRow[]);
    if (a) setAddons(a as AddonRow[]);
  };

  useEffect(() => { fetchAll(); }, []);

  const activeServiceCount = services.filter(s => s.is_active).length;
  const activeAddonCount = addons.filter(a => a.is_active).length;

  // ===== Services CRUD =====
  const toggleServiceActive = async (s: ServiceRow) => {
    await supabase.from("services").update({ is_active: !s.is_active } as any).eq("id", s.id);
    fetchAll();
  };

  const deleteService = async (id: string) => {
    await supabase.from("services").delete().eq("id", id);
    fetchAll();
    toast.success("已刪除服務");
  };

  const saveEditService = async () => {
    if (!editingService) return;
    const { id, ...rest } = editingService;
    await supabase.from("services").update(rest as any).eq("id", id);
    setEditingService(null);
    fetchAll();
    toast.success("已更新服務");
  };

  const createService = async () => {
    if (!newService.name.trim()) { toast.error("請輸入服務名稱"); return; }
    const maxOrder = services.length > 0 ? Math.max(...services.map(s => s.sort_order)) + 1 : 0;
    await supabase.from("services").insert({ ...newService, sort_order: maxOrder } as any);
    setShowServiceDialog(false);
    setNewService({ name: "", duration: 60, price: 1000, category: "foot", is_active: true, deduction: 0 });
    fetchAll();
    toast.success("已新增服務");
  };

  const updateDeduction = async (s: ServiceRow, val: number) => {
    await supabase.from("services").update({ deduction: val } as any).eq("id", s.id);
    setServices(prev => prev.map(x => x.id === s.id ? { ...x, deduction: val } : x));
    toast.success(`已更新「${s.name}」差價為 NT$${val}`);
  };

  const moveService = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= services.length) return;
    const updates = [
      { id: services[index].id, sort_order: services[target].sort_order },
      { id: services[target].id, sort_order: services[index].sort_order },
    ];
    await Promise.all(updates.map(u => supabase.from("services").update({ sort_order: u.sort_order } as any).eq("id", u.id)));
    fetchAll();
  };

  // ===== Addons CRUD =====
  const toggleAddonActive = async (a: AddonRow) => {
    await supabase.from("addons").update({ is_active: !a.is_active } as any).eq("id", a.id);
    fetchAll();
  };

  const deleteAddon = async (id: string) => {
    await supabase.from("addons").delete().eq("id", id);
    fetchAll();
    toast.success("已刪除加購項目");
  };

  const saveEditAddon = async () => {
    if (!editingAddon) return;
    const { id, ...rest } = editingAddon;
    await supabase.from("addons").update(rest as any).eq("id", id);
    setEditingAddon(null);
    fetchAll();
    toast.success("已更新加購項目");
  };

  const createAddon = async () => {
    if (!newAddon.name.trim()) { toast.error("請輸入加購名稱"); return; }
    const maxOrder = addons.length > 0 ? Math.max(...addons.map(a => a.sort_order)) + 1 : 0;
    await supabase.from("addons").insert({ ...newAddon, sort_order: maxOrder } as any);
    setShowAddonDialog(false);
    setNewAddon({ name: "", extra_duration: 0, extra_price: 0, applicable_categories: [], addon_type: "加購", is_active: true });
    fetchAll();
    toast.success("已新增加購項目");
  };

  const moveAddon = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= addons.length) return;
    const updates = [
      { id: addons[index].id, sort_order: addons[target].sort_order },
      { id: addons[target].id, sort_order: addons[index].sort_order },
    ];
    await Promise.all(updates.map(u => supabase.from("addons").update({ sort_order: u.sort_order } as any).eq("id", u.id)));
    fetchAll();
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex gap-3 flex-wrap">
        <Badge variant="secondary" className="text-sm px-3 py-1">{activeServiceCount} 個服務上架中</Badge>
        <Badge variant="secondary" className="text-sm px-3 py-1">{activeAddonCount} 個加購上架中</Badge>
      </div>

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
                <tr><td colSpan={9} className="text-center text-muted-foreground p-8">尚無服務項目</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">差價 = 從售價扣除後才計算業績的金額（公司規定）</p>
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
                <tr><td colSpan={8} className="text-center text-muted-foreground p-8">尚無加購項目</td></tr>
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
              <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
