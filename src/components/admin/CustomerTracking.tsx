
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminApi } from "@/lib/adminApi";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Users, RefreshCw, AlertTriangle, Ban, Star, Tag, StickyNote, Plus, X, ChevronDown, ChevronRight, Shield, CalendarDays, Clock, CheckCircle2, XCircle, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, Minus, Download, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";

interface Customer {
  id: string;
  phone: string;
  name: string;
  visit_count: number;
  no_show_count: number;
  cancel_count: number;
  last_visit_date: string | null;
  created_at: string;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  blacklist_action: string;
}

interface CustomerTag {
  id: string;
  customer_id: string;
  tag: string;
}

interface CustomerNote {
  id: string;
  customer_id: string;
  content: string;
  created_at: string;
}

interface BookingRecord {
  id: string;
  date: string;
  start_time_str: string;
  service: string;
  addons: string[];
  status: string | null;
  total_price: number;
  cancel_reason: string | null;
  source: string | null;
  name: string;
  phone: string;
}

const PRESET_TAGS = ["VIP", "常客", "新客", "敏感肌", "偏好重手", "偏好輕柔", "肩頸問題", "腰部問題"];

function getAutoTier(visitCount: number): { label: string; color: string } {
  if (visitCount >= 10) return { label: "VIP", color: "bg-yellow-100 text-yellow-800 border-yellow-300" };
  if (visitCount >= 5) return { label: "常客", color: "bg-blue-100 text-blue-700 border-blue-300" };
  if (visitCount >= 2) return { label: "回頭客", color: "bg-green-100 text-green-700 border-green-200" };
  return { label: "新客", color: "bg-muted text-muted-foreground border-border" };
}

export default function CustomerTracking() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterBlacklist, setFilterBlacklist] = useState<string>("all");
  const [sortField, setSortField] = useState<"spending" | "visits" | "lastVisit" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Spending data for sorting
  const [spendingByPhone, setSpendingByPhone] = useState<Map<string, number>>(new Map());

  // Tags & notes state
  const [allTags, setAllTags] = useState<CustomerTag[]>([]);
  const [allNotes, setAllNotes] = useState<CustomerNote[]>([]);

  // Detail dialog
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newTag, setNewTag] = useState("");
  const [newNote, setNewNote] = useState("");
  const [blacklistReason, setBlacklistReason] = useState("");
  const [blacklistAction, setBlacklistAction] = useState("warn");
  const [customerBookings, setCustomerBookings] = useState<BookingRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingFilter, setBookingFilter] = useState<"all" | "cancelled" | "completed">("all");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: t }, { data: n }, { data: bk }] = await Promise.all([
      supabase.from("customers").select("*").order("updated_at", { ascending: false }),
      supabase.from("customer_tags").select("*"),
      supabase.from("customer_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("bookings").select("phone, total_price, status"),
    ]);
    if (c) setCustomers(c as Customer[]);
    if (t) setAllTags(t as CustomerTag[]);
    if (n) setAllNotes(n as CustomerNote[]);
    // Build spending map
    const sMap = new Map<string, number>();
    (bk || []).forEach((b: any) => {
      if (b.status === "completed") sMap.set(b.phone, (sMap.get(b.phone) || 0) + (b.total_price || 0));
    });
    setSpendingByPhone(sMap);
    setLoading(false);
  }, []);

  const seedFromBookings = async () => {
    setLoading(true);
    const { data: bookings } = await supabase
      .from("bookings")
      .select("phone, name, date, status, cancel_reason");

    if (bookings && bookings.length > 0) {
      const phoneMap = new Map<string, {
        name: string; visit_count: number; no_show_count: number; cancel_count: number; last_visit_date: string | null;
      }>();

      for (const b of bookings) {
        const existing = phoneMap.get(b.phone) || { name: b.name, visit_count: 0, no_show_count: 0, cancel_count: 0, last_visit_date: null };
        if (b.status === "completed") {
          existing.visit_count++;
          if (!existing.last_visit_date || b.date > existing.last_visit_date) existing.last_visit_date = b.date;
        }
        if (b.status === "cancelled") {
          existing.cancel_count++;
          if (b.cancel_reason?.includes("爽約")) existing.no_show_count++;
        }
        existing.name = b.name;
        phoneMap.set(b.phone, existing);
      }

      for (const [phone, stats] of phoneMap) {
        await adminApi("customer.upsert", {
          customer: {
            phone, name: stats.name, visit_count: stats.visit_count,
            no_show_count: stats.no_show_count, cancel_count: stats.cancel_count, last_visit_date: stats.last_visit_date,
          },
        });
      }
    }
    await fetchAll();
    toast.success("同步完成");
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Helpers for selected customer
  const customerTags = (cid: string) => allTags.filter(t => t.customer_id === cid);
  const customerNotes = (cid: string) => allNotes.filter(n => n.customer_id === cid);

  // Unique tags for filter
  const uniqueTags = [...new Set(allTags.map(t => t.tag))];

  // Filtering
  const filtered = customers.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.phone.includes(search)) return false;
    if (filterBlacklist === "blacklisted" && !c.is_blacklisted) return false;
    if (filterBlacklist === "normal" && c.is_blacklisted) return false;
    if (filterTag !== "all") {
      const tags = customerTags(c.id);
      if (!tags.some(t => t.tag === filterTag)) return false;
    }
    return true;
  });

  // Sorting
  const toggleSort = (field: "spending" | "visits" | "lastVisit") => {
    if (sortField === field) {
      setSortDir(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sorted = [...filtered].sort((a, b) => {
    if (!sortField) return 0;
    const dir = sortDir === "desc" ? -1 : 1;
    if (sortField === "visits") return (a.visit_count - b.visit_count) * dir;
    if (sortField === "spending") return ((spendingByPhone.get(a.phone) || 0) - (spendingByPhone.get(b.phone) || 0)) * dir;
    if (sortField === "lastVisit") {
      const da = a.last_visit_date || "";
      const db = b.last_visit_date || "";
      return da.localeCompare(db) * dir;
    }
    return 0;
  });

  // Tag actions
  const addTag = async (customerId: string, tag: string) => {
    if (!tag.trim()) return;
    try {
      const result = await adminApi("customer_tag.add", { tag: { customer_id: customerId, tag: tag.trim() } });
      setAllTags(prev => [...prev, result.tag || { id: crypto.randomUUID(), customer_id: customerId, tag: tag.trim() }]);
      setNewTag("");
      toast.success(`已新增標籤「${tag.trim()}」`);
    } catch (e: any) {
      if (e.message?.includes("23505")) toast.error("此標籤已存在");
      else toast.error("新增失敗");
    }
  };

  const removeTag = async (tagId: string) => {
    await adminApi("customer_tag.remove", { id: tagId });
    setAllTags(prev => prev.filter(t => t.id !== tagId));
  };

  // Note actions
  const addNote = async (customerId: string) => {
    if (!newNote.trim()) return;
    try {
      const result = await adminApi("customer_note.add", { note: { customer_id: customerId, content: newNote.trim() } });
      if (result.note) setAllNotes(prev => [result.note as CustomerNote, ...prev]);
      setNewNote("");
      toast.success("備註已新增");
    } catch { toast.error("新增失敗"); }
  };

  const deleteNote = async (noteId: string) => {
    await adminApi("customer_note.remove", { id: noteId });
    setAllNotes(prev => prev.filter(n => n.id !== noteId));
  };

  // Blacklist toggle
  const toggleBlacklist = async (customer: Customer, enable: boolean) => {
    const updates: any = { is_blacklisted: enable };
    if (enable) {
      updates.blacklist_reason = blacklistReason || null;
      updates.blacklist_action = blacklistAction;
    } else {
      updates.blacklist_reason = null;
      updates.blacklist_action = "warn";
    }
    await adminApi("customer.update", { id: customer.id, updates });
    setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, ...updates } : c));
    if (selectedCustomer?.id === customer.id) {
      setSelectedCustomer({ ...customer, ...updates });
    }
    toast.success(enable ? "已加入黑名單" : "已解除黑名單");
  };

  const openDetail = async (c: Customer) => {
    setSelectedCustomer(c);
    setBlacklistReason(c.blacklist_reason || "");
    setBlacklistAction(c.blacklist_action || "warn");
    setNewTag("");
    setNewNote("");
    // Fetch booking history
    setLoadingBookings(true);
    const { data } = await supabase
      .from("bookings")
      .select("id, date, start_time_str, service, addons, status, total_price, cancel_reason, source")
      .eq("phone", c.phone)
      .order("date", { ascending: false })
      .order("start_hour", { ascending: false });
    setCustomerBookings((data as BookingRecord[]) || []);
    setLoadingBookings(false);
  };

  const exportCsv = async () => {
    // Fetch all bookings for stats calculation
    const { data: allBookings } = await supabase
      .from("bookings")
      .select("phone, service, total_price, status, date");

    const bookingsByPhone = new Map<string, typeof allBookings>();
    (allBookings || []).forEach((b: any) => {
      const list = bookingsByPhone.get(b.phone) || [];
      list.push(b);
      bookingsByPhone.set(b.phone, list);
    });

    const header = ["姓名", "電話", "等級", "來店次數", "爽約次數", "取消次數", "最後來訪", "總消費", "平均消費", "最常預約服務", "標籤", "黑名單"];
    const rows = customers.map(c => {
      const tier = getAutoTier(c.visit_count);
      const tags = customerTags(c.id).map(t => t.tag).join("、");
      const completed = (bookingsByPhone.get(c.phone) || []).filter((b: any) => b.status === "completed");
      const totalSpent = completed.reduce((s: number, b: any) => s + (b.total_price || 0), 0);
      const avgSpent = completed.length > 0 ? Math.round(totalSpent / completed.length) : 0;
      const svcCount = new Map<string, number>();
      completed.forEach((b: any) => svcCount.set(b.service, (svcCount.get(b.service) || 0) + 1));
      const topSvc = [...svcCount.entries()].sort((a, b) => b[1] - a[1])[0];

      return [
        c.name, c.phone, tier.label, c.visit_count, c.no_show_count, c.cancel_count || 0,
        c.last_visit_date || "", totalSpent, avgSpent,
        topSvc ? `${topSvc[0]}(${topSvc[1]}次)` : "",
        tags, c.is_blacklisted ? "是" : "否",
      ];
    });

    const csvContent = "\uFEFF" + [header, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `客戶統計_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV 已匯出");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">客戶追蹤</h2>
          <Badge variant="secondary">{customers.length} 位客戶</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-1" /> 匯出 CSV
          </Button>
          <Button variant="outline" size="sm" onClick={seedFromBookings}>
            <RefreshCw className="w-4 h-4 mr-1" /> 從預約同步
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜尋姓名或電話..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterTag} onValueChange={setFilterTag}>
          <SelectTrigger className="w-[140px]">
            <Tag className="w-4 h-4 mr-1" />
            <SelectValue placeholder="標籤篩選" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部標籤</SelectItem>
            {uniqueTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterBlacklist} onValueChange={setFilterBlacklist}>
          <SelectTrigger className="w-[140px]">
            <Shield className="w-4 h-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部客戶</SelectItem>
            <SelectItem value="blacklisted">黑名單</SelectItem>
            <SelectItem value="normal">正常客戶</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {search || filterTag !== "all" || filterBlacklist !== "all" ? "找不到符合的客戶" : "尚無客戶資料，點擊「從預約同步」匯入"}
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left p-3">姓名</th>
                <th className="text-left p-3">電話</th>
                <th className="text-center p-3">分級</th>
                <th className="text-center p-3 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("visits")}>
                  <div className="flex items-center justify-center gap-1">
                    來訪
                    {sortField === "visits" ? (sortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th className="text-center p-3">爽約</th>
                <th className="text-center p-3">取消</th>
                <th className="text-center p-3 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("spending")}>
                  <div className="flex items-center justify-center gap-1">
                    消費
                    {sortField === "spending" ? (sortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th className="text-left p-3">標籤</th>
                <th className="text-left p-3 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("lastVisit")}>
                  <div className="flex items-center gap-1">
                    最後造訪
                    {sortField === "lastVisit" ? (sortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => {
                const tier = getAutoTier(c.visit_count);
                const tags = customerTags(c.id);
                return (
                  <tr key={c.id} className={`border-b border-border hover:bg-secondary/50 cursor-pointer ${c.is_blacklisted ? "bg-destructive/5" : ""}`}
                    onClick={() => openDetail(c)}>
                    <td className="p-3 font-medium text-foreground">
                      <div className="flex items-center gap-1">
                        {c.is_blacklisted && <Ban className="w-4 h-4 text-destructive shrink-0" />}
                        {c.name || "—"}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{c.phone}</td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className={tier.color}>{tier.label}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">{c.visit_count}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      {c.no_show_count > 0 ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />{c.no_show_count}
                        </Badge>
                      ) : <span className="text-muted-foreground">0</span>}
                    </td>
                    <td className="p-3 text-center">
                      {(c.cancel_count || 0) > 0 ? (
                        <Badge variant="outline" className="gap-1 text-muted-foreground">
                          {c.cancel_count}
                        </Badge>
                      ) : <span className="text-muted-foreground">0</span>}
                    </td>
                    <td className="p-3 text-center text-muted-foreground">
                      ${(spendingByPhone.get(c.phone) || 0).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 3).map(t => (
                          <Badge key={t.id} variant="outline" className="text-xs">{t.tag}</Badge>
                        ))}
                        {tags.length > 3 && <Badge variant="outline" className="text-xs">+{tags.length - 3}</Badge>}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{c.last_visit_date || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={open => { if (!open) setSelectedCustomer(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedCustomer && (() => {
            const c = selectedCustomer;
            const tier = getAutoTier(c.visit_count);
            const tags = customerTags(c.id);
            const notes = customerNotes(c.id);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {c.is_blacklisted && <Ban className="w-5 h-5 text-destructive" />}
                    {c.name || "未知"} 
                    <Badge variant="outline" className={tier.color}>{tier.label}</Badge>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                  {/* Basic info + Stats */}
                  {(() => {
                    const completed = customerBookings.filter(b => b.status === "completed");
                    const totalSpent = completed.reduce((s, b) => s + b.total_price, 0);
                    const avgSpent = completed.length > 0 ? Math.round(totalSpent / completed.length) : 0;
                    // Most frequent service
                    const svcCount = new Map<string, number>();
                    completed.forEach(b => svcCount.set(b.service, (svcCount.get(b.service) || 0) + 1));
                    const topService = [...svcCount.entries()].sort((a, b) => b[1] - a[1])[0];

                    return (
                      <>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="text-muted-foreground">電話：</span>{c.phone}</div>
                          <div><span className="text-muted-foreground">來訪：</span>{c.visit_count} 次</div>
                          <div><span className="text-muted-foreground">爽約：</span>{c.no_show_count} 次</div>
                          <div><span className="text-muted-foreground">取消：</span>{c.cancel_count || 0} 次</div>
                          <div><span className="text-muted-foreground">最後造訪：</span>{c.last_visit_date || "—"}</div>
                        </div>

                        {completed.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-muted rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                                <DollarSign className="w-3 h-3" /> 總消費
                              </div>
                              <div className="font-bold text-foreground">NT${totalSpent.toLocaleString()}</div>
                            </div>
                            <div className="bg-muted rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                                <TrendingUp className="w-3 h-3" /> 平均消費
                              </div>
                              <div className="font-bold text-foreground">NT${avgSpent.toLocaleString()}</div>
                            </div>
                            <div className="bg-muted rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                                <Star className="w-3 h-3" /> 最常預約
                              </div>
                              <div className="font-bold text-foreground text-xs truncate">
                                {topService ? `${topService[0]}` : "—"}
                              </div>
                              {topService && <div className="text-xs text-muted-foreground">{topService[1]} 次</div>}
                            </div>
                          </div>
                        )}

                        {/* Spending trend: recent 3 months vs before */}
                        {(() => {
                          const threeMonthsAgo = format(subMonths(new Date(), 3), "yyyy-MM-dd");
                          const recent = completed.filter(b => b.date >= threeMonthsAgo);
                          const older = completed.filter(b => b.date < threeMonthsAgo);
                          const recentAvg = recent.length > 0 ? Math.round(recent.reduce((s, b) => s + b.total_price, 0) / recent.length) : null;
                          const olderAvg = older.length > 0 ? Math.round(older.reduce((s, b) => s + b.total_price, 0) / older.length) : null;

                          if (recentAvg === null && olderAvg === null) return null;

                          const diff = recentAvg !== null && olderAvg !== null ? recentAvg - olderAvg : null;
                          const pct = diff !== null && olderAvg > 0 ? Math.round((diff / olderAvg) * 100) : null;

                          return (
                            <div className="p-3 rounded-lg border border-border text-sm">
                              <div className="flex items-center gap-1 text-muted-foreground text-xs mb-2">
                                <TrendingUp className="w-3 h-3" /> 消費趨勢
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <div className="text-xs text-muted-foreground">近 3 個月均消</div>
                                  <div className="font-bold text-foreground">
                                    {recentAvg !== null ? `NT$${recentAvg.toLocaleString()}` : "—"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{recent.length} 筆</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">3 個月前均消</div>
                                  <div className="font-bold text-foreground">
                                    {olderAvg !== null ? `NT$${olderAvg.toLocaleString()}` : "—"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{older.length} 筆</div>
                                </div>
                              </div>
                              {diff !== null && (
                                <div className={`mt-2 flex items-center gap-1 text-sm font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                  {diff > 0 ? <ArrowUpRight className="w-4 h-4" /> : diff < 0 ? <ArrowDownRight className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                                  {diff > 0 ? "+" : ""}{diff.toLocaleString()} 元
                                  {pct !== null && <span className="text-xs">({diff > 0 ? "+" : ""}{pct}%)</span>}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    );
                  })()}

                  <div className="p-3 rounded-lg border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Ban className="w-4 h-4 text-destructive" />
                        <Label className="font-semibold">黑名單</Label>
                      </div>
                      <Switch
                        checked={c.is_blacklisted}
                        onCheckedChange={checked => {
                          if (checked) {
                            // Show reason fields first, then save
                          } else {
                            toggleBlacklist(c, false);
                          }
                        }}
                      />
                    </div>
                    {(c.is_blacklisted || !c.is_blacklisted) && (
                      <div className="space-y-2">
                        <Input
                          placeholder="封鎖原因（選填）"
                          value={blacklistReason}
                          onChange={e => setBlacklistReason(e.target.value)}
                        />
                        <Select value={blacklistAction} onValueChange={setBlacklistAction}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="warn">僅後台警示</SelectItem>
                            <SelectItem value="block">封鎖線上預約</SelectItem>
                          </SelectContent>
                        </Select>
                        {!c.is_blacklisted && (
                          <Button variant="destructive" size="sm" className="w-full" onClick={() => toggleBlacklist(c, true)}>
                            確認加入黑名單
                          </Button>
                        )}
                        {c.is_blacklisted && (
                          <Button variant="outline" size="sm" className="w-full" onClick={() => {
                            toggleBlacklist(c, true); // Update reason/action
                            toast.success("黑名單設定已更新");
                          }}>
                            更新設定
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" />
                      <Label className="font-semibold">標籤</Label>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tags.map(t => (
                        <Badge key={t.id} variant="secondary" className="gap-1 pr-1">
                          {t.tag}
                          <button onClick={() => removeTag(t.id)} className="ml-1 hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    {/* Preset tags */}
                    <div className="flex flex-wrap gap-1">
                      {PRESET_TAGS.filter(pt => !tags.some(t => t.tag === pt)).map(pt => (
                        <Badge key={pt} variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs"
                          onClick={() => addTag(c.id, pt)}>
                          <Plus className="w-3 h-3 mr-0.5" />{pt}
                        </Badge>
                      ))}
                    </div>
                    {/* Custom tag */}
                    <div className="flex gap-2">
                      <Input placeholder="自訂標籤..." value={newTag} onChange={e => setNewTag(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addTag(c.id, newTag); }}
                        className="h-8 text-sm" />
                      <Button size="sm" variant="outline" onClick={() => addTag(c.id, newTag)} className="h-8 shrink-0">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <StickyNote className="w-4 h-4 text-primary" />
                      <Label className="font-semibold">客戶備註</Label>
                    </div>
                    <div className="flex gap-2">
                      <Textarea placeholder="新增備註（偏好、注意事項...）" value={newNote}
                        onChange={e => setNewNote(e.target.value)} className="text-sm min-h-[60px]" />
                    </div>
                    <Button size="sm" onClick={() => addNote(c.id)} className="w-full">
                      <Plus className="w-4 h-4 mr-1" /> 新增備註
                    </Button>
                    {notes.length > 0 && (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {notes.map(n => (
                          <div key={n.id} className="p-2 rounded bg-muted text-sm flex justify-between items-start gap-2">
                            <div>
                              <p className="text-foreground whitespace-pre-wrap">{n.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(n.created_at), "yyyy/MM/dd HH:mm")}
                              </p>
                            </div>
                            <button onClick={() => deleteNote(n.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Booking History Timeline */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      <Label className="font-semibold">預約歷史</Label>
                      <Badge variant="secondary" className="text-xs">{customerBookings.length} 筆</Badge>
                    </div>
                    {loadingBookings ? (
                      <div className="space-y-2">
                        {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full rounded" />)}
                      </div>
                    ) : customerBookings.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">尚無預約紀錄</p>
                    ) : (
                      <div className="relative space-y-0 max-h-[300px] overflow-y-auto">
                        {customerBookings.map((b, idx) => {
                          const isCompleted = b.status === "completed";
                          const isCancelled = b.status === "cancelled";
                          const isNoShow = isCancelled && b.cancel_reason?.includes("爽約");
                          return (
                            <div key={b.id} className="flex gap-3 pb-3">
                              {/* Timeline line */}
                              <div className="flex flex-col items-center">
                                <div className={`w-3 h-3 rounded-full shrink-0 mt-1 ${
                                  isNoShow ? "bg-destructive" :
                                  isCancelled ? "bg-muted-foreground" :
                                  isCompleted ? "bg-green-500" :
                                  "bg-primary"
                                }`} />
                                {idx < customerBookings.length - 1 && (
                                  <div className="w-px flex-1 bg-border min-h-[20px]" />
                                )}
                              </div>
                              {/* Content */}
                              <div className="flex-1 text-sm pb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-foreground">{b.date}</span>
                                  <span className="text-muted-foreground">{b.start_time_str}</span>
                                  {isCompleted && <Badge variant="outline" className="text-xs border-green-300 text-green-700">完成</Badge>}
                                  {isNoShow && <Badge variant="destructive" className="text-xs">爽約</Badge>}
                                  {isCancelled && !isNoShow && <Badge variant="outline" className="text-xs">取消</Badge>}
                                  {!isCompleted && !isCancelled && <Badge variant="outline" className="text-xs border-primary text-primary">已確認</Badge>}
                                </div>
                                <div className="text-muted-foreground mt-0.5">
                                  {b.service}
                                  {b.addons && b.addons.length > 0 && ` + ${b.addons.join("、")}`}
                                  <span className="ml-2">NT${b.total_price}</span>
                                  {b.source === "admin" && <span className="ml-1 text-xs">(後台)</span>}
                                </div>
                                {b.cancel_reason && (
                                  <p className="text-xs text-destructive mt-0.5">原因：{b.cancel_reason}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
