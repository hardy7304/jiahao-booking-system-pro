import { useMemo, type ReactNode } from "react";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, differenceInDays, startOfDay } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  CalendarDays,
  Copy,
  DollarSign,
  LayoutDashboard,
  MessageCircle,
  Moon,
  RefreshCw,
  Target,
  Users,
  RotateCcw,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStoreDashboardPrefs } from "@/hooks/useStoreDashboardPrefs";
import { useStoreLineBookingUrl } from "@/hooks/useStoreLineBookingUrl";
import { DashboardCardPicker } from "@/components/admin/DashboardCardPicker";

/** 與 StatsDashboard 計算新客／回流率所需欄位一致 */
export interface DashboardBookingSnapshot {
  date: string;
  phone: string;
  name?: string;
  status: string | null;
  total_price: number;
  service?: string | null;
  addons?: string[] | null;
  duration?: number | null;
  symptom_tags?: string[] | null;
  // 搭班/次師傅資訊（只在 paired booking 會用到）
  needs_pair?: boolean | null;
  secondary_coach_name?: string | null;
  cancel_reason?: string | null;
}

/** 本月營收目標（NT$），老闆可依店況調整此常數 */
const MONTHLY_REVENUE_GOAL_NT = 200_000;

/** 沉睡客：最後一次「已完成」預約距今天數需大於此值 */
const CHURN_SLEEP_MIN_DAYS_EXCLUSIVE = 30;
/** 沉睡客：最後一次「已完成」預約距今天數需小於此值 */
const CHURN_SLEEP_MAX_DAYS_EXCLUSIVE = 90;

function glassCardClass(extra?: string) {
  return cn(
    "rounded-2xl border border-white/10 bg-background/55 backdrop-blur-xl shadow-xl ring-1 ring-white/5",
    extra,
  );
}

async function copyToClipboard(text: string, okMsg: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(okMsg);
  } catch {
    toast.error("無法複製，請手動選取文字");
  }
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
  const { lineLikeUrl } = useStoreLineBookingUrl();

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

  const cardDefs = useMemo(
    () => [
      { id: "secondaryCountTop10", label: "搭班師傅熱門排行（Top 10）", note: "包含取消" },
      { id: "addonsTop", label: "加購 Top 10", note: "僅 completed" },
      { id: "avgDurationByService", label: "平均時長（按服務）", note: "僅 completed" },
      { id: "pairVsSingle", label: "雙人 vs 單人", note: "僅 completed" },
      { id: "cancelBreakdown", label: "取消分析（取消率/原因Top）", note: "僅 cancelled（含分母 completed）" },
    ],
    [],
  );
  const defaultVisibleCards = useMemo(() => cardDefs.map((c) => c.id), [cardDefs]);
  const { visibleCards, setVisibleCards, loadingPrefs } = useStoreDashboardPrefs(defaultVisibleCards);

  const simplifyServiceName = (serviceName: string) =>
    serviceName.split(" (")[0].split("（")[0].trim();

  const monthActive = useMemo(() => {
    return bookings.filter((b) => b.status === "completed");
  }, [bookings]);

  const monthRangeBookings = useMemo(() => {
    const now = new Date();
    const rangeStart = startOfMonth(now);
    const rangeEnd = endOfMonth(now);
    return monthActive.filter((b) =>
      isWithinInterval(parseISO(b.date), { start: rangeStart, end: rangeEnd }),
    );
  }, [monthActive]);

  const cancelledBookingsInRange = useMemo(() => {
    const now = new Date();
    const rangeStart = startOfMonth(now);
    const rangeEnd = endOfMonth(now);
    return bookings.filter((b) => {
      if (b.status !== "cancelled") return false;
      return isWithinInterval(parseISO(b.date), { start: rangeStart, end: rangeEnd });
    });
  }, [bookings]);

  const secondaryCoachStats = useMemo(() => {
    const now = new Date();
    const rangeStart = startOfMonth(now);
    const rangeEnd = endOfMonth(now);
    const rows = bookings.filter((b) => {
      if (b.needs_pair !== true) return false;
      const secondaryName = (b.secondary_coach_name ?? "").trim();
      if (!secondaryName) return false;
      return isWithinInterval(parseISO(b.date), { start: rangeStart, end: rangeEnd });
    });

    const map: Record<string, number> = {};
    rows.forEach((b) => {
      const name = (b.secondary_coach_name ?? "").trim();
      if (!name) return;
      map[name] = (map[name] || 0) + 1;
    });

    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [bookings]);

  const addonTopStats = useMemo(() => {
    const map: Record<string, number> = {};
    monthRangeBookings.forEach((b) => {
      (b.addons ?? []).forEach((a) => {
        const addon = String(a ?? "").trim();
        if (!addon) return;
        map[addon] = (map[addon] || 0) + 1;
      });
    });
    return Object.entries(map)
      .map(([addon, count]) => ({ addon, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [monthRangeBookings]);

  const avgDurationByService = useMemo(() => {
    const map: Record<string, { count: number; totalDuration: number }> = {};
    monthRangeBookings.forEach((b) => {
      const service = simplifyServiceName(String(b.service ?? ""));
      if (!service) return;
      if (!map[service]) map[service] = { count: 0, totalDuration: 0 };

      const dur = typeof b.duration === "number" ? b.duration : Number(b.duration);
      if (!Number.isFinite(dur) || dur <= 0) return;

      map[service].count += 1;
      map[service].totalDuration += dur;
    });

    return Object.entries(map)
      .map(([service, v]) => ({
        service,
        count: v.count,
        avgDuration: v.count > 0 ? Math.round((v.totalDuration / v.count) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 8);
  }, [monthRangeBookings]);

  const pairVsSingleStats = useMemo(() => {
    const pairBookings = monthRangeBookings.filter((b) => b.needs_pair === true);
    const singleBookings = monthRangeBookings.filter((b) => b.needs_pair === false);
    const unknownCount = monthRangeBookings.length - pairBookings.length - singleBookings.length;

    const mapTop = (rows: DashboardBookingSnapshot[]) => {
      const map: Record<string, number> = {};
      rows.forEach((b) => {
        const service = simplifyServiceName(String(b.service ?? ""));
        if (!service) return;
        map[service] = (map[service] || 0) + 1;
      });
      return Object.entries(map)
        .map(([service, count]) => ({ service, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    };

    const pairCount = pairBookings.length;
    const singleCount = singleBookings.length;
    const total = pairCount + singleCount;
    const pairPct = total > 0 ? Math.round((pairCount / total) * 100) : 0;
    const singlePct = total > 0 ? Math.round((singleCount / total) * 100) : 0;

    return {
      pairCount,
      singleCount,
      unknownCount,
      pairPct,
      singlePct,
      topPairServices: mapTop(pairBookings),
      topSingleServices: mapTop(singleBookings),
    };
  }, [monthRangeBookings]);

  const cancelAnalysis = useMemo(() => {
    const cancelledCount = cancelledBookingsInRange.length;
    const completedCount = monthRangeBookings.length;
    const denom = completedCount + cancelledCount;
    const cancellationRate = denom > 0 ? Math.round((cancelledCount / denom) * 100) : 0;

    const reasonMap: Record<string, number> = {};
    const serviceMap: Record<string, number> = {};

    cancelledBookingsInRange.forEach((b) => {
      const reasonRaw = (b.cancel_reason ?? "").trim();
      const reason = reasonRaw ? reasonRaw : "未填";
      reasonMap[reason] = (reasonMap[reason] || 0) + 1;

      const service = simplifyServiceName(String(b.service ?? ""));
      if (service) serviceMap[service] = (serviceMap[service] || 0) + 1;
    });

    const reasonTop = Object.entries(reasonMap)
      .map(([reason, count]) => ({
        reason,
        count,
        pct: cancelledCount > 0 ? Math.round((count / cancelledCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const serviceTop = Object.entries(serviceMap)
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      cancellationRate,
      cancelledCount,
      completedCount,
      reasonTop,
      serviceTop,
    };
  }, [cancelledBookingsInRange, monthRangeBookings]);

  const churnAlertList = useMemo(() => {
    const today = startOfDay(new Date());
    const completed = bookings.filter((b) => b.status === "completed");
    const byPhone: Record<string, { lastDate: string; name: string }> = {};
    for (const b of completed) {
      const phone = (b.phone ?? "").trim();
      if (!phone) continue;
      const prev = byPhone[phone];
      if (!prev || b.date > prev.lastDate) {
        byPhone[phone] = {
          lastDate: b.date,
          name: (b.name ?? "").trim() || "（未提供姓名）",
        };
      }
    }
    const rows: { phone: string; name: string; lastDate: string; daysSince: number }[] = [];
    for (const [phone, { lastDate, name }] of Object.entries(byPhone)) {
      const daysSince = differenceInDays(today, startOfDay(parseISO(lastDate)));
      if (
        daysSince > CHURN_SLEEP_MIN_DAYS_EXCLUSIVE &&
        daysSince < CHURN_SLEEP_MAX_DAYS_EXCLUSIVE
      ) {
        rows.push({ phone, name, lastDate, daysSince });
      }
    }
    return rows.sort((a, b) => a.lastDate.localeCompare(b.lastDate)).slice(0, 25);
  }, [bookings]);

  const symptomTopThree = useMemo(() => {
    const map: Record<string, number> = {};
    monthRangeBookings.forEach((b) => {
      const tags = Array.isArray(b.symptom_tags) ? b.symptom_tags : [];
      tags.forEach((t) => {
        const k = String(t).trim();
        if (!k) return;
        map[k] = (map[k] || 0) + 1;
      });
    });
    const total = Object.values(map).reduce((s, n) => s + n, 0);
    return Object.entries(map)
      .map(([label, count]) => ({
        label,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [monthRangeBookings]);

  const monthGoalProgressPct = useMemo(() => {
    if (MONTHLY_REVENUE_GOAL_NT <= 0) return 0;
    return Math.min(100, Math.round((monthRevenue / MONTHLY_REVENUE_GOAL_NT) * 100));
  }, [monthRevenue]);

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
        <div className="flex flex-wrap items-center gap-2">
          <DashboardCardPicker
            cards={cardDefs}
            visibleCards={visibleCards}
            setVisibleCards={setVisibleCards}
            loadingPrefs={loadingPrefs}
            defaultVisibleCardIds={defaultVisibleCards}
            idPrefix="dash_card"
          />
          {onRefresh ? (
            <Button variant="outline" size="sm" onClick={() => void onRefresh()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              重新整理資料
            </Button>
          ) : null}
        </div>
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

      {/* 強化數據分析：沉睡客 / 本月目標 / 症狀分佈（玻璃擬態） */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={glassCardClass("flex min-h-[260px] flex-col p-4")}>
          <div className="mb-3 flex items-center gap-2">
            <Moon className="h-5 w-5 shrink-0 text-violet-400" />
            <h2 className="font-semibold text-foreground">沉睡金主提醒</h2>
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
            已完成預約中，最後到店日距今超過 {CHURN_SLEEP_MIN_DAYS_EXCLUSIVE} 天、且未滿 {CHURN_SLEEP_MAX_DAYS_EXCLUSIVE} 天的客人（最多顯示 25 筆）。
          </p>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 max-h-[320px]">
            {churnAlertList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">目前沒有符合條件的客人</p>
            ) : (
              churnAlertList.map((row) => (
                <div
                  key={row.phone}
                  className="flex flex-col gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{row.name}</div>
                    <div className="text-xs text-muted-foreground">
                      最後預約 {row.lastDate} · 已 {row.daysSince} 天未到店
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 border-white/15 bg-white/5 text-xs"
                      onClick={() => void copyToClipboard(row.name, "已複製姓名")}
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      複製姓名
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 border-white/15 bg-white/5 text-xs"
                      onClick={() =>
                        void copyToClipboard(
                          `${row.name}　${row.phone}\n最後預約：${row.lastDate}`,
                          "已複製聯絡用資訊",
                        )
                      }
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      複製資訊
                    </Button>
                    {lineLikeUrl ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => window.open(lineLikeUrl, "_blank", "noopener,noreferrer")}
                      >
                        <MessageCircle className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                        LINE
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={glassCardClass("p-4")}>
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-5 w-5 shrink-0 text-primary" />
            <h2 className="font-semibold text-foreground">本月目標達成率</h2>
          </div>
          <p className="mb-3 text-[11px] text-muted-foreground">
            以本月所有「已完成」訂單加總營收；目標 NT${MONTHLY_REVENUE_GOAL_NT.toLocaleString()}（可於程式碼調整常數）。
          </p>
          <Progress value={monthGoalProgressPct} className="h-3 bg-white/10" />
          <div className="mt-3 flex items-baseline justify-between gap-2 text-sm">
            <span className="text-muted-foreground">目前營收</span>
            <span className="font-semibold tabular-nums text-foreground">
              NT${monthRevenue.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="text-muted-foreground">目標營收</span>
            <span className="font-medium tabular-nums text-muted-foreground">
              NT${MONTHLY_REVENUE_GOAL_NT.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 text-right text-xs font-medium text-primary tabular-nums">
            {monthGoalProgressPct}%
          </div>
        </div>

        <div className={glassCardClass("p-4")}>
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 shrink-0 text-orange-400" />
            <h2 className="font-semibold text-foreground">高頻疼痛部位統計</h2>
          </div>
          <p className="mb-3 text-[11px] text-muted-foreground">
            統計本月已完成預約的 <span className="text-foreground/90">symptom_tags</span> 欄位（需已套用 DB migration）。
          </p>
          {symptomTopThree.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">尚無標籤資料</p>
          ) : (
            <div className="space-y-4">
              {symptomTopThree.map((row, idx) => (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-foreground">
                      {idx + 1}. {row.label}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {row.count} 次 · {row.pct}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500/90 to-amber-400/80 transition-all"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Optional statistic cards */}
      {(() => {
        const hasAny =
          visibleCards.includes("secondaryCountTop10") ||
          visibleCards.includes("addonsTop") ||
          visibleCards.includes("avgDurationByService") ||
          visibleCards.includes("pairVsSingle") ||
          visibleCards.includes("cancelBreakdown");
        if (!hasAny) {
          return (
            <div className="bg-card rounded-xl shadow p-4">
              <p className="text-muted-foreground text-center py-8">目前沒有要顯示的統計卡。</p>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleCards.includes("secondaryCountTop10") && (
              <div className="bg-card rounded-xl shadow p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="font-semibold text-foreground">🧑‍🔧 搭班師傅熱門排行（Top 10）</h2>
                  <p className="text-xs text-muted-foreground whitespace-nowrap pt-1">包含取消</p>
                </div>
                {secondaryCoachStats.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left p-1.5">搭班師傅</th>
                          <th className="text-center p-1.5 w-32">次數（筆數）</th>
                        </tr>
                      </thead>
                      <tbody>
                        {secondaryCoachStats.map((row) => (
                          <tr key={row.name} className="border-b border-border/50">
                            <td className="p-1.5 font-medium">{row.name}</td>
                            <td className="p-1.5 text-center">
                              <Badge variant="secondary" className="text-xs">
                                {row.count}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">尚無資料</p>
                )}
              </div>
            )}

            {visibleCards.includes("addonsTop") && (
              <div className="bg-card rounded-xl shadow p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="font-semibold text-foreground">➕ 加購 Top 10</h2>
                  <p className="text-xs text-muted-foreground whitespace-nowrap pt-1">僅 completed</p>
                </div>
                {addonTopStats.length > 0 ? (
                  (() => {
                    const maxCount = Math.max(1, ...addonTopStats.map((d) => d.count));
                    return (
                      <div className="space-y-2">
                        {addonTopStats.map((row) => (
                          <div key={row.addon} className="flex items-center gap-3">
                            <div className="w-48 truncate text-sm font-medium">{row.addon}</div>
                            <div className="flex-1 h-2 bg-border rounded overflow-hidden">
                              <div
                                className="h-full bg-emerald-600"
                                style={{ width: `${Math.round((row.count / maxCount) * 100)}%` }}
                              />
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {row.count}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-muted-foreground text-center py-8">尚無資料</p>
                )}
              </div>
            )}

            {visibleCards.includes("avgDurationByService") && (
              <div className="bg-card rounded-xl shadow p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="font-semibold text-foreground">⏱️ 平均時長（按服務）</h2>
                  <p className="text-xs text-muted-foreground whitespace-nowrap pt-1">僅 completed</p>
                </div>
                {avgDurationByService.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left p-1.5">服務</th>
                          <th className="text-center p-1.5 w-28">平均時長</th>
                          <th className="text-center p-1.5 w-24">次數</th>
                        </tr>
                      </thead>
                      <tbody>
                        {avgDurationByService.map((row) => (
                          <tr key={row.service} className="border-b border-border/50">
                            <td className="p-1.5 font-medium">{row.service}</td>
                            <td className="p-1.5 text-center">
                              <Badge variant="secondary" className="text-xs">
                                {row.avgDuration} 分
                              </Badge>
                            </td>
                            <td className="p-1.5 text-center text-muted-foreground">{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">尚無資料</p>
                )}
              </div>
            )}

            {visibleCards.includes("pairVsSingle") && (
              <div className="bg-card rounded-xl shadow p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="font-semibold text-foreground">👥 雙人 vs 單人</h2>
                  <p className="text-xs text-muted-foreground whitespace-nowrap pt-1">僅 completed</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="text-xs text-muted-foreground">雙人（needs_pair=true）</div>
                    <div className="text-2xl font-bold text-primary">{pairVsSingleStats.pairCount}</div>
                    <div className="text-xs text-muted-foreground">{pairVsSingleStats.pairPct}%</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="text-xs text-muted-foreground">單人（needs_pair=false）</div>
                    <div className="text-2xl font-bold text-primary">{pairVsSingleStats.singleCount}</div>
                    <div className="text-xs text-muted-foreground">{pairVsSingleStats.singlePct}%</div>
                  </div>
                </div>
                {pairVsSingleStats.unknownCount > 0 ? (
                  <div className="text-xs text-muted-foreground mt-2">
                    已排除未填 `needs_pair`：{pairVsSingleStats.unknownCount} 筆
                  </div>
                ) : null}

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">雙人 Top 5 服務</div>
                    {pairVsSingleStats.topPairServices.length > 0 ? (
                      <div className="space-y-1">
                        {pairVsSingleStats.topPairServices.map((row) => (
                          <div key={row.service} className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate">{row.service}</span>
                            <Badge variant="secondary" className="text-xs">
                              {row.count}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">尚無資料</p>
                    )}
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground mb-2">單人 Top 5 服務</div>
                    {pairVsSingleStats.topSingleServices.length > 0 ? (
                      <div className="space-y-1">
                        {pairVsSingleStats.topSingleServices.map((row) => (
                          <div key={row.service} className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate">{row.service}</span>
                            <Badge variant="secondary" className="text-xs">
                              {row.count}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">尚無資料</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {visibleCards.includes("cancelBreakdown") && (
              <div className="bg-card rounded-xl shadow p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="font-semibold text-foreground">❌ 取消分析</h2>
                  <p className="text-xs text-muted-foreground whitespace-nowrap pt-1">
                    取消率：{cancelAnalysis.cancellationRate}%
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  完成 {cancelAnalysis.completedCount} 筆 · 取消 {cancelAnalysis.cancelledCount} 筆
                </p>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium mb-2">取消原因 Top</div>
                    {cancelAnalysis.reasonTop.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-muted-foreground">
                              <th className="text-left p-1.5">原因</th>
                              <th className="text-center p-1.5 w-24">次數</th>
                              <th className="text-center p-1.5 w-24">占比</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cancelAnalysis.reasonTop.map((row) => (
                              <tr key={row.reason} className="border-b border-border/50">
                                <td className="p-1.5 font-medium">{row.reason}</td>
                                <td className="p-1.5 text-center text-muted-foreground">{row.count}</td>
                                <td className="p-1.5 text-center">
                                  <Badge variant="secondary" className="text-xs">
                                    {row.pct}%
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">尚無資料</p>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-2">取消服務 Top 5</div>
                    {cancelAnalysis.serviceTop.length > 0 ? (
                      <div className="space-y-1">
                        {cancelAnalysis.serviceTop.map((row) => (
                          <div key={row.service} className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate">{row.service}</span>
                            <Badge variant="secondary" className="text-xs">
                              {row.count}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">尚無資料</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

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
