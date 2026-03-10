import { useState, useEffect, useMemo } from "react";
import { format, addDays, isToday } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Clock, CalendarDays, DollarSign, AlertTriangle, Briefcase, Building2, Wallet, ChevronLeft, ChevronRight, CalendarIcon, Ban, Check, X, Pencil, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { formatHourToTime } from "@/lib/services";

interface Booking {
  id: string;
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
  cancel_reason: string | null;
  status: string | null;
  oil_bonus: number;
}

interface Holiday {
  date: string;
  type: string;
  start_hour: number | null;
  end_hour: number | null;
}

interface CommissionHelpers {
  calcBase: (totalPrice: number, serviceName: string, addons?: string[] | null) => number;
  calcTherapist: (totalPrice: number, serviceName: string, addons?: string[] | null) => number;
  calcShop: (totalPrice: number, serviceName: string, addons?: string[] | null) => number;
  getDeduction: (serviceName: string) => number;
  commissionRate: number;
}

const SERVICE_COLORS: Record<string, string> = {
  foot: "bg-emerald-100 text-emerald-800 border-emerald-200",
  body: "bg-blue-100 text-blue-800 border-blue-200",
  "fascia-foot": "bg-orange-100 text-orange-800 border-orange-200",
  "fascia-body": "bg-orange-100 text-orange-800 border-orange-200",
  combo: "bg-purple-100 text-purple-800 border-purple-200",
  package: "bg-purple-100 text-purple-800 border-purple-200",
};

function getCategoryFromService(serviceName: string): string {
  if (serviceName.includes("套餐")) return "package";
  if (serviceName.includes("深層雙拼")) return "combo";
  if (serviceName.includes("筋膜刀【腳底】") || serviceName.includes("筋膜刀腳底")) return "fascia-foot";
  if (serviceName.includes("筋膜刀【身體】") || serviceName.includes("筋膜刀身體") || serviceName.includes("筋膜刀")) return "fascia-body";
  if (serviceName.includes("全身指壓") || serviceName.includes("全身")) return "body";
  return "foot";
}

export default function TodayDashboard({
  bookings,
  holidays,
  loading,
  commission,
  blacklistedPhones,
  onComplete,
  onUncomplete,
  onCancel,
  onEdit,
}: {
  bookings: Booking[];
  holidays: Holiday[];
  loading: boolean;
  commission?: CommissionHelpers;
  blacklistedPhones?: Set<string>;
  onComplete?: (id: string) => void;
  onUncomplete?: (id: string) => void;
  onCancel?: (id: string, reason: string) => void;
  onEdit?: (booking: Booking) => void;
}) {
  const [now, setNow] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isViewingToday = isToday(selectedDate);
  const viewDateStr = format(selectedDate, "yyyy-MM-dd");

  const dayBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.date === viewDateStr)
        .sort((a, b) => a.start_hour - b.start_hour),
    [bookings, viewDateStr]
  );

  const activeBookings = dayBookings.filter((b) => !b.cancelled_at && b.status !== "cancelled");
  const cancelledCount = dayBookings.filter((b) => b.cancelled_at || b.status === "cancelled").length;

  const completedBookings = activeBookings.filter((b) => b.status === "completed");
  const dayRevenue = completedBookings.reduce((sum, b) => sum + b.total_price, 0);

  const currentHourRaw = now.getHours() + now.getMinutes() / 60;
  const adjustedCurrentHour = currentHourRaw < 6 ? currentHourRaw + 24 : currentHourRaw;

  const nextBooking = isViewingToday ? dayBookings.find((b) => b.start_hour > adjustedCurrentHour) : null;
  const minutesUntilNext = nextBooking
    ? Math.round((nextBooking.start_hour - adjustedCurrentHour) * 60)
    : null;

  const isHolidayOnDate = holidays.some((h) => h.date === viewDateStr && h.type === "整天公休");
  const totalSlots = 24;
  const bookedSlots = activeBookings.length;
  const availableSlots = isHolidayOnDate ? 0 : Math.max(0, totalSlots - bookedSlots);
  const completedCount = completedBookings.length;

  // Commission calculations - only count completed bookings
  const dayDeductionTotal = commission ? completedBookings.reduce((s, b) => s + commission.getDeduction(b.service), 0) : 0;
  const dayBaseTotal = commission ? completedBookings.reduce((s, b) => s + commission.calcBase(b.total_price, b.service, b.addons), 0) : 0;
  const dayOilBonus = completedBookings.reduce((s, b) => s + (b.oil_bonus || 0), 0);
  const dayTherapist = commission ? completedBookings.reduce((s, b) => s + commission.calcTherapist(b.total_price, b.service, b.addons), 0) + dayOilBonus : 0;
  const dayShop = commission ? completedBookings.reduce((s, b) => s + commission.calcShop(b.total_price, b.service, b.addons), 0) : 0;

  const dateLabel = isViewingToday ? "今日" : format(selectedDate, "M/d");

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <>
    <div className="space-y-4">
      {/* Date navigation + live clock */}
      <div className="bg-card rounded-xl shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-foreground tracking-wide font-mono">
              {format(now, "HH:mm:ss")}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(now, "yyyy年M月d日 (EEEE)", { locale: zhTW })}
            </div>
          </div>
          {isHolidayOnDate && (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              {isViewingToday ? "今日公休" : "該日公休"}
            </Badge>
          )}
        </div>

        {/* Date switcher */}
        <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-border">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(d => addDays(d, -1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant={isViewingToday ? "default" : "outline"} size="sm" className="min-w-[140px] gap-1.5">
                <CalendarIcon className="w-4 h-4" />
                {isViewingToday
                  ? "今天"
                  : format(selectedDate, "M月d日 (EEE)", { locale: zhTW })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => { if (d) { setSelectedDate(d); setCalendarOpen(false); } }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(d => addDays(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>

          {!isViewingToday && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedDate(new Date())}>
              回今天
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <CalendarDays className="w-4 h-4" />
            {dateLabel}預約
          </div>
          <div className="text-2xl font-bold text-foreground">{dayBookings.length} 筆</div>
          {completedCount > 0 && (
            <div className="text-xs text-muted-foreground mt-1">已完成 {completedCount} 筆</div>
          )}
        </div>

        <div className="bg-card rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            {dateLabel}營業額
          </div>
          <div className="text-2xl font-bold text-primary">NT${dayRevenue.toLocaleString()}</div>
        </div>

        <div className="bg-card rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <AlertTriangle className="w-4 h-4" />
            {dateLabel}空檔
          </div>
          <div className="text-2xl font-bold text-foreground">{availableSlots} 個</div>
        </div>

        <div className="bg-card rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Clock className="w-4 h-4" />
            下一位
          </div>
          {nextBooking ? (
            <>
              <div className="text-lg font-bold text-foreground truncate flex items-center gap-1">
                {blacklistedPhones?.has(nextBooking.phone) && <span title="黑名單客戶"><Ban className="w-4 h-4 text-destructive shrink-0" /></span>}
                {nextBooking.name} {nextBooking.start_time_str}
              </div>
              <div className="text-xs text-primary font-medium">
                還有 {minutesUntilNext! > 60 ? `${Math.floor(minutesUntilNext! / 60)}小時${minutesUntilNext! % 60}分` : `${minutesUntilNext}分鐘`}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              {isViewingToday ? "無後續預約" : "—"}
            </div>
          )}
        </div>
      </div>

      {/* Commission cards */}
      {commission && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="w-4 h-4" />
              {dateLabel}公司差價
            </div>
            <div className="text-xl font-bold text-destructive">-NT${dayDeductionTotal.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-0.5">售價扣除金額</div>
          </div>
          <div className="bg-card rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Briefcase className="w-4 h-4" />
              {dateLabel}業績基底
            </div>
            <div className="text-xl font-bold text-muted-foreground">NT${dayBaseTotal.toLocaleString()}</div>
          </div>
          <div className="bg-card rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Wallet className="w-4 h-4" />
              {dateLabel}師傅收入
            </div>
            <div className="text-xl font-bold text-blue-600">NT${dayTherapist.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              ×{commission.commissionRate} 計算
              {dayOilBonus > 0 && <span className="text-emerald-600 ml-1">（含精油獎金 NT${dayOilBonus.toLocaleString()}）</span>}
            </div>
          </div>
          <div className="bg-card rounded-xl shadow p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Building2 className="w-4 h-4" />
              店家抽成
            </div>
            <div className="text-xl font-bold text-orange-600">NT${dayShop.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-0.5">×{(1 - commission.commissionRate).toFixed(1)} 店家</div>
          </div>
        </div>
      )}

      {/* Day's bookings list */}
      <div className="bg-card rounded-xl shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-semibold text-foreground">
            📋 {isViewingToday ? "今日" : format(selectedDate, "M/d", { locale: zhTW })} 預約時程
          </h2>
          {isViewingToday && (() => {
            const overdueCount = activeBookings.filter(b => 
              b.status !== "completed" && 
              b.start_hour + b.duration / 60 < adjustedCurrentHour
            ).length;
            return overdueCount > 0 ? (
              <Badge variant="outline" className="text-xs border-orange-400 text-orange-600 bg-orange-50 animate-pulse">
                ⚠️ {overdueCount} 筆待完成
              </Badge>
            ) : null;
          })()}
          {completedCount > 0 && (
            <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-600 bg-emerald-50">
              ✅ {completedCount}/{activeBookings.length}
            </Badge>
          )}
          {cancelledCount > 0 && (
            <Badge variant="outline" className="text-xs border-muted text-muted-foreground">
              ❌ 取消 {cancelledCount}
            </Badge>
          )}
        </div>
        {dayBookings.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {isHolidayOnDate ? (isViewingToday ? "今日公休，無預約" : "該日公休，無預約") : (isViewingToday ? "今日尚無預約" : "該日尚無預約")}
          </div>
        ) : (
          <div className="space-y-2">
            {dayBookings.map((b) => {
              const cat = getCategoryFromService(b.service);
              const colorClass = SERVICE_COLORS[cat] || SERVICE_COLORS.foot;
              const isCancelled = !!b.cancelled_at || b.status === "cancelled";
              const endHour = b.start_hour + b.duration / 60;
              const isPast = isViewingToday && b.start_hour < adjustedCurrentHour;
              const isCurrent =
                isViewingToday &&
                !isCancelled &&
                b.start_hour <= adjustedCurrentHour &&
                endHour > adjustedCurrentHour;
              const isOverdue = isViewingToday && !isCancelled && b.status !== "completed" && endHour < adjustedCurrentHour;

              const base = commission ? commission.calcBase(b.total_price, b.service, b.addons) : null;
              const therapist = commission ? commission.calcTherapist(b.total_price, b.service, b.addons) + (b.oil_bonus || 0) : null;

              return (
                <div
                  key={b.id}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    isCancelled && "opacity-40 border-border bg-muted/30 line-through decoration-muted-foreground/40",
                    !isCancelled && isCurrent && "border-primary bg-primary/5 ring-2 ring-primary/20",
                    !isCancelled && isOverdue && "border-orange-400 bg-orange-50/80 ring-1 ring-orange-200",
                    !isCancelled && !isCurrent && !isOverdue && isPast && "border-border opacity-60",
                    !isCancelled && !isCurrent && !isOverdue && !isPast && "border-border hover:bg-secondary/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono font-medium text-foreground w-14 shrink-0">
                      {b.start_time_str}
                    </div>
                    <div className={`px-2 py-0.5 rounded text-xs border ${colorClass}`}>
                      {b.duration}分
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate flex items-center gap-1">
                        {blacklistedPhones?.has(b.phone) && <span title="黑名單客戶"><Ban className="w-3.5 h-3.5 text-destructive shrink-0" /></span>}
                        {b.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {b.service}
                        {b.addons && b.addons.filter(a => !a.includes("精油香味")).length > 0 && (
                          <span className="text-blue-600 ml-1">
                            +{b.addons.filter(a => !a.includes("精油香味")).map(a => {
                              const short = a.replace(/^(加購：|升級：)/, '').replace(/\s*\(.*\)/, '');
                              return short;
                            }).join('、')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-primary shrink-0 text-right">
                      <div>NT${b.total_price.toLocaleString()}</div>
                      {b.addons && b.addons.filter(a => !a.includes("精油香味")).length > 0 && (
                        <div className="text-[10px] text-muted-foreground font-normal">含加購</div>
                      )}
                    </div>
                    {b.status === "completed" && (
                      <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 shrink-0">
                        ✅ 完成
                      </Badge>
                    )}
                    {isOverdue && (
                      <Badge variant="outline" className="text-xs border-orange-400 text-orange-600 bg-orange-50 shrink-0 animate-pulse">
                        ⚠️ 待完成
                      </Badge>
                    )}
                    {isCurrent && (
                      <Badge className="bg-primary text-primary-foreground text-xs shrink-0 animate-pulse">
                        進行中
                      </Badge>
                    )}
                    {isCancelled && (
                      <Badge variant="outline" className="text-xs border-muted text-muted-foreground shrink-0">
                        已取消
                      </Badge>
                    )}
                  </div>
                  {/* Quick action buttons - hide for cancelled */}
                  {!isCancelled && (
                    <div className="flex items-center gap-1.5 mt-2 ml-[68px]">
                      {b.status !== "completed" ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={() => onComplete?.(b.id)}>
                          <Check className="w-3 h-3" /> 完成
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => onUncomplete?.(b.id)}>
                          <Undo2 className="w-3 h-3" /> 改回確認
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onEdit?.(b)}>
                        <Pencil className="w-3 h-3" /> 編輯
                      </Button>
                      {cancellingId === b.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            placeholder="取消原因"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="h-7 text-xs w-28"
                          />
                          <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => setConfirmCancelOpen(true)}>
                            確認取消
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setCancellingId(null); setCancelReason(""); }}>
                            取消
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setCancellingId(b.id)}>
                          <X className="w-3 h-3" /> 取消預約
                        </Button>
                      )}
                    </div>
                  )}
                  {isCancelled && b.cancel_reason && (
                    <div className="mt-1 ml-[68px] text-xs text-muted-foreground">
                      取消原因：{b.cancel_reason}
                    </div>
                  )}
                  {!isCancelled && commission && base !== null && (
                    <div className="mt-1 ml-[68px] text-xs text-muted-foreground">
                      售價 NT${b.total_price.toLocaleString()} → <span className="text-destructive">差價 -NT${commission.getDeduction(b.service).toLocaleString()}</span> → 基底 NT${base.toLocaleString()} → <span className="text-blue-600 font-medium">師傅 NT${therapist!.toLocaleString()}</span>{(b.oil_bonus || 0) > 0 && <span className="text-emerald-600"> (含精油+{b.oil_bonus})</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

      <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認取消預約？</AlertDialogTitle>
            <AlertDialogDescription>
              {cancellingId && (() => {
                const target = dayBookings.find(b => b.id === cancellingId);
                return target ? `${target.name} - ${target.service}（${target.start_time_str}）` : "";
              })()}
              <br />
              取消原因：{cancelReason || "管理員取消"}
              <br /><br />
              此操作無法復原，確定要取消這筆預約嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmCancelOpen(false)}>返回</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (cancellingId) {
                  onCancel?.(cancellingId, cancelReason || "管理員取消");
                }
                setConfirmCancelOpen(false);
                setCancellingId(null);
                setCancelReason("");
              }}
            >
              確認取消
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
