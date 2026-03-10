import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatHourToTime, generateTimeSlots } from "@/lib/services";
import { adminApi } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CalendarIcon, Trash2, LogOut, RotateCcw, List, CalendarDays, Phone, Check, X, StickyNote, Plus, Settings, Pencil, Undo2, ArrowUpDown, ArrowUp, ArrowDown, Filter, ChevronDown, ChevronRight, Ban } from "lucide-react";
import ServiceManagement from "@/components/ServiceManagement";
import TodayDashboard from "@/components/admin/TodayDashboard";
import BookingCalendarView from "@/components/admin/BookingCalendarView";
import StatsDashboard from "@/components/admin/StatsDashboard";
import CustomerTracking from "@/components/admin/CustomerTracking";
import BookingFiltersBar, { type BookingFilters, type SortField } from "@/components/admin/BookingFilters";
import { useCommission } from "@/hooks/useCommission";
import { useCalendarNotes } from "@/hooks/useCalendarNotes";
import { useShopInfo } from "@/hooks/useShopInfo";
import { useBookingSettings } from "@/hooks/useBookingSettings";
import { format, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const DEFAULT_ADMIN_PASSWORD = "bulaosong2024";

interface Booking {
  id: string;
  order_time: string;
  date: string;
  start_hour: number;
  start_time_str: string;
  name: string;
  phone: string;
  service: string;
  addons: string[];
  duration: number;
  total_price: number;
  cancelled_at: string | null;
  status: string | null;
  cancel_reason: string | null;
  admin_note: string | null;
  completed_at: string | null;
  source: string | null;
  oil_bonus: number;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  customer: { label: "客人預約", color: "bg-blue-100 text-blue-700 border-blue-200" },
  admin: { label: "系統代訂", color: "bg-purple-100 text-purple-700 border-purple-200" },
  front_desk: { label: "櫃檯代訂", color: "bg-amber-100 text-amber-700 border-amber-200" },
};

interface Holiday {
  id: string;
  date: string;
  type: string;
  start_hour: number | null;
  end_hour: number | null;
  note: string | null;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [tab, setTab] = useState("today");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [loading, setLoading] = useState(true);
  const [showCommissionCols, setShowCommissionCols] = useState(false);

  const commission = useCommission();
  const calendarNotesHook = useCalendarNotes();
  const shopInfoHook = useShopInfo();
  const bookingSettingsHook = useBookingSettings();

  // Filters
  const [filters, setFilters] = useState<BookingFilters>({
    search: "", dateFrom: undefined, dateTo: undefined, category: "all", status: "all",
    sortField: "order_time", sortDirection: "desc", filterName: "", filterService: "",
  });

  // Cancel dialog
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("客人取消");

  // Note dialog
  const [noteBookingId, setNoteBookingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  // Edit booking dialog
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", phone: "", service: "", date: "", start_hour: 14, duration: 60, total_price: 0, addons: [] as string[], source: "customer", oil_bonus: 0,
  });

  // Manual booking dialog
  const [showManualBooking, setShowManualBooking] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: "", phone: "", service: "", date: "", start_hour: 14, duration: 60, total_price: 0, addons: [] as string[], source: "admin",
  });

  // Holiday form
  const [hDate, setHDate] = useState<Date>();
  const [hType, setHType] = useState("整天公休");
  const [hStart, setHStart] = useState("");
  const [hEnd, setHEnd] = useState("");
  const [hNote, setHNote] = useState("");

  // Settings dialog
  const [showSettings, setShowSettings] = useState(false);
  const [rateInput, setRateInput] = useState("60");
  const [calendarNotesInput, setCalendarNotesInput] = useState("");
  const [shopInfoInput, setShopInfoInput] = useState(shopInfoHook.info);
  const [bufferInput, setBufferInput] = useState("10");
  const [freeAddonInput, setFreeAddonInput] = useState("10");
  const [preBlockInput, setPreBlockInput] = useState("60");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminPasswordFromDb, setAdminPasswordFromDb] = useState(DEFAULT_ADMIN_PASSWORD);

  // Holiday calendar navigation
  const [holidayCalendarMonth, setHolidayCalendarMonth] = useState<Date>(new Date());

  const [holidayClickedDate, setHolidayClickedDate] = useState<string | null>(null);
  const [holidayDialogType, setHolidayDialogType] = useState<"整天公休" | "部分時段公休">("整天公休");
  const [holidayDialogStart, setHolidayDialogStart] = useState("");
  const [holidayDialogEnd, setHolidayDialogEnd] = useState("");
  const [holidayDialogNote, setHolidayDialogNote] = useState("");

  // Batch pending holidays (dates toggled but not yet saved)
  const [pendingHolidayDates, setPendingHolidayDates] = useState<Set<string>>(new Set());
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // Services & addons list for manual booking
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [addonsList, setAddonsList] = useState<any[]>([]);

  // Blacklisted phones
  const [blacklistedPhones, setBlacklistedPhones] = useState<Set<string>>(new Set());

  // Google Calendar embed
  const [googleCalendarId, setGoogleCalendarId] = useState<string>("");
  const [showGoogleCalendar, setShowGoogleCalendar] = useState(false);

  // Load admin password from DB & Google Calendar ID
  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase.from("system_config").select("value").eq("key", "admin_password").single();
      if (data?.value) setAdminPasswordFromDb(data.value);
    };
    loadConfig();
  }, []);

  useEffect(() => {
    if (authenticated) {
      const fetchCalendarId = async () => {
        try {
          const res = await adminApi("config.get_calendar_id");
          if (res.calendar_id) setGoogleCalendarId(res.calendar_id);
        } catch {}
      };
      fetchCalendarId();
    }
  }, [authenticated]);

  const handleLogin = () => {
    if (password === adminPasswordFromDb) {
      setAuthenticated(true);
      sessionStorage.setItem("admin_auth", "true");
      sessionStorage.setItem("admin_password", password);
    } else {
      toast.error("密碼錯誤");
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem("admin_auth") === "true" && sessionStorage.getItem("admin_password")) {
      setAuthenticated(true);
    } else {
      sessionStorage.removeItem("admin_auth");
      sessionStorage.removeItem("admin_password");
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("bookings").select("*").order("date", { ascending: false });
    if (data) setBookings(data as Booking[]);
    setLoading(false);
  }, []);

  const fetchHolidays = useCallback(async () => {
    const { data } = await supabase.from("holidays").select("*").order("date", { ascending: false });
    if (data) setHolidays(data as Holiday[]);
  }, []);

  const fetchServices = useCallback(async () => {
    const [{ data: svcData }, { data: addonData }] = await Promise.all([
      supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("addons").select("*").eq("is_active", true).order("sort_order"),
    ]);
    if (svcData) setServicesList(svcData);
    if (addonData) setAddonsList(addonData);
  }, []);

  const fetchBlacklist = useCallback(async () => {
    const { data } = await supabase.from("customers").select("phone").eq("is_blacklisted", true);
    if (data) setBlacklistedPhones(new Set(data.map((c: any) => c.phone)));
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchBookings();
      fetchHolidays();
      fetchServices();
      fetchBlacklist();
    }
  }, [authenticated, fetchBookings, fetchHolidays, fetchServices, fetchBlacklist]);

  // CRUD actions via Edge Function
  const softDeleteBooking = async (id: string, reason: string) => {
    try {
      await adminApi("booking.cancel", { id, reason });
      setCancellingId(null);
      fetchBookings();
      toast.success("已取消預約");
    } catch (e: any) { toast.error(e.message); }
  };

  const restoreBooking = async (id: string) => {
    try {
      await adminApi("booking.restore", { id });
      fetchBookings();
      toast.success("已復原預約");
    } catch (e: any) { toast.error(e.message); }
  };

  const completeBooking = async (id: string) => {
    try {
      await adminApi("booking.complete", { id });
      fetchBookings();
      toast.success("已標記完成");
    } catch (e: any) { toast.error(e.message); }
  };

  const uncompleteBooking = async (id: string) => {
    try {
      await adminApi("booking.uncomplete", { id });
      fetchBookings();
      toast.success("已改回確認狀態");
    } catch (e: any) { toast.error(e.message); }
  };

  const openEditBooking = (b: Booking) => {
    setEditingBooking(b);
    setEditForm({
      name: b.name, phone: b.phone, service: b.service, date: b.date,
      start_hour: b.start_hour, duration: b.duration, total_price: b.total_price,
      addons: b.addons || [], source: b.source || "customer", oil_bonus: b.oil_bonus || 0,
    });
  };

  const saveEditBooking = async () => {
    if (!editingBooking) return;
    try {
      await adminApi("booking.update", {
        id: editingBooking.id,
        updates: {
          name: editForm.name, phone: editForm.phone, service: editForm.service,
          date: editForm.date, start_hour: editForm.start_hour,
          start_time_str: formatHourToTime(editForm.start_hour),
          duration: editForm.duration, total_price: editForm.total_price,
          addons: editForm.addons, source: editForm.source, oil_bonus: editForm.oil_bonus,
        },
      });
      setEditingBooking(null);
      fetchBookings();
      toast.success("已更新預約");
    } catch (e: any) { toast.error(e.message); }
  };

  const permanentDeleteBooking = async (id: string) => {
    try {
      await adminApi("booking.delete", { id });
      fetchBookings();
      toast.success("已永久刪除");
    } catch (e: any) { toast.error(e.message); }
  };

  const saveNote = async () => {
    if (!noteBookingId) return;
    try {
      await adminApi("booking.note", { id: noteBookingId, note: noteText });
      setNoteBookingId(null);
      setNoteText("");
      fetchBookings();
      toast.success("已儲存備註");
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteHoliday = async (id: string) => {
    try {
      await adminApi("holiday.delete", { id });
      fetchHolidays();
      toast.success("已刪除公休");
    } catch (e: any) { toast.error(e.message); }
  };

  const addHoliday = async () => {
    if (!hDate) { toast.error("請選擇日期"); return; }
    const holiday: any = { date: format(hDate, "yyyy-MM-dd"), type: hType, note: hNote || null };
    if (hType === "部分時段公休") {
      if (!hStart || !hEnd) { toast.error("請選擇時段"); return; }
      holiday.start_hour = parseFloat(hStart);
      holiday.end_hour = parseFloat(hEnd);
    }
    try {
      await adminApi("holiday.create", { holiday });
      fetchHolidays();
      setHDate(undefined);
      setHNote("");
      toast.success("已新增公休");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCalendarDayClick = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const dayHolidays = holidays.filter(h => h.date === dateStr);
    if (dayHolidays.length > 0) {
      // Has existing holidays - open dialog to view/manage
      setHolidayClickedDate(dateStr);
      setHolidayDialogType("部分時段公休");
      setHolidayDialogStart("");
      setHolidayDialogEnd("");
      setHolidayDialogNote("");
    } else {
      // No holidays - toggle in pending batch set
      setPendingHolidayDates(prev => {
        const next = new Set(prev);
        if (next.has(dateStr)) {
          next.delete(dateStr);
        } else {
          next.add(dateStr);
        }
        return next;
      });
    }
  };

  const savePendingHolidays = async () => {
    if (pendingHolidayDates.size === 0) return;
    setIsSavingBatch(true);
    try {
      const holidays = Array.from(pendingHolidayDates).map(date => ({
        date, type: "整天公休" as const, note: null,
      }));
      await adminApi("holiday.create_batch", { holidays });
      setPendingHolidayDates(new Set());
      fetchHolidays();
      toast.success(`已新增 ${holidays.length} 筆公休`);
    } catch (err: any) {
      toast.error(err.message || "批次新增失敗");
    } finally {
      setIsSavingBatch(false);
    }
  };

  const addHolidayFromDialog = async () => {
    if (!holidayClickedDate) return;
    const holiday: any = { date: holidayClickedDate, type: holidayDialogType, note: holidayDialogNote || null };
    if (holidayDialogType === "部分時段公休") {
      if (!holidayDialogStart || !holidayDialogEnd) { toast.error("請選擇時段"); return; }
      holiday.start_hour = parseFloat(holidayDialogStart);
      holiday.end_hour = parseFloat(holidayDialogEnd);
    }
    try {
      await adminApi("holiday.create", { holiday });
      fetchHolidays();
      setHolidayClickedDate(null);
      toast.success("已新增公休");
    } catch (e: any) { toast.error(e.message); }
  };

  const createManualBooking = async () => {
    if (!manualForm.name || !manualForm.phone || !manualForm.service || !manualForm.date) {
      toast.error("請填寫所有必填欄位");
      return;
    }
    try {
      await adminApi("booking.create_manual", {
        booking: {
          name: manualForm.name, phone: manualForm.phone, service: manualForm.service,
          date: manualForm.date, start_hour: manualForm.start_hour,
          start_time_str: formatHourToTime(manualForm.start_hour),
          duration: manualForm.duration, total_price: manualForm.total_price,
          addons: manualForm.addons, status: "confirmed", source: manualForm.source,
        },
      });
      setShowManualBooking(false);
      setManualForm({ name: "", phone: "", service: "", date: "", start_hour: 14, duration: 60, total_price: 0, addons: [], source: "admin" });
      fetchBookings();
      toast.success("已新增預約");
    } catch (e: any) { toast.error(e.message); }
  };

  const saveSettings = async () => {
    const rate = parseInt(rateInput) / 100;
    if (rate <= 0 || rate >= 1) { toast.error("請輸入 1~99 的數值"); return; }
    try {
      const configs: { key: string; value: string }[] = [
        { key: "commission_rate", value: rate.toString() },
        { key: "calendar_notes", value: calendarNotesInput },
        { key: "buffer_minutes", value: bufferInput },
        { key: "free_addon_duration", value: freeAddonInput },
        { key: "pre_block_minutes", value: preBlockInput },
        ...Object.entries(shopInfoInput).map(([k, v]) => ({ key: k, value: v })),
      ];
      if (adminPasswordInput.trim()) {
        configs.push({ key: "admin_password", value: adminPasswordInput.trim() });
      }
      await adminApi("config.update", { configs });
      // Update local state
      commission.refetch();
      calendarNotesHook.refetch();
      shopInfoHook.refetch();
      bookingSettingsHook.refetch();
      if (adminPasswordInput.trim()) {
        setAdminPasswordFromDb(adminPasswordInput.trim());
        sessionStorage.setItem("admin_password", adminPasswordInput.trim());
        setAdminPasswordInput("");
      }
      setShowSettings(false);
      toast.success("已儲存設定");
    } catch (e: any) { toast.error(e.message); }
  };

  // Filtered & sorted bookings
  const filteredBookings = useMemo(() => {
    let result = [...bookings];
    if (filters.status === "active") result = result.filter((b) => !b.cancelled_at && b.status !== "cancelled");
    else if (filters.status === "cancelled") result = result.filter((b) => !!b.cancelled_at || b.status === "cancelled");
    else if (filters.status === "completed") result = result.filter((b) => b.status === "completed");

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((b) => b.name.toLowerCase().includes(q) || b.phone.includes(q));
    }
    if (filters.filterName) {
      const q = filters.filterName.toLowerCase();
      result = result.filter((b) => b.name.toLowerCase().includes(q));
    }
    if (filters.filterService) {
      result = result.filter((b) => b.service === filters.filterService);
    }
    if (filters.dateFrom) {
      const from = format(filters.dateFrom, "yyyy-MM-dd");
      result = result.filter((b) => b.date >= from);
    }
    if (filters.dateTo) {
      const to = format(filters.dateTo, "yyyy-MM-dd");
      result = result.filter((b) => b.date <= to);
    }
    if (filters.category !== "all") {
      result = result.filter((b) => {
        const s = b.service;
        if (filters.category === "foot") return s.includes("腳底按摩") && !s.includes("筋膜刀");
        if (filters.category === "body") return s.includes("全身指壓") && !s.includes("筋膜刀");
        if (filters.category === "fascia_foot") return s.includes("筋膜刀") && s.includes("腳底");
        if (filters.category === "fascia_body") return s.includes("筋膜刀") && s.includes("身體");
        if (filters.category === "fascia_neck") return s.includes("筋膜刀") && s.includes("肩頸");
        if (filters.category === "package") return s.includes("套餐");
        if (filters.category === "combo") return s.includes("深層雙拼");
        return true;
      });
    }

    // Sorting
    const dir = filters.sortDirection === "asc" ? 1 : -1;
    result.sort((a, b) => {
      switch (filters.sortField) {
        case "order_time": return dir * (new Date(a.order_time).getTime() - new Date(b.order_time).getTime());
        case "date": return dir * (a.date.localeCompare(b.date) || (a.start_hour - b.start_hour));
        case "total_price": return dir * (a.total_price - b.total_price);
        case "duration": return dir * (a.duration - b.duration);
        default: return 0;
      }
    });

    return result;
  }, [bookings, filters]);

  const timeSlots = generateTimeSlots();

  // Unique names and services for column filters
  const uniqueNames = useMemo(() => [...new Set(bookings.map(b => b.name))].sort((a, b) => a.localeCompare(b, "zh-TW")), [bookings]);
  const uniqueServices = useMemo(() => [...new Set(bookings.map(b => b.service))].sort((a, b) => a.localeCompare(b, "zh-TW")), [bookings]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-lg p-6 max-w-sm w-full">
          <h1 className="text-xl font-bold text-center mb-4 text-foreground">管理後台登入</h1>
          <div className="space-y-3">
            <Input type="password" placeholder="請輸入管理員密碼" value={password}
              onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            <Button className="w-full" onClick={handleLogin}>登入</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground">{shopInfoHook.info.store_name} · 管理後台</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setRateInput(Math.round(commission.commissionRate * 100).toString()); setCalendarNotesInput(calendarNotesHook.notes); setShopInfoInput(shopInfoHook.info); setBufferInput(bookingSettingsHook.settings.buffer_minutes.toString()); setFreeAddonInput(bookingSettingsHook.settings.free_addon_duration.toString()); setPreBlockInput(bookingSettingsHook.settings.pre_block_minutes.toString()); setShowSettings(true); }}>
              <Settings className="w-4 h-4 mr-1" /> 設定
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setAuthenticated(false); sessionStorage.removeItem("admin_auth"); }}>
              <LogOut className="w-4 h-4 mr-1" /> 登出
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v === "today" || v === "stats") commission.refetch(); }}>
          <TabsList className="w-full flex-wrap h-auto">
            <TabsTrigger value="today" className="flex-1">今日總覽</TabsTrigger>
            <TabsTrigger value="bookings" className="flex-1">預約列表</TabsTrigger>
            <TabsTrigger value="holidays" className="flex-1">公休設定</TabsTrigger>
            <TabsTrigger value="services" className="flex-1">服務管理</TabsTrigger>
            <TabsTrigger value="stats" className="flex-1">統計</TabsTrigger>
            <TabsTrigger value="customers" className="flex-1">客戶</TabsTrigger>
          </TabsList>

          {/* TODAY */}
          <TabsContent value="today" className="mt-4">
            <TodayDashboard
              bookings={bookings}
              holidays={holidays}
              loading={loading}
              commission={commission}
              blacklistedPhones={blacklistedPhones}
              onComplete={completeBooking}
              onUncomplete={uncompleteBooking}
              onCancel={(id, reason) => softDeleteBooking(id, reason)}
              onEdit={(b) => { openEditBooking(b as Booking); }}
            />
          </TabsContent>

          {/* BOOKINGS */}
          <TabsContent value="bookings" className="mt-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
                  <List className="w-4 h-4 mr-1" /> 列表
                </Button>
                <Button variant={viewMode === "calendar" ? "default" : "outline"} size="sm" onClick={() => setViewMode("calendar")}>
                  <CalendarDays className="w-4 h-4 mr-1" /> 月曆
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Switch checked={showCommissionCols} onCheckedChange={setShowCommissionCols} />
                  <span className="text-xs text-muted-foreground">顯示拆帳資訊</span>
                </div>
                <Button size="sm" onClick={() => setShowManualBooking(true)}>
                  <Plus className="w-4 h-4 mr-1" /> 新增預約
                </Button>
              </div>
            </div>

            {viewMode === "list" ? (
              <>
                <BookingFiltersBar filters={filters} onChange={setFilters} resultCount={filteredBookings.length} />
                <div className="bg-card rounded-xl shadow p-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        {([
                          { field: "order_time" as SortField, label: "下單時間" },
                          { field: "date" as SortField, label: "日期" },
                          { field: null, label: "時段" },
                        ] as const).map(({ field, label }) => (
                          <th key={label} className="text-left p-2">
                            {field ? (
                              <button
                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                                onClick={() => {
                                  if (filters.sortField === field) {
                                    setFilters({ ...filters, sortDirection: filters.sortDirection === "asc" ? "desc" : "asc" });
                                  } else {
                                    setFilters({ ...filters, sortField: field, sortDirection: "desc" });
                                  }
                                }}
                              >
                                {label}
                                {filters.sortField === field ? (
                                  filters.sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-40" />
                                )}
                              </button>
                            ) : label}
                          </th>
                        ))}
                        {/* Name filter popover */}
                        <th className="text-left p-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className={cn("flex items-center gap-1 hover:text-foreground transition-colors", filters.filterName && "text-primary font-semibold")}>
                                姓名 <ChevronDown className="w-3 h-3" />
                                {filters.filterName && <span className="text-xs bg-primary/10 text-primary rounded px-1">{filters.filterName}</span>}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2" align="start">
                              <div className="space-y-1">
                                <Input
                                  placeholder="搜尋姓名..."
                                  value={filters.filterName}
                                  onChange={(e) => setFilters({ ...filters, filterName: e.target.value })}
                                  className="h-8 text-sm"
                                />
                                <div className="max-h-40 overflow-y-auto space-y-0.5 mt-1">
                                  {filters.filterName && (
                                    <button className="w-full text-left text-xs px-2 py-1 rounded hover:bg-secondary text-destructive" onClick={() => setFilters({ ...filters, filterName: "" })}>
                                      ✕ 清除篩選
                                    </button>
                                  )}
                                  {uniqueNames
                                    .filter(n => !filters.filterName || n.toLowerCase().includes(filters.filterName.toLowerCase()))
                                    .slice(0, 20)
                                    .map(name => (
                                      <button key={name} className="w-full text-left text-xs px-2 py-1 rounded hover:bg-secondary truncate" onClick={() => setFilters({ ...filters, filterName: name })}>
                                        {name}
                                      </button>
                                    ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </th>
                        <th className="text-left p-2">電話</th>
                        {/* Service filter popover */}
                        <th className="text-left p-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className={cn("flex items-center gap-1 hover:text-foreground transition-colors", filters.filterService && "text-primary font-semibold")}>
                                服務 <ChevronDown className="w-3 h-3" />
                                {filters.filterService && <span className="text-xs bg-primary/10 text-primary rounded px-1 max-w-[80px] truncate">{filters.filterService}</span>}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-52 p-2" align="start">
                              <div className="space-y-1">
                                {filters.filterService && (
                                  <button className="w-full text-left text-xs px-2 py-1 rounded hover:bg-secondary text-destructive" onClick={() => setFilters({ ...filters, filterService: "" })}>
                                    ✕ 清除篩選
                                  </button>
                                )}
                                <div className="max-h-48 overflow-y-auto space-y-0.5">
                                  {uniqueServices.map(svc => (
                                    <button
                                      key={svc}
                                      className={cn("w-full text-left text-xs px-2 py-1 rounded hover:bg-secondary truncate", filters.filterService === svc && "bg-primary/10 text-primary font-medium")}
                                      onClick={() => setFilters({ ...filters, filterService: filters.filterService === svc ? "" : svc })}
                                    >
                                      {svc}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </th>
                        <th className="text-left p-2">加購</th>
                        {([
                          { field: "duration" as SortField, label: "時長" },
                          { field: "total_price" as SortField, label: "金額" },
                        ] as const).map(({ field, label }) => (
                          <th key={label} className="text-left p-2">
                            <button
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                              onClick={() => {
                                if (filters.sortField === field) {
                                  setFilters({ ...filters, sortDirection: filters.sortDirection === "asc" ? "desc" : "asc" });
                                } else {
                                  setFilters({ ...filters, sortField: field, sortDirection: "desc" });
                                }
                              }}
                            >
                              {label}
                              {filters.sortField === field ? (
                                filters.sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-40" />
                              )}
                            </button>
                          </th>
                        ))}
                        {showCommissionCols && (
                          <>
                            <th className="text-left p-2">公司差價</th>
                            <th className="text-left p-2">計算基底</th>
                            <th className="text-left p-2">師傅收入</th>
                          </>
                        )}
                        <th className="text-left p-2">來源</th>
                        <th className="text-left p-2">狀態</th>
                        <th className="p-2">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((b) => {
                        const isCancelled = !!b.cancelled_at || b.status === "cancelled";
                        return (
                        <React.Fragment key={b.id}>
                        <tr className={cn("border-b border-border hover:bg-secondary/50", isCancelled && "opacity-50", !isCancelled && blacklistedPhones.has(b.phone) && "bg-destructive/10")}>
                          <td className="p-2 whitespace-nowrap text-xs">{new Date(b.order_time).toLocaleString("zh-TW")}</td>
                          <td className="p-2 whitespace-nowrap">{b.date}</td>
                          <td className="p-2">{b.start_time_str}</td>
                          <td className="p-2">
                            <span className="flex items-center gap-1">
                              {blacklistedPhones.has(b.phone) && <span title="黑名單客戶"><Ban className="w-3.5 h-3.5 text-destructive shrink-0" /></span>}
                              {b.name}
                            </span>
                          </td>
                          <td className="p-2">{b.phone}</td>
                          <td className="p-2 max-w-[140px] truncate">{b.service}</td>
                          <td className="p-2 max-w-[100px] truncate">{b.addons?.join(", ") || "-"}</td>
                          <td className="p-2">{b.duration}分</td>
                          <td className="p-2 font-medium text-primary">NT${b.total_price.toLocaleString()}</td>
                          {showCommissionCols && (
                            <>
                              <td className="p-2 font-medium text-destructive">-NT${commission.getDeduction(b.service).toLocaleString()}</td>
                              <td className="p-2 text-muted-foreground">NT${commission.calcBase(b.total_price, b.service, b.addons).toLocaleString()}</td>
                              <td className="p-2 font-bold text-blue-600">
                                NT${(commission.calcTherapist(b.total_price, b.service, b.addons) + (b.oil_bonus || 0)).toLocaleString()}
                                {(b.oil_bonus || 0) > 0 && <span className="text-xs text-emerald-600 ml-1">(含精油+{b.oil_bonus})</span>}
                              </td>
                            </>
                          )}
                          <td className="p-2">
                            {(() => { const s = SOURCE_LABELS[b.source || "customer"]; return <Badge variant="outline" className={cn("text-xs", s?.color)}>{s?.label || "客人預約"}</Badge>; })()}
                          </td>
                          <td className="p-2">
                            <StatusBadge status={b.status} cancelledAt={b.cancelled_at} />
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-0.5 flex-wrap">
                              <Button variant="ghost" size="sm" title="撥打電話" onClick={() => window.open(`tel:${b.phone}`, '_self')}>
                                <Phone className="w-3.5 h-3.5 text-blue-600" />
                              </Button>
                              <Button variant="ghost" size="sm" title="備註" onClick={() => { setNoteBookingId(b.id); setNoteText(b.admin_note || ""); }}>
                                <StickyNote className={cn("w-3.5 h-3.5", b.admin_note ? "text-amber-600" : "text-muted-foreground")} />
                              </Button>
                              <Button variant="ghost" size="sm" title="編輯" onClick={() => openEditBooking(b)}>
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                              {isCancelled ? (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => restoreBooking(b.id)} title="復原">
                                    <RotateCcw className="w-3.5 h-3.5 text-primary" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" title="永久刪除"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>確認永久刪除？</AlertDialogTitle>
                                        <AlertDialogDescription>此操作無法復原。</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>取消</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => permanentDeleteBooking(b.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">確認刪除</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              ) : (
                                <>
                                  {b.status === "completed" ? (
                                    <Button variant="ghost" size="sm" title="取消完成" onClick={() => uncompleteBooking(b.id)}>
                                      <Undo2 className="w-3.5 h-3.5 text-amber-600" />
                                    </Button>
                                  ) : (
                                    <Button variant="ghost" size="sm" title="標記完成" onClick={() => completeBooking(b.id)}>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" title="取消預約" onClick={() => { setCancellingId(b.id); setCancelReason("客人取消"); }}>
                                    <X className="w-3.5 h-3.5 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isCancelled && b.cancel_reason && (
                          <tr className="border-b border-border opacity-50">
                            <td colSpan={showCommissionCols ? 14 : 12} className="px-2 py-1">
                              <span className="text-xs text-destructive">⚠️ 取消原因：{b.cancel_reason}</span>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                        );
                      })}
                      {filteredBookings.length === 0 && (
                        <tr><td colSpan={showCommissionCols ? 14 : 12} className="text-center text-muted-foreground p-8">沒有符合條件的預約</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <BookingCalendarView
                bookings={bookings}
                holidays={holidays}
                blacklistedPhones={blacklistedPhones}
                onEdit={openEditBooking}
                onComplete={completeBooking}
                onUncomplete={uncompleteBooking}
                onCancel={(id, reason) => softDeleteBooking(id, reason)}
                onRestore={restoreBooking}
                onNote={(id, note) => { setNoteBookingId(id); setNoteText(note || ""); }}
                allBookings={bookings}
              />
            )}
          </TabsContent>

          {/* HOLIDAYS */}
          <TabsContent value="holidays" className="mt-4 space-y-4">
            {/* Calendar view - always visible */}
            <div className="bg-card rounded-xl shadow p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-semibold text-foreground">📅 公休日曆（點擊日期管理公休）</h2>
                <div className="flex items-center gap-2">
                  <Select
                    value={holidayCalendarMonth.getFullYear().toString()}
                    onValueChange={(v) => setHolidayCalendarMonth(new Date(parseInt(v), holidayCalendarMonth.getMonth(), 1))}
                  >
                    <SelectTrigger className="w-[90px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                        <SelectItem key={y} value={y.toString()}>{y} 年</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={holidayCalendarMonth.getMonth().toString()}
                    onValueChange={(v) => setHolidayCalendarMonth(new Date(holidayCalendarMonth.getFullYear(), parseInt(v), 1))}
                  >
                    <SelectTrigger className="w-[80px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>{i + 1} 月</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setHolidayCalendarMonth(new Date())}>
                    本月
                  </Button>
                </div>
              </div>
              <Calendar
                mode="multiple"
                month={holidayCalendarMonth}
                onMonthChange={setHolidayCalendarMonth}
                selected={holidays.filter(h => h.type === "整天公休").map(h => parseISO(h.date))}
                onDayClick={(day) => handleCalendarDayClick(day)}
                className="rounded-md border pointer-events-auto"
                modifiers={{
                  holiday: holidays.filter(h => h.type === "整天公休").map(h => parseISO(h.date)),
                  partialHoliday: holidays.filter(h => h.type === "部分時段公休").map(h => parseISO(h.date)),
                  pending: Array.from(pendingHolidayDates).map(d => parseISO(d)),
                }}
                modifiersStyles={{
                  holiday: { backgroundColor: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))", borderRadius: "6px" },
                  partialHoliday: { backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))", borderRadius: "6px", border: "2px solid hsl(var(--destructive))" },
                  pending: { backgroundColor: "hsl(var(--primary) / 0.2)", color: "hsl(var(--primary))", borderRadius: "6px", border: "2px dashed hsl(var(--primary))" },
                }}
                numberOfMonths={2}
              />
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-destructive" />
                    <span>整天公休</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-accent border-2 border-destructive" />
                    <span>部分時段公休</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded border-2 border-dashed border-primary bg-primary/20" />
                    <span>待確認</span>
                  </div>
                </div>
                {pendingHolidayDates.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">已選 {pendingHolidayDates.size} 天</span>
                    <Button variant="outline" size="sm" onClick={() => setPendingHolidayDates(new Set())}>
                      清除
                    </Button>
                    <Button size="sm" onClick={savePendingHolidays} disabled={isSavingBatch}>
                      <Check className="w-4 h-4 mr-1" />
                      {isSavingBatch ? "儲存中..." : "確認新增公休"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Google Calendar embed */}
            {googleCalendarId && (
              <Collapsible open={showGoogleCalendar} onOpenChange={setShowGoogleCalendar}>
                <div className="bg-card rounded-xl shadow">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4">
                    <h2 className="font-semibold text-foreground">📆 Google 日曆即時檢視</h2>
                    <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4">
                    <div className="rounded-lg overflow-hidden border border-border">
                      <iframe
                        src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(googleCalendarId)}&ctz=Asia/Taipei&mode=WEEK&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTz=0`}
                        className="w-full border-0"
                        style={{ height: "600px" }}
                        title="Google Calendar"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      此為 Google 日曆即時內容，可確認預約與公休是否已正確同步
                    </p>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}

            {/* Manual add - collapsible */}
            <Collapsible>
              <div className="bg-card rounded-xl shadow">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4">
                  <h2 className="font-semibold text-foreground">➕ 手動新增公休</h2>
                  <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-sm">日期</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start", !hDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {hDate ? format(hDate, "yyyy-MM-dd") : "選擇日期"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={hDate} onSelect={setHDate} className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">類型</Label>
                      <Select value={hType} onValueChange={setHType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="整天公休">整天公休</SelectItem>
                          <SelectItem value="部分時段公休">部分時段公休</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {hType === "部分時段公休" && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-sm">開始時間</Label>
                          <Select value={hStart} onValueChange={setHStart}>
                            <SelectTrigger><SelectValue placeholder="選擇" /></SelectTrigger>
                            <SelectContent>
                              {timeSlots.map((s) => (
                                <SelectItem key={s} value={s.toString()}>{formatHourToTime(s)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">結束時間</Label>
                          <Select value={hEnd} onValueChange={setHEnd}>
                            <SelectTrigger><SelectValue placeholder="選擇" /></SelectTrigger>
                            <SelectContent>
                              {timeSlots.map((s) => (
                                <SelectItem key={s} value={s.toString()}>{formatHourToTime(s)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-sm">備註</Label>
                      <Input value={hNote} onChange={(e) => setHNote(e.target.value)} placeholder="選填" />
                    </div>
                  </div>
                  <Button onClick={addHoliday}>新增公休</Button>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Holiday list - collapsible */}
            <Collapsible>
              <div className="bg-card rounded-xl shadow">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4">
                  <h2 className="font-semibold text-foreground">📋 公休列表（{holidays.length} 筆）</h2>
                  <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left p-2">日期</th>
                          <th className="text-left p-2">類型</th>
                          <th className="text-left p-2">時段</th>
                          <th className="text-left p-2">備註</th>
                          <th className="p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {holidays.map((h) => (
                          <tr key={h.id} className="border-b border-border">
                            <td className="p-2">{h.date}</td>
                            <td className="p-2">{h.type}</td>
                            <td className="p-2">{h.type === "部分時段公休" && h.start_hour != null ? `${formatHourToTime(h.start_hour)} ~ ${formatHourToTime(h.end_hour!)}` : "-"}</td>
                            <td className="p-2">{h.note || "-"}</td>
                            <td className="p-2">
                              <Button variant="ghost" size="sm" onClick={() => deleteHoliday(h.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {holidays.length === 0 && (
                          <tr><td colSpan={5} className="text-center text-muted-foreground p-8">尚無公休設定</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </TabsContent>

          {/* SERVICES */}
          <TabsContent value="services" className="mt-4">
            <ServiceManagement onOpenSettings={() => { setRateInput(Math.round(commission.commissionRate * 100).toString()); setCalendarNotesInput(calendarNotesHook.notes); setShopInfoInput(shopInfoHook.info); setShowSettings(true); }} />
          </TabsContent>

          {/* STATS */}
          <TabsContent value="stats" className="mt-4">
            <StatsDashboard bookings={bookings} loading={loading} commission={commission} />
          </TabsContent>

          {/* CUSTOMERS */}
          <TabsContent value="customers" className="mt-4">
            <CustomerTracking />
          </TabsContent>
        </Tabs>
      </div>

      {/* Cancel dialog */}
      <Dialog open={!!cancellingId} onOpenChange={(open) => !open && setCancellingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>取消預約</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label className="text-sm">取消原因</Label>
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="客人取消">客人取消</SelectItem>
                <SelectItem value="師傅公休">師傅公休</SelectItem>
                <SelectItem value="其他">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancellingId(null)}>返回</Button>
            <Button variant="destructive" onClick={() => cancellingId && softDeleteBooking(cancellingId, cancelReason)}>確認取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note dialog */}
      <Dialog open={!!noteBookingId} onOpenChange={(open) => !open && setNoteBookingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>管理員備註</DialogTitle></DialogHeader>
          <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="輸入備註..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteBookingId(null)}>取消</Button>
            <Button onClick={saveNote}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual booking dialog */}
      <Dialog open={showManualBooking} onOpenChange={setShowManualBooking}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>手動新增預約</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">姓名 *</Label>
                <Input value={manualForm.name} onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">電話 *</Label>
                <Input value={manualForm.phone} onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">服務 *</Label>
              <Select value={manualForm.service} onValueChange={(v) => {
                const svc = servicesList.find((s) => s.name === v);
                setManualForm({ ...manualForm, service: v, duration: svc?.duration || 60, total_price: svc?.price || 0, addons: [] });
              }}>
                <SelectTrigger><SelectValue placeholder="選擇服務" /></SelectTrigger>
                <SelectContent>
                  {servicesList.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name} - NT${s.price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Addons */}
            {manualForm.service && (() => {
              const selectedSvc = servicesList.find((s) => s.name === manualForm.service);
              const category = selectedSvc?.category || '';
              if (category === 'package') return null;
              const filtered = addonsList.filter((a: any) => {
                if (a.addon_type === '精油香味') return false;
                if (a.applicable_categories && a.applicable_categories.length > 0) {
                  return a.applicable_categories.includes(category);
                }
                return true;
              });
              if (filtered.length === 0) return null;
              return (
                <div className="space-y-1">
                  <Label className="text-sm">加購項目</Label>
                  <div className="space-y-1">
                    {filtered.map((addon: any) => {
                      const checked = manualForm.addons.includes(addon.name);
                      return (
                        <label key={addon.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const newAddons = checked
                                ? manualForm.addons.filter((a) => a !== addon.name)
                                : [...manualForm.addons, addon.name];
                              const svc = servicesList.find((s) => s.name === manualForm.service);
                              const basePrice = svc?.price || 0;
                              const baseDuration = svc?.duration || 60;
                              const addonPrice = newAddons.reduce((sum, name) => {
                                const a = addonsList.find((x: any) => x.name === name);
                                return sum + (a?.extra_price || 0);
                              }, 0);
                              const addonDuration = newAddons.reduce((sum, name) => {
                                const a = addonsList.find((x: any) => x.name === name);
                                return sum + (a?.extra_duration || 0);
                              }, 0);
                              setManualForm({ ...manualForm, addons: newAddons, total_price: basePrice + addonPrice, duration: baseDuration + addonDuration });
                            }}
                            className="rounded"
                          />
                          {addon.name} {addon.extra_price > 0 ? `+NT$${addon.extra_price}` : ''} {addon.extra_duration > 0 ? `+${addon.extra_duration}分` : ''}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">日期 *</Label>
                <Input type="date" value={manualForm.date} onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">時段 *</Label>
                <Select value={manualForm.start_hour.toString()} onValueChange={(v) => setManualForm({ ...manualForm, start_hour: parseFloat(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((s) => (
                      <SelectItem key={s} value={s.toString()}>{formatHourToTime(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">時長（分鐘）</Label>
                <Input type="number" value={manualForm.duration} onChange={(e) => setManualForm({ ...manualForm, duration: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">金額</Label>
                <Input type="number" value={manualForm.total_price} onChange={(e) => setManualForm({ ...manualForm, total_price: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">預約來源</Label>
              <Select value={manualForm.source} onValueChange={(v) => setManualForm({ ...manualForm, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">系統代訂（師傅）</SelectItem>
                  <SelectItem value="front_desk">櫃檯代訂</SelectItem>
                  <SelectItem value="customer">客人自行預約</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualBooking(false)}>取消</Button>
            <Button onClick={createManualBooking}>建立預約</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>⚙️ 系統設定</DialogTitle></DialogHeader>
          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className="text-sm font-medium">店名</Label>
              <Input value={shopInfoInput.store_name} onChange={(e) => setShopInfoInput(prev => ({ ...prev, store_name: e.target.value }))} placeholder="例：不老松足湯安平店" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">師傅名稱</Label>
              <Input value={shopInfoInput.therapist_name} onChange={(e) => setShopInfoInput(prev => ({ ...prev, therapist_name: e.target.value }))} placeholder="例：嘉豪師傅" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">地點（日曆顯示）</Label>
              <Input value={shopInfoInput.store_location} onChange={(e) => setShopInfoInput(prev => ({ ...prev, store_location: e.target.value }))} placeholder="例：不老松足湯安平店" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">地址（預約頁底部）</Label>
              <Input value={shopInfoInput.store_address} onChange={(e) => setShopInfoInput(prev => ({ ...prev, store_address: e.target.value }))} placeholder="例：台南市安平區 · 不老松足湯安平店" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">師傅抽成比例</Label>
              <div className="flex items-center gap-2">
                <Input type="number" className="w-24" value={rateInput} onChange={(e) => setRateInput(e.target.value)} min={1} max={99} />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                目前設定：師傅 {rateInput}% / 店家 {100 - (parseInt(rateInput) || 0)}%
              </p>
            </div>
            <div className="border-t border-border pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">預約時段設定</h3>
              <div className="space-y-2">
                <Label className="text-sm font-medium">預約間隔緩衝時間</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" className="w-24" value={bufferInput} onChange={(e) => setBufferInput(e.target.value)} min={0} max={60} />
                  <span className="text-sm text-muted-foreground">分鐘</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  每筆預約結束後保留的緩衝時間，避免預約太密集
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">免費泡腳肩頸時長</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" className="w-24" value={freeAddonInput} onChange={(e) => setFreeAddonInput(e.target.value)} min={0} max={30} />
                  <span className="text-sm text-muted-foreground">分鐘</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  免費贈送的泡腳肩頸時長，會加入服務顯示時長與佔用時段
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">前方預約保護時間</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" className="w-24" value={preBlockInput} onChange={(e) => setPreBlockInput(e.target.value)} min={0} max={120} />
                  <span className="text-sm text-muted-foreground">分鐘</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  超過 60 分鐘的服務，若前方有預約在此時間內開始，則不接新客
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Google 日曆注意事項</Label>
              <Textarea
                className="min-h-[120px] text-sm"
                value={calendarNotesInput}
                onChange={(e) => setCalendarNotesInput(e.target.value)}
                placeholder="輸入要顯示在 Google 日曆描述中的注意事項..."
              />
              <p className="text-xs text-muted-foreground">
                此內容會顯示在客人加入 Google 日曆時的事件描述底部
              </p>
            </div>
            <div className="border-t border-border pt-4 space-y-2">
              <Label className="text-sm font-medium">修改管理員密碼</Label>
              <Input
                type="password"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="留空則不修改"
              />
              <p className="text-xs text-muted-foreground">
                輸入新密碼後儲存即可變更，留空則維持原密碼
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>取消</Button>
            <Button onClick={saveSettings}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit booking dialog */}
      <Dialog open={!!editingBooking} onOpenChange={(open) => !open && setEditingBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>編輯預約</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">姓名</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">電話</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">服務</Label>
              <Select value={editForm.service} onValueChange={(v) => {
                const svc = servicesList.find((s) => s.name === v);
                setEditForm({ ...editForm, service: v, duration: svc?.duration || editForm.duration, total_price: svc?.price || editForm.total_price });
              }}>
                <SelectTrigger><SelectValue placeholder="選擇服務" /></SelectTrigger>
                <SelectContent>
                  {servicesList.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name} - NT${s.price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">日期</Label>
                <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">開始時段</Label>
                <Select value={editForm.start_hour.toString()} onValueChange={(v) => setEditForm({ ...editForm, start_hour: parseFloat(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((s) => (
                      <SelectItem key={s} value={s.toString()}>{formatHourToTime(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">時長（分鐘）</Label>
                <Input type="number" value={editForm.duration} onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">金額</Label>
                <Input type="number" value={editForm.total_price} onChange={(e) => setEditForm({ ...editForm, total_price: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">預約來源</Label>
              <Select value={editForm.source} onValueChange={(v) => setEditForm({ ...editForm, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">客人自行預約</SelectItem>
                  <SelectItem value="admin">系統代訂（師傅）</SelectItem>
                  <SelectItem value="front_desk">櫃檯代訂</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">精油推薦獎金</Label>
              <div className="flex items-center gap-2">
                <Input type="text" inputMode="numeric" className="w-24" value={editForm.oil_bonus} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setEditForm({ ...editForm, oil_bonus: v ? parseInt(v, 10) : 0 }); }} min={0} />
                <span className="text-sm text-muted-foreground">元</span>
              </div>
              <p className="text-xs text-muted-foreground">師傅自己推薦精油升級時填入（例：100），櫃檯推薦則保持 0</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBooking(null)}>取消</Button>
            <Button onClick={saveEditBooking}>儲存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Holiday day-click dialog */}
      <Dialog open={!!holidayClickedDate} onOpenChange={(open) => !open && setHolidayClickedDate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>📅 {holidayClickedDate} 公休管理</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Show existing holidays for this date */}
            {holidays.filter(h => h.date === holidayClickedDate).length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">已設定的公休：</Label>
                {holidays.filter(h => h.date === holidayClickedDate).map(h => (
                  <div key={h.id} className="flex items-center justify-between bg-secondary/50 rounded-lg p-2">
                    <div className="text-sm">
                      <span className="font-medium">{h.type}</span>
                      {h.type === "部分時段公休" && h.start_hour != null && (
                        <span className="text-muted-foreground ml-2">{formatHourToTime(h.start_hour)} ~ {formatHourToTime(h.end_hour!)}</span>
                      )}
                      {h.note && <span className="text-muted-foreground ml-2">({h.note})</span>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { deleteHoliday(h.id); }}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new holiday for this date */}
            <div className="border-t border-border pt-3 space-y-3">
              <Label className="text-sm font-medium">新增公休：</Label>
              <Select value={holidayDialogType} onValueChange={(v) => setHolidayDialogType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="整天公休">整天公休</SelectItem>
                  <SelectItem value="部分時段公休">部分時段公休</SelectItem>
                </SelectContent>
              </Select>
              {holidayDialogType === "部分時段公休" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">開始</Label>
                    <Select value={holidayDialogStart} onValueChange={setHolidayDialogStart}>
                      <SelectTrigger><SelectValue placeholder="選擇" /></SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((s) => (
                          <SelectItem key={s} value={s.toString()}>{formatHourToTime(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">結束</Label>
                    <Select value={holidayDialogEnd} onValueChange={setHolidayDialogEnd}>
                      <SelectTrigger><SelectValue placeholder="選擇" /></SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((s) => (
                          <SelectItem key={s} value={s.toString()}>{formatHourToTime(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <Input value={holidayDialogNote} onChange={(e) => setHolidayDialogNote(e.target.value)} placeholder="備註（選填）" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHolidayClickedDate(null)}>關閉</Button>
            <Button onClick={addHolidayFromDialog}>新增公休</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status, cancelledAt }: { status: string | null; cancelledAt: string | null }) {
  if (cancelledAt || status === "cancelled") return <Badge variant="destructive" className="text-xs">已取消</Badge>;
  if (status === "completed") return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">已完成</Badge>;
  return <Badge variant="secondary" className="text-xs">已確認</Badge>;
}
