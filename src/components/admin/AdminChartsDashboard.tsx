import { useMemo, type ReactNode } from "react";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays,
  DollarSign,
  LayoutDashboard,
  RefreshCw,
  Users,
  RotateCcw,
  BarChart3,
} from "lucide-react";

/** 與 StatsDashboard 計算新客／回流率所需欄位一致 */
export interface DashboardBookingSnapshot {
  date: string;
  phone: string;
  status: string | null;
  total_price: number;
}

function SummaryCard({
  icon,
  label,
  value,
  valueClass = "",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-card rounded-xl shadow p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-bold text-foreground ${valueClass}`}>{value}</div>
    </div>
  );
}

/**
 * 後台「儀表板」：本月四指標快速總覽（計算方式對齊「統計」分頁預設「本月」＝已完成預約 + 區間內新客／回流率邏輯）
 */
export default function AdminChartsDashboard({
  bookings,
  loading,
  onGoToStats,
  onRefresh,
}: {
  bookings: DashboardBookingSnapshot[];
  loading: boolean;
  onGoToStats: () => void;
  onRefresh?: () => void | Promise<void>;
}) {
  const { monthCount, monthRevenue, newCustomers, returnRate, monthLabel } = useMemo(() => {
    const now = new Date();
    const rangeStart = startOfMonth(now);
    const rangeEnd = endOfMonth(now);
    const rangeStartStr = format(rangeStart, "yyyy-MM-dd");

    const active = bookings.filter((b) => b.status === "completed");
    const rangeBookings = active.filter((b) =>
      isWithinInterval(parseISO(b.date), { start: rangeStart, end: rangeEnd }),
    );

    const rangeRevenue = rangeBookings.reduce((s, b) => s + Number(b.total_price), 0);
    const rangeCount = rangeBookings.length;

    const phoneCountAll: Record<string, number> = {};
    active.forEach((b) => {
      phoneCountAll[b.phone] = (phoneCountAll[b.phone] || 0) + 1;
    });

    const rangePhones = new Set<string>();
    rangeBookings.forEach((b) => rangePhones.add(b.phone));

    let newCust = 0;
    rangePhones.forEach((phone) => {
      const allForPhone = active.filter((b) => b.phone === phone);
      const earliest = allForPhone.reduce((min, b) => (b.date < min ? b.date : min), "9999");
      if (earliest >= rangeStartStr) newCust++;
    });

    let returning = 0;
    rangePhones.forEach((phone) => {
      if ((phoneCountAll[phone] || 0) >= 2) returning++;
    });
    const retRate =
      rangePhones.size === 0 ? 0 : Math.round((returning / rangePhones.size) * 100);

    return {
      monthCount: rangeCount,
      monthRevenue: rangeRevenue,
      newCustomers: newCust,
      returnRate: retRate,
      monthLabel: format(now, "M", { locale: zhTW }),
    };
  }, [bookings]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-12 rounded-xl max-w-md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-card rounded-xl shadow p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>
            本月快速總覽（指標計算與「統計」分頁預設「本月」相同：僅統計{" "}
            <span className="font-medium text-foreground">已完成</span> 預約）
          </span>
        </div>
        {onRefresh ? (
          <Button variant="outline" size="sm" onClick={() => void onRefresh()}>
            <RefreshCw className="w-4 h-4 mr-1" />
            重新整理資料
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={<CalendarDays className="w-4 h-4" />}
          label={`${monthLabel}月預約數`}
          value={`${monthCount} 筆`}
        />
        <SummaryCard
          icon={<DollarSign className="w-4 h-4" />}
          label={`${monthLabel}月營收`}
          value={`NT$${monthRevenue.toLocaleString()}`}
          valueClass="text-primary"
        />
        <SummaryCard
          icon={<Users className="w-4 h-4" />}
          label="新客數"
          value={`${newCustomers} 人`}
        />
        <SummaryCard
          icon={<RotateCcw className="w-4 h-4" />}
          label="回流率"
          value={`${returnRate}%`}
          valueClass="text-primary"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="default" className="gap-2" onClick={onGoToStats}>
          <BarChart3 className="w-4 h-4" />
          → 查看完整統計
        </Button>
        <p className="text-xs text-muted-foreground">
          圖表、匯出與更多區間請至「統計」分頁。
        </p>
      </div>
    </div>
  );
}
