import { useState, useEffect, useMemo } from "react";
import { format, isToday } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Clock, CalendarDays, DollarSign, AlertTriangle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  status: string | null;
}

interface Holiday {
  date: string;
  type: string;
  start_hour: number | null;
  end_hour: number | null;
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
}: {
  bookings: Booking[];
  holidays: Holiday[];
  loading: boolean;
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = format(now, "yyyy-MM-dd");
  const todayBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.date === todayStr && !b.cancelled_at && b.status !== "cancelled")
        .sort((a, b) => a.start_hour - b.start_hour),
    [bookings, todayStr]
  );

  const todayRevenue = todayBookings.reduce((sum, b) => sum + b.total_price, 0);

  const currentHour = now.getHours() + now.getMinutes() / 60;
  const adjustedCurrentHour = currentHour < 6 ? currentHour + 24 : currentHour;

  const nextBooking = todayBookings.find((b) => b.start_hour > adjustedCurrentHour);

  const minutesUntilNext = nextBooking
    ? Math.round((nextBooking.start_hour - adjustedCurrentHour) * 60)
    : null;

  // Available slots (simplified count)
  const isHolidayToday = holidays.some((h) => h.date === todayStr && h.type === "整天公休");
  const totalSlots = 24; // 14:00-26:00 every 30min
  const bookedSlots = todayBookings.length;
  const availableSlots = isHolidayToday ? 0 : Math.max(0, totalSlots - bookedSlots);

  const completedCount = todayBookings.filter((b) => b.status === "completed").length;

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
    <div className="space-y-4">
      {/* Live clock + date */}
      <div className="bg-card rounded-xl shadow p-4 flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-foreground tracking-wide font-mono">
            {format(now, "HH:mm:ss")}
          </div>
          <div className="text-sm text-muted-foreground">
            {format(now, "yyyy年M月d日 (EEEE)", { locale: zhTW })}
          </div>
        </div>
        {isHolidayToday && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            今日公休
          </Badge>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <CalendarDays className="w-4 h-4" />
            今日預約
          </div>
          <div className="text-2xl font-bold text-foreground">{todayBookings.length} 筆</div>
          {completedCount > 0 && (
            <div className="text-xs text-muted-foreground mt-1">已完成 {completedCount} 筆</div>
          )}
        </div>

        <div className="bg-card rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            今日營業額
          </div>
          <div className="text-2xl font-bold text-primary">NT${todayRevenue.toLocaleString()}</div>
        </div>

        <div className="bg-card rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <AlertTriangle className="w-4 h-4" />
            今日空檔
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
              <div className="text-lg font-bold text-foreground truncate">
                {nextBooking.name} {nextBooking.start_time_str}
              </div>
              <div className="text-xs text-primary font-medium">
                還有 {minutesUntilNext! > 60 ? `${Math.floor(minutesUntilNext! / 60)}小時${minutesUntilNext! % 60}分` : `${minutesUntilNext}分鐘`}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">無後續預約</div>
          )}
        </div>
      </div>

      {/* Today's bookings list */}
      <div className="bg-card rounded-xl shadow p-4">
        <h2 className="font-semibold text-foreground mb-3">📋 今日預約時程</h2>
        {todayBookings.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {isHolidayToday ? "今日公休，無預約" : "今日尚無預約"}
          </div>
        ) : (
          <div className="space-y-2">
            {todayBookings.map((b) => {
              const cat = getCategoryFromService(b.service);
              const colorClass = SERVICE_COLORS[cat] || SERVICE_COLORS.foot;
              const isPast = b.start_hour < adjustedCurrentHour;
              const isCurrent =
                b.start_hour <= adjustedCurrentHour &&
                b.start_hour + b.duration / 60 > adjustedCurrentHour;

              return (
                <div
                  key={b.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isCurrent
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : isPast
                      ? "border-border opacity-60"
                      : "border-border hover:bg-secondary/30"
                  }`}
                >
                  <div className="text-sm font-mono font-medium text-foreground w-14 shrink-0">
                    {b.start_time_str}
                  </div>
                  <div className={`px-2 py-0.5 rounded text-xs border ${colorClass}`}>
                    {b.duration}分
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">{b.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{b.service}</div>
                  </div>
                  <div className="text-sm font-medium text-primary shrink-0">
                    NT${b.total_price.toLocaleString()}
                  </div>
                  {b.status === "completed" && (
                    <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 shrink-0">
                      ✅ 完成
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge className="bg-primary text-primary-foreground text-xs shrink-0 animate-pulse">
                      進行中
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
