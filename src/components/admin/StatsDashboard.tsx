import { useState, useMemo } from "react";
import { format, subDays, parseISO, startOfMonth, endOfMonth, isWithinInterval, getDay, subMonths, differenceInDays } from "date-fns";
import { zhTW } from "date-fns/locale";
import { DollarSign, CalendarDays, Users, RotateCcw, Download, Wallet, Building2, Briefcase, CalendarIcon, TrendingUp, BarChart3, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

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
  oil_bonus: number;
}

interface CommissionHelpers {
  calcBase: (totalPrice: number, serviceName: string, addons?: string[] | null) => number;
  calcTherapist: (totalPrice: number, serviceName: string, addons?: string[] | null) => number;
  calcShop: (totalPrice: number, serviceName: string, addons?: string[] | null) => number;
  commissionRate: number;
  getDeduction: (serviceName: string) => number;
}

const WEEKDAYS = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
const HOURS_LABELS: string[] = [];
for (let h = 14; h < 26; h += 0.5) {
  const dh = h >= 24 ? h - 24 : h;
  HOURS_LABELS.push(`${Math.floor(dh).toString().padStart(2, "0")}:${h % 1 === 0 ? "00" : "30"}`);
}

type Preset = "thisMonth" | "lastMonth" | "7days" | "30days" | "custom";

export default function StatsDashboard({
  bookings,
  loading,
  commission,
}: {
  bookings: Booking[];
  loading: boolean;
  commission?: CommissionHelpers;
}) {
  const now = new Date();
  const [preset, setPreset] = useState<Preset>("thisMonth");
  const [customFrom, setCustomFrom] = useState<Date>(startOfMonth(now));
  const [customTo, setCustomTo] = useState<Date>(endOfMonth(now));
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const { rangeStart, rangeEnd, rangeLabel } = useMemo(() => {
    switch (preset) {
      case "thisMonth":
        return { rangeStart: startOfMonth(now), rangeEnd: endOfMonth(now), rangeLabel: "本月" };
      case "lastMonth": {
        const lm = subMonths(now, 1);
        return { rangeStart: startOfMonth(lm), rangeEnd: endOfMonth(lm), rangeLabel: "上月" };
      }
      case "7days":
        return { rangeStart: subDays(now, 6), rangeEnd: now, rangeLabel: "近7天" };
      case "30days":
        return { rangeStart: subDays(now, 29), rangeEnd: now, rangeLabel: "近30天" };
      case "custom":
        return {
          rangeStart: customFrom,
          rangeEnd: customTo,
          rangeLabel: `${format(customFrom, "M/d")} ~ ${format(customTo, "M/d")}`,
        };
    }
  }, [preset, customFrom, customTo]);

  const active = bookings.filter((b) => b.status === "completed");

  const rangeBookings = useMemo(() => {
    return active.filter((b) => {
      const d = parseISO(b.date);
      return isWithinInterval(d, { start: rangeStart, end: rangeEnd });
    });
  }, [active, rangeStart, rangeEnd]);

  const rangeDays = Math.max(1, differenceInDays(rangeEnd, rangeStart) + 1);

  // SECTION A: Summary
  const rangeRevenue = rangeBookings.reduce((s, b) => s + b.total_price, 0);
  const rangeCount = rangeBookings.length;

  const phoneCountAll = useMemo(() => {
    const map: Record<string, number> = {};
    active.forEach((b) => { map[b.phone] = (map[b.phone] || 0) + 1; });
    return map;
  }, [active]);

  const rangePhones = useMemo(() => {
    const set = new Set<string>();
    rangeBookings.forEach((b) => set.add(b.phone));
    return set;
  }, [rangeBookings]);

  const newCustomers = useMemo(() => {
    let count = 0;
    const rangeStartStr = format(rangeStart, "yyyy-MM-dd");
    rangePhones.forEach((phone) => {
      const allBookingsForPhone = active.filter((b) => b.phone === phone);
      const earliest = allBookingsForPhone.reduce((min, b) => (b.date < min ? b.date : min), "9999");
      if (earliest >= rangeStartStr) count++;
    });
    return count;
  }, [rangePhones, active, rangeStart]);

  const returnRate = useMemo(() => {
    if (rangePhones.size === 0) return 0;
    let returning = 0;
    rangePhones.forEach((phone) => { if ((phoneCountAll[phone] || 0) >= 2) returning++; });
    return Math.round((returning / rangePhones.size) * 100);
  }, [rangePhones, phoneCountAll]);

  // Commission totals
  const rangeDeductionTotal = commission ? rangeBookings.reduce((s, b) => s + commission.getDeduction(b.service), 0) : 0;
  const rangeBaseTotal = commission ? rangeBookings.reduce((s, b) => s + commission.calcBase(b.total_price, b.service, b.addons), 0) : 0;
  const rangeTherapist = commission ? rangeBookings.reduce((s, b) => s + commission.calcTherapist(b.total_price, b.service, b.addons) + (b.oil_bonus || 0), 0) : 0;
  const rangeShopTotal = commission ? rangeBookings.reduce((s, b) => s + commission.calcShop(b.total_price, b.service, b.addons), 0) : 0;

  // SECTION B: Revenue trend (within selected range)
  const revenueTrend = useMemo(() => {
    const data: { date: string; revenue: number; count: number; avg7?: number; therapist?: number; shop?: number }[] = [];
    const days = Math.min(rangeDays, 90);
    for (let i = days - 1; i >= 0; i--) {
      const dateObj = subDays(rangeEnd, i);
      const d = format(dateObj, "yyyy-MM-dd");
      const dayBookings = active.filter((b) => b.date === d);
      const rev = dayBookings.reduce((s, b) => s + b.total_price, 0);
      const ther = commission ? dayBookings.reduce((s, b) => s + commission.calcTherapist(b.total_price, b.service, b.addons) + (b.oil_bonus || 0), 0) : 0;
      const shop = commission ? dayBookings.reduce((s, b) => s + commission.calcShop(b.total_price, b.service, b.addons), 0) : 0;
      data.push({ date: format(dateObj, "M/d"), revenue: rev, count: dayBookings.length, therapist: ther, shop: shop });
    }
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - 6);
      const slice = data.slice(start, i + 1);
      data[i].avg7 = Math.round(slice.reduce((s, d) => s + d.revenue, 0) / slice.length);
    }
    return data;
  }, [active, commission, rangeEnd, rangeDays]);

  // SECTION C: Popular services (within range)
  const serviceStats = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    rangeBookings.forEach((b) => {
      const name = b.service.split(" (")[0].split("（")[0];
      if (!map[name]) map[name] = { count: 0, revenue: 0 };
      map[name].count++;
      map[name].revenue += b.total_price;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count).slice(0, 8).map(([name, stats]) => ({ name, ...stats }));
  }, [rangeBookings]);

  // SECTION D: Heatmap (within range)
  const heatmapData = useMemo(() => {
    const grid: Record<string, number> = {};
    rangeBookings.forEach((b) => {
      const d = parseISO(b.date);
      const dayOfWeek = getDay(d);
      const hourIdx = Math.round((b.start_hour - 14) * 2);
      if (hourIdx >= 0 && hourIdx < HOURS_LABELS.length) {
        grid[`${dayOfWeek}-${hourIdx}`] = (grid[`${dayOfWeek}-${hourIdx}`] || 0) + 1;
      }
    });
    return grid;
  }, [rangeBookings]);

  const maxHeat = Math.max(1, ...Object.values(heatmapData));

  // SECTION E: Customer analysis (within range)
  const customerStats = useMemo(() => {
    const map: Record<string, { name: string; phone: string; count: number; lastDate: string; total: number }> = {};
    rangeBookings.forEach((b) => {
      if (!map[b.phone]) map[b.phone] = { name: b.name, phone: b.phone, count: 0, lastDate: "", total: 0 };
      map[b.phone].count++;
      map[b.phone].total += b.total_price;
      if (b.date > map[b.phone].lastDate) { map[b.phone].lastDate = b.date; map[b.phone].name = b.name; }
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [rangeBookings]);

  const top10 = customerStats.slice(0, 10);
  const newCount = customerStats.filter((c) => c.count === 1).length;
  const returningCount = customerStats.filter((c) => c.count >= 2).length;
  const pieData = [
    { name: "新客", value: newCount },
    { name: "回流客", value: returningCount },
  ];

  // CSV export
  const exportBookingsCSV = () => {
    const headers = ["下單時間", "日期", "時段", "姓名", "電話", "服務", "加購", "時長", "金額", "差價", "計算基底", "師傅收入", "店家抽成"];
    const rows = rangeBookings.map((b) => {
      const ded = commission ? commission.getDeduction(b.service) : 0;
      const base = commission ? commission.calcBase(b.total_price, b.service, b.addons) : b.total_price;
      const ther = commission ? commission.calcTherapist(b.total_price, b.service, b.addons) : 0;
      const shop = commission ? commission.calcShop(b.total_price, b.service, b.addons) : 0;
      return [
        new Date(b.order_time).toLocaleString("zh-TW"), b.date, b.start_time_str, b.name, b.phone,
        b.service, b.addons?.join("; ") || "", `${b.duration}分`, b.total_price, ded, base, ther, shop,
      ];
    });
    const fileDate = `${format(rangeStart, "yyyyMMdd")}_${format(rangeEnd, "yyyyMMdd")}`;
    downloadCSV(headers, rows, `預約報表_${fileDate}.csv`);
  };

  const exportCustomersCSV = () => {
    const headers = ["姓名", "電話", "預約次數", "最後預約日", "累計消費"];
    const rows = customerStats.map((c) => [c.name, c.phone, c.count, c.lastDate, c.total]);
    const fileDate = `${format(rangeStart, "yyyyMMdd")}_${format(rangeEnd, "yyyyMMdd")}`;
    downloadCSV(headers, rows, `客戶名單_${fileDate}.csv`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-40 rounded-xl" />))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date range picker */}
      <div className="bg-card rounded-xl shadow p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {([
            ["thisMonth", "本月"],
            ["lastMonth", "上月"],
            ["7days", "近7天"],
            ["30days", "近30天"],
            ["custom", "自訂"],
          ] as [Preset, string][]).map(([key, label]) => (
            <Button
              key={key}
              variant={preset === key ? "default" : "outline"}
              size="sm"
              onClick={() => setPreset(key)}
            >
              {label}
            </Button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex items-center gap-2 flex-wrap">
            <Popover open={fromOpen} onOpenChange={setFromOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <CalendarIcon className="w-4 h-4" />
                  {format(customFrom, "yyyy/M/d")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={(d) => { if (d) { setCustomFrom(d); setFromOpen(false); } }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">～</span>
            <Popover open={toOpen} onOpenChange={setToOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <CalendarIcon className="w-4 h-4" />
                  {format(customTo, "yyyy/M/d")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={(d) => { if (d) { setCustomTo(d); setToOpen(false); } }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          📊 統計區間：{format(rangeStart, "yyyy/M/d")} ~ {format(rangeEnd, "yyyy/M/d")}（{rangeDays} 天，{rangeCount} 筆預約）
        </div>
      </div>

      {/* SECTION A: Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={<DollarSign className="w-4 h-4" />} label={`${rangeLabel}營業額`} value={`NT$${rangeRevenue.toLocaleString()}`} valueClass="text-primary" />
        <SummaryCard icon={<CalendarDays className="w-4 h-4" />} label={`${rangeLabel}預約數`} value={`${rangeCount} 筆`} />
        <SummaryCard icon={<Users className="w-4 h-4" />} label="新客數" value={`${newCustomers} 人`} />
        <SummaryCard icon={<RotateCcw className="w-4 h-4" />} label="回流率" value={`${returnRate}%`} valueClass="text-primary" />
      </div>

      {/* Daily averages */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard icon={<TrendingUp className="w-4 h-4" />} label="日均營收" value={`NT$${Math.round(rangeRevenue / rangeDays).toLocaleString()}`} valueClass="text-primary" />
        <SummaryCard icon={<BarChart3 className="w-4 h-4" />} label="日均預約數" value={`${(rangeCount / rangeDays).toFixed(1)} 筆`} />
        <SummaryCard icon={<Receipt className="w-4 h-4" />} label="客單價" value={`NT$${rangeCount > 0 ? Math.round(rangeRevenue / rangeCount).toLocaleString() : 0}`} valueClass="text-primary" />
      </div>

      {/* Commission summary */}
      {commission && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard icon={<DollarSign className="w-4 h-4" />} label={`${rangeLabel}公司差價`} value={`-NT$${rangeDeductionTotal.toLocaleString()}`} valueClass="text-destructive" />
          <SummaryCard icon={<Briefcase className="w-4 h-4" />} label={`${rangeLabel}業績基底`} value={`NT$${rangeBaseTotal.toLocaleString()}`} valueClass="text-muted-foreground" />
          <SummaryCard icon={<Wallet className="w-4 h-4" />} label={`${rangeLabel}師傅累計收入`} value={`NT$${rangeTherapist.toLocaleString()}`} valueClass="text-blue-600" />
          <SummaryCard icon={<Building2 className="w-4 h-4" />} label={`${rangeLabel}店家抽成`} value={`NT$${rangeShopTotal.toLocaleString()}`} valueClass="text-orange-600" />
        </div>
      )}

      {/* Commission daily stacked bar chart */}
      {commission && revenueTrend.some((d) => d.therapist! > 0) && (
        <div className="bg-card rounded-xl shadow p-4">
          <h2 className="font-semibold text-foreground mb-3">💼 收入分析（{rangeLabel}）</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val: number, name: string) => {
                const labels: Record<string, string> = { therapist: "師傅收入", shop: "店家抽成" };
                return [`NT$${val.toLocaleString()}`, labels[name] || name];
              }} />
              <Bar dataKey="therapist" stackId="a" fill="hsl(210, 70%, 55%)" name="therapist" />
              <Bar dataKey="shop" stackId="a" fill="hsl(30, 70%, 55%)" name="shop" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* SECTION B: Revenue trend */}
      <div className="bg-card rounded-xl shadow p-4">
        <h2 className="font-semibold text-foreground mb-3">📈 營收趨勢（{rangeLabel}）</h2>
        {revenueTrend.some((d) => d.revenue > 0) ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(val: number, name: string) =>
                  name === "revenue" ? [`NT$${val.toLocaleString()}`, "營收"] : [`NT$${val.toLocaleString()}`, "7日均值"]
                }
              />
              <Line type="monotone" dataKey="revenue" stroke="hsl(145, 63%, 42%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="avg7" stroke="hsl(145, 40%, 60%)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-center py-8">尚無資料</p>
        )}
      </div>

      {/* SECTION C: Popular services */}
      <div className="bg-card rounded-xl shadow p-4">
        <h2 className="font-semibold text-foreground mb-3">🏆 熱門服務</h2>
        {serviceStats.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={serviceStats} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(val: number, name: string) => name === "count" ? [`${val} 筆`, "預約數"] : [`NT$${val.toLocaleString()}`, "營收"]} />
              <Bar dataKey="count" fill="hsl(145, 63%, 42%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-center py-8">尚無資料</p>
        )}
      </div>

      {/* SECTION D: Heatmap */}
      <div className="bg-card rounded-xl shadow p-4">
        <h2 className="font-semibold text-foreground mb-3">🔥 熱門時段</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="flex">
              <div className="w-12 shrink-0" />
              {HOURS_LABELS.filter((_, i) => i % 2 === 0).map((h) => (
                <div key={h} className="flex-1 text-[10px] text-muted-foreground text-center">{h}</div>
              ))}
            </div>
            {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => (
              <div key={dayIdx} className="flex items-center gap-0.5 mb-0.5">
                <div className="w-12 shrink-0 text-xs text-muted-foreground text-right pr-1">{WEEKDAYS[dayIdx]}</div>
                {HOURS_LABELS.map((_, hourIdx) => {
                  const val = heatmapData[`${dayIdx}-${hourIdx}`] || 0;
                  const intensity = val / maxHeat;
                  return (
                    <div key={hourIdx} className="flex-1 aspect-square rounded-sm min-w-[16px] max-w-[24px]"
                      style={{ backgroundColor: val === 0 ? "hsl(140, 10%, 94%)" : `hsla(145, 63%, 42%, ${0.15 + intensity * 0.85})` }}
                      title={`${WEEKDAYS[dayIdx]} ${HOURS_LABELS[hourIdx]}: ${val} 筆`} />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION E: Customer analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl shadow p-4">
          <h2 className="font-semibold text-foreground mb-3">👥 新客 vs 回流客</h2>
          {pieData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  <Cell fill="hsl(200, 60%, 55%)" />
                  <Cell fill="hsl(145, 63%, 42%)" />
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">尚無資料</p>
          )}
        </div>

        <div className="bg-card rounded-xl shadow p-4">
          <h2 className="font-semibold text-foreground mb-3">🏅 常客排行（Top 10）</h2>
          {top10.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left p-1.5">姓名</th>
                    <th className="text-left p-1.5">電話</th>
                    <th className="text-center p-1.5">次數</th>
                    <th className="text-left p-1.5">最後預約</th>
                    <th className="text-right p-1.5">累計消費</th>
                  </tr>
                </thead>
                <tbody>
                  {top10.map((c) => (
                    <tr key={c.phone} className="border-b border-border/50">
                      <td className="p-1.5 font-medium">{c.name}</td>
                      <td className="p-1.5 text-muted-foreground">{c.phone}</td>
                      <td className="p-1.5 text-center"><Badge variant="secondary" className="text-xs">{c.count}</Badge></td>
                      <td className="p-1.5 text-muted-foreground text-xs">{c.lastDate}</td>
                      <td className="p-1.5 text-right font-medium text-primary">NT${c.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">尚無資料</p>
          )}
        </div>
      </div>

      {/* SECTION F: Export */}
      <div className="bg-card rounded-xl shadow p-4 flex flex-wrap gap-3">
        <Button variant="outline" onClick={exportBookingsCSV}>
          <Download className="w-4 h-4 mr-1" /> 匯出{rangeLabel}報表 CSV
        </Button>
        <Button variant="outline" onClick={exportCustomersCSV}>
          <Download className="w-4 h-4 mr-1" /> 匯出客戶名單 CSV
        </Button>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, valueClass = "" }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-card rounded-xl shadow p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">{icon}{label}</div>
      <div className={`text-2xl font-bold text-foreground ${valueClass}`}>{value}</div>
    </div>
  );
}

function downloadCSV(headers: string[], rows: any[][], filename: string) {
  const BOM = "\uFEFF";
  const csv = BOM + headers.join(",") + "\n" + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
