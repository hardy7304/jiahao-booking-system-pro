import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, getDay } from "date-fns";
import { zhTW } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

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
  status: string | null;
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

export default function BookingCalendarView({
  bookings,
  holidays,
  blacklistedPhones,
}: {
  bookings: Booking[];
  holidays: Holiday[];
  blacklistedPhones?: Set<string>;
}) {
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const activeBookings = bookings.filter((b) => !b.cancelled_at && b.status !== "cancelled");

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
    return activeBookings.filter((b) => b.date === dateStr).sort((a, b) => a.start_hour - b.start_hour);
  };

  const getCancelledCountForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return bookings.filter((b) => b.date === dateStr && (b.cancelled_at || b.status === "cancelled")).length;
  };

  const getAllBookingsForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return bookings.filter((b) => b.date === dateStr).sort((a, b) => a.start_hour - b.start_hour);
  };

  const selectedDayBookings = selectedDay ? getAllBookingsForDay(selectedDay) : [];

  const padStart = (getDay(monthStart) + 6) % 7;

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

          return (
            <div
              key={dateStr}
              className={cn(
                "border rounded-lg p-1 min-h-[80px] md:min-h-[100px] cursor-pointer transition-colors",
                isToday && "border-primary border-2 bg-primary/5",
                isHoliday && "bg-destructive/10 border-destructive/30",
                !isToday && !isHoliday && "border-border hover:bg-secondary/30"
              )}
              onClick={() => setSelectedDay(day)}
            >
              <div className={cn("text-xs font-medium text-center mb-0.5", isToday ? "text-primary font-bold" : "text-foreground")}>
                {format(day, "d")}
              </div>
              {isHoliday && (
                <div className="text-[10px] text-destructive font-medium text-center">公休</div>
              )}
              {/* Desktop: show pills */}
              <div className="hidden md:block space-y-0.5">
                {dayBookings.slice(0, 3).map((b) => (
                  <div
                    key={b.id}
                    className={cn("text-[10px] px-1 py-0.5 rounded truncate border flex items-center gap-0.5", getCategoryColor(b.service), blacklistedPhones?.has(b.phone) && "!bg-destructive/20 !border-destructive/40 !text-destructive")}
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
      </div>

      {/* Day drawer */}
      <Sheet open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedDay && format(selectedDay, "yyyy年M月d日 (EEEE)", { locale: zhTW })}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {selectedDayBookings.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">當日無預約</div>
            ) : (
              selectedDayBookings.map((b) => (
                <div key={b.id} className={cn("p-3 rounded-lg border", blacklistedPhones?.has(b.phone) ? "bg-destructive/15 border-destructive/40" : getCategoryColor(b.service))}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium flex items-center gap-1">
                      {blacklistedPhones?.has(b.phone) && <Ban className="w-3.5 h-3.5 text-destructive shrink-0" />}
                      {b.start_time_str} {b.name}
                    </span>
                    <span className="text-sm font-medium">NT${b.total_price.toLocaleString()}</span>
                  </div>
                  <div className="text-xs mt-1">{b.service}</div>
                  {b.addons && b.addons.length > 0 && (
                    <div className="text-xs mt-0.5 opacity-75">加購：{b.addons.join(", ")}</div>
                  )}
                  <div className="text-xs mt-1 opacity-75">📞 {b.phone} · {b.duration}分鐘</div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
