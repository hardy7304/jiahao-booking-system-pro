import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, getDay } from "date-fns";
import { zhTW } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Ban, Pencil, Check, X, RotateCcw, Phone, StickyNote, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatHourToTime } from "@/lib/services";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  admin_note?: string | null;
  oil_bonus?: number;
  source?: string | null;
  completed_at?: string | null;
  order_time?: string;
}

interface Holiday {
  date: string;
  type: string;
  note: string | null;
}

function getCategoryColor(serviceName: string): string {
  if (serviceName.includes("套餐") || serviceName.includes("深層雙拼")) return "bg-purple-200 text-purple-900 border-purple-300";
  if (serviceName.includes("筋膜刀")) return "bg-orange-200 text-orange-900 border-orange-300";
  if (serviceName.includes("全身指壓") || serviceName.includes("全身")) return "bg-blue-200 text-blue-900 border-blue-300";
  return "bg-emerald-200 text-emerald-900 border-emerald-300";
}

function getCategoryDot(serviceName: string): string {
  if (serviceName.includes("套餐") || serviceName.includes("深層雙拼")) return "bg-purple-500";
  if (serviceName.includes("筋膜刀")) return "bg-orange-500";
  if (serviceName.includes("全身指壓") || serviceName.includes("全身")) return "bg-blue-500";
  return "bg-emerald-500";
}

function getStatusBorder(status: string | null, cancelledAt: string | null): string {
  if (cancelledAt || status === "cancelled") return "border-l-4 border-l-destructive";
  if (status === "completed") return "border-l-4 border-l-emerald-500";
  return "border-l-4 border-l-primary";
}

function getShortService(serviceName: string): string {
  if (serviceName.includes("腳底")) {
    const match = serviceName.match(/(\d+)分/);
    return `腳底${match ? match[1] : ""}`;
  }
  if (serviceName.includes("全身指壓")) {
    const match = serviceName.match(/(\d+)分/);
    return `指壓${match ? match[1] : ""}`;
  }
  if (serviceName.includes("筋膜刀【腳底】") || serviceName.includes("筋膜刀腳底")) {
    const match = serviceName.match(/(\d+)分/);
    return `筋膜腳${match ? match[1] : ""}`;
  }
  if (serviceName.includes("筋膜刀")) {
    const match = serviceName.match(/(\d+)分/);
    return `筋膜${match ? match[1] : ""}`;
  }
  if (serviceName.includes("套餐")) {
    const nameMatch = serviceName.match(/^(.+?)套餐/);
    return nameMatch ? `${nameMatch[1]}套` : "套餐";
  }
  if (serviceName.includes("深層雙拼")) return "雙拼";
  return serviceName.substring(0, 4);
}

function checkConflict(booking: Booking, allBookings: Booking[], newDate: string, newStartHour: number, newDuration: number): Booking | null {
  const endHour = newStartHour + newDuration / 60;
  for (const b of allBookings) {
    if (b.id === booking.id) continue;
    if (b.date !== newDate) continue;
    if (b.cancelled_at || b.status === "cancelled") continue;
    const bEnd = b.start_hour + b.duration / 60;
    if (newStartHour < bEnd && endHour > b.start_hour) {
      return b;
    }
  }
  return null;
}

export default function BookingCalendarView({
  bookings,
  holidays,
  blacklistedPhones,
  onEdit,
  onComplete,
  onUncomplete,
  onCancel,
  onRestore,
  onNote,
  allBookings,
}: {
  bookings: Booking[];
  holidays: Holiday[];
  blacklistedPhones?: Set<string>;
  onEdit?: (b: Booking) => void;
  onComplete?: (id: string) => void;
  onUncomplete?: (id: string) => void;
  onCancel?: (id: string, reason: string) => void;
  onRestore?: (id: string) => void;
  onNote?: (id: string, note: string | null) => void;
  allBookings?: Booking[];
}) {
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [cancelDialogId, setCancelDialogId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("客人取消");

  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const holidayMap = useMemo(() => {
    const map: Record<string, Holiday> = {};
    holidays.forEach((h) => {
      if (h.type === "整天公休") map[h.date] = h;
    });
    return map;
  }, [holidays]);

  const getBookingsForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return bookings.filter((b) => b.date === dateStr && !b.cancelled_at && b.status !== "cancelled").sort((a, b) => a.start_hour - b.start_hour);
  };

  const getCancelledCountForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return bookings.filter((b) => b.date === dateStr && (b.cancelled_at || b.status === "cancelled")).length;
  };

  const getCompletedCountForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return bookings.filter((b) => b.date === dateStr && b.status === "completed").length;
  };

  const getAllBookingsForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return bookings.filter((b) => b.date === dateStr).sort((a, b) => a.start_hour - b.start_hour);
  };

  const selectedDayBookings = selectedDay ? getAllBookingsForDay(selectedDay) : [];

  const padStart = (getDay(monthStart) + 6) % 7;

  const handleCancel = () => {
    if (cancelDialogId && onCancel) {
      onCancel(cancelDialogId, cancelReason);
      setCancelDialogId(null);
      setCancelReason("客人取消");
    }
  };

  return (
    <div className="bg-card rounded-xl shadow p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="sm" onClick={() => setCalendarDate((d) => subMonths(d, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground text-lg">
            {format(calendarDate, "yyyy年M月", { locale: zhTW })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setCalendarDate(new Date())}>
            今天
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCalendarDate((d) => addMonths(d, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: padStart }).map((_, i) => (
          <div key={`pad-${i}`} className="min-h-[80px] md:min-h-[100px]" />
        ))}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayBookings = getBookingsForDay(day);
          const isToday = isSameDay(day, new Date());
          const isHoliday = !!holidayMap[dateStr];
          const cancelledCount = getCancelledCountForDay(day);
          const completedCount = getCompletedCountForDay(day);

          return (
            <div
              key={dateStr}
              className={cn(
                "border rounded-lg p-1 min-h-[80px] md:min-h-[100px] cursor-pointer transition-colors relative",
                isToday && "border-primary border-2 bg-primary/5",
                isHoliday && "bg-destructive/10 border-destructive/30",
                !isToday && !isHoliday && "border-border hover:bg-secondary/30"
              )}
              onClick={() => setSelectedDay(day)}
            >
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <span className={cn("text-xs font-medium", isToday ? "text-primary font-bold" : "text-foreground")}>
                  {format(day, "d")}
                </span>
                {completedCount > 0 && (
                  <span className="text-[9px] text-emerald-600 leading-none">✅{completedCount}</span>
                )}
                {cancelledCount > 0 && (
                  <span className="text-[9px] text-muted-foreground leading-none">❌{cancelledCount}</span>
                )}
              </div>
              {isHoliday && (
                <div className="text-[10px] text-destructive font-medium text-center">公休</div>
              )}
              {/* Desktop: show pills with status color */}
              <div className="hidden md:block space-y-0.5">
                {dayBookings.slice(0, 3).map((b) => (
                  <div
                    key={b.id}
                    className={cn(
                      "text-[10px] px-1 py-0.5 rounded truncate border flex items-center gap-0.5",
                      getStatusBorder(b.status, b.cancelled_at),
                      getCategoryColor(b.service),
                      blacklistedPhones?.has(b.phone) && "!bg-destructive/20 !border-destructive/40 !text-destructive"
                    )}
                  >
                    {blacklistedPhones?.has(b.phone) && <Ban className="w-2.5 h-2.5 shrink-0" />}
                    {b.start_time_str} {b.name} - {getShortService(b.service)}
                  </div>
                ))}
                {dayBookings.length > 3 && (
                  <div className="text-[10px] text-muted-foreground text-center">+{dayBookings.length - 3} 筆</div>
                )}
              </div>
              {/* Mobile: show dots */}
              <div className="md:hidden flex flex-wrap gap-0.5 justify-center mt-0.5">
                {dayBookings.slice(0, 5).map((b) => (
                  <div key={b.id} className={cn("w-2 h-2 rounded-full", blacklistedPhones?.has(b.phone) ? "bg-destructive ring-1 ring-destructive/50" : getCategoryDot(b.service))} />
                ))}
                {dayBookings.length > 5 && (
                  <span className="text-[9px] text-muted-foreground">+{dayBookings.length - 5}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500" /> 腳底按摩</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500" /> 全身指壓</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500" /> 筋膜刀</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500" /> 套餐/雙拼</span>
        <span className="flex items-center gap-1 border-l-2 border-l-primary pl-1">已確認</span>
        <span className="flex items-center gap-1 border-l-2 border-l-emerald-500 pl-1">已完成</span>
        <span className="flex items-center gap-1">❌ 已取消</span>
      </div>

      {/* Day detail sheet */}
      <Sheet open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {selectedDay && format(selectedDay, "yyyy年M月d日 (EEEE)", { locale: zhTW })}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {selectedDayBookings.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">當日無預約</div>
            ) : (
              selectedDayBookings.map((b) => {
                const isCancelled = !!b.cancelled_at || b.status === "cancelled";
                const isCompleted = b.status === "completed";
                const conflict = allBookings && !isCancelled ? checkConflict(b, allBookings, b.date, b.start_hour, b.duration) : null;

                return (
                  <div key={b.id} className={cn(
                    "p-3 rounded-lg border",
                    getStatusBorder(b.status, b.cancelled_at),
                    isCancelled && "opacity-50 bg-muted/30 border-border",
                    !isCancelled && blacklistedPhones?.has(b.phone) && "bg-destructive/15 border-destructive/40",
                    !isCancelled && !blacklistedPhones?.has(b.phone) && !isCompleted && getCategoryColor(b.service),
                    isCompleted && !isCancelled && "bg-emerald-50 border-emerald-200"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium flex items-center gap-1">
                        {blacklistedPhones?.has(b.phone) && <Ban className="w-3.5 h-3.5 text-destructive shrink-0" />}
                        {b.start_time_str} {b.name}
                        {isCancelled && <Badge variant="destructive" className="text-[10px] px-1 py-0 ml-1">已取消</Badge>}
                        {isCompleted && !isCancelled && <Badge className="text-[10px] px-1 py-0 ml-1 bg-emerald-100 text-emerald-700 border-emerald-200">已完成</Badge>}
                      </span>
                      <span className="text-sm font-medium">NT${b.total_price.toLocaleString()}</span>
                    </div>
                    <div className="text-xs mt-1">{b.service}</div>
                    {b.addons && b.addons.length > 0 && (
                      <div className="text-xs mt-0.5 opacity-75">加購：{b.addons.join(", ")}</div>
                    )}
                    <div className="text-xs mt-1 opacity-75">📞 {b.phone} · {b.duration}分鐘</div>
                    {b.admin_note && (
                      <div className="text-xs mt-1 text-amber-700">📝 {b.admin_note}</div>
                    )}
                    {isCancelled && b.cancel_reason && (
                      <div className="text-xs mt-1 text-destructive" style={{ textDecoration: 'none' }}>⚠️ 取消原因：{b.cancel_reason}</div>
                    )}
                    {conflict && (
                      <div className="text-xs mt-1 text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> 與 {conflict.name} ({conflict.start_time_str}) 時段衝突
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50 flex-wrap">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(`tel:${b.phone}`, '_self')}>
                        <Phone className="w-3 h-3 mr-1" /> 撥號
                      </Button>
                      {onNote && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onNote(b.id, b.admin_note || null)}>
                          <StickyNote className={cn("w-3 h-3 mr-1", b.admin_note ? "text-amber-600" : "")} /> 備註
                        </Button>
                      )}
                      {onEdit && !isCancelled && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onEdit(b)}>
                          <Pencil className="w-3 h-3 mr-1" /> 編輯
                        </Button>
                      )}
                      {isCancelled ? (
                        onRestore && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => onRestore(b.id)}>
                            <RotateCcw className="w-3 h-3 mr-1" /> 復原
                          </Button>
                        )
                      ) : (
                        <>
                          {isCompleted ? (
                            onUncomplete && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600" onClick={() => onUncomplete(b.id)}>
                                <RotateCcw className="w-3 h-3 mr-1" /> 取消完成
                              </Button>
                            )
                          ) : (
                            onComplete && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600" onClick={() => onComplete(b.id)}>
                                <Check className="w-3 h-3 mr-1" /> 完成
                              </Button>
                            )
                          )}
                          {onCancel && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => { setCancelDialogId(b.id); setCancelReason("客人取消"); }}>
                              <X className="w-3 h-3 mr-1" /> 取消
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancel reason dialog */}
      <Dialog open={!!cancelDialogId} onOpenChange={(open) => !open && setCancelDialogId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>取消預約</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label className="text-sm">取消原因</Label>
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="客人取消">客人取消</SelectItem>
                <SelectItem value="師傅公休">師傅公休</SelectItem>
                <SelectItem value="客人爽約">客人爽約</SelectItem>
                <SelectItem value="其他">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogId(null)}>返回</Button>
            <Button variant="destructive" onClick={handleCancel}>確認取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}