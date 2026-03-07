import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatHourToTime, generateTimeSlots } from "@/lib/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash2, LogOut, RotateCcw, ChevronLeft, ChevronRight, List, CalendarDays } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

const ADMIN_PASSWORD = "bulaosong2024";

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
}

interface Holiday {
  id: string;
  date: string;
  type: string;
  start_hour: number | null;
  end_hour: number | null;
  note: string | null;
}

type CalendarViewMode = "day" | "week" | "month";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [tab, setTab] = useState("bookings");
  const [showCancelled, setShowCancelled] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarMode, setCalendarMode] = useState<CalendarViewMode>("week");
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Holiday form
  const [hDate, setHDate] = useState<Date>();
  const [hType, setHType] = useState<string>("整天公休");
  const [hStart, setHStart] = useState<string>("");
  const [hEnd, setHEnd] = useState<string>("");
  const [hNote, setHNote] = useState("");

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      sessionStorage.setItem("admin_auth", "true");
    } else {
      toast.error("密碼錯誤");
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem("admin_auth") === "true") {
      setAuthenticated(true);
    }
  }, []);

  const fetchBookings = async () => {
    const { data } = await supabase.from('bookings').select('*').order('date', { ascending: false });
    if (data) setBookings(data as Booking[]);
  };

  const fetchHolidays = async () => {
    const { data } = await supabase.from('holidays').select('*').order('date', { ascending: false });
    if (data) setHolidays(data as Holiday[]);
  };

  useEffect(() => {
    if (authenticated) {
      fetchBookings();
      fetchHolidays();
    }
  }, [authenticated]);

  const softDeleteBooking = async (id: string) => {
    await supabase.from('bookings').update({ cancelled_at: new Date().toISOString() } as any).eq('id', id);
    fetchBookings();
    toast.success("已取消預約（可復原）");
  };

  const restoreBooking = async (id: string) => {
    await supabase.from('bookings').update({ cancelled_at: null } as any).eq('id', id);
    fetchBookings();
    toast.success("已復原預約");
  };

  const permanentDeleteBooking = async (id: string) => {
    await supabase.from('bookings').delete().eq('id', id);
    fetchBookings();
    toast.success("已永久刪除預約");
  };

  const deleteHoliday = async (id: string) => {
    await supabase.from('holidays').delete().eq('id', id);
    fetchHolidays();
    toast.success("已刪除公休");
  };

  const addHoliday = async () => {
    if (!hDate) { toast.error("請選擇日期"); return; }
    const data: any = {
      date: format(hDate, "yyyy-MM-dd"),
      type: hType,
      note: hNote || null,
    };
    if (hType === '部分時段公休') {
      if (!hStart || !hEnd) { toast.error("請選擇時段"); return; }
      data.start_hour = parseFloat(hStart);
      data.end_hour = parseFloat(hEnd);
    }
    await supabase.from('holidays').insert(data);
    fetchHolidays();
    setHDate(undefined);
    setHNote("");
    toast.success("已新增公休");
  };

  const activeBookings = bookings.filter(b => !b.cancelled_at);
  const cancelledBookings = bookings.filter(b => !!b.cancelled_at);
  const displayedBookings = showCancelled ? cancelledBookings : activeBookings;

  // Calendar navigation
  const navigateCalendar = (direction: 1 | -1) => {
    if (calendarMode === "day") setCalendarDate(prev => direction === 1 ? addDays(prev, 1) : subDays(prev, 1));
    else if (calendarMode === "week") setCalendarDate(prev => direction === 1 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    else setCalendarDate(prev => direction === 1 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const calendarDays = useMemo(() => {
    if (calendarMode === "day") return [calendarDate];
    if (calendarMode === "week") {
      const start = startOfWeek(calendarDate, { weekStartsOn: 1 });
      const end = endOfWeek(calendarDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
    const start = startOfMonth(calendarDate);
    const end = endOfMonth(calendarDate);
    return eachDayOfInterval({ start, end });
  }, [calendarDate, calendarMode]);

  const calendarTitle = useMemo(() => {
    if (calendarMode === "day") return format(calendarDate, "yyyy年M月d日 (EEEE)", { locale: zhTW });
    if (calendarMode === "week") {
      const start = startOfWeek(calendarDate, { weekStartsOn: 1 });
      const end = endOfWeek(calendarDate, { weekStartsOn: 1 });
      return `${format(start, "M/d")} ~ ${format(end, "M/d")}`;
    }
    return format(calendarDate, "yyyy年M月", { locale: zhTW });
  }, [calendarDate, calendarMode]);

  const getBookingsForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return activeBookings.filter(b => b.date === dateStr).sort((a, b) => a.start_hour - b.start_hour);
  };

  // Stats data
  const monthlyRevenue = activeBookings.reduce((acc, b) => {
    const month = b.date.substring(0, 7);
    acc[month] = (acc[month] || 0) + b.total_price;
    return acc;
  }, {} as Record<string, number>);

  const serviceCount = activeBookings.reduce((acc, b) => {
    const sName = b.service.split(' (')[0].split('（')[0];
    acc[sName] = (acc[sName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const revenueData = Object.entries(monthlyRevenue).sort().map(([month, revenue]) => ({ month, revenue }));
  const serviceData = Object.entries(serviceCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
  const COLORS = ['hsl(145, 63%, 42%)', 'hsl(145, 50%, 55%)', 'hsl(140, 40%, 65%)', 'hsl(135, 30%, 70%)', 'hsl(130, 25%, 75%)', 'hsl(120, 20%, 80%)', 'hsl(110, 15%, 85%)', 'hsl(100, 10%, 90%)'];

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-lg p-6 max-w-sm w-full">
          <h1 className="text-xl font-bold text-center mb-4 text-foreground">管理後台登入</h1>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="請輸入管理員密碼"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <Button className="w-full" onClick={handleLogin}>登入</Button>
          </div>
        </div>
      </div>
    );
  }

  const timeSlots = generateTimeSlots();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground">不老松足湯 · 管理後台</h1>
          <Button variant="outline" size="sm" onClick={() => { setAuthenticated(false); sessionStorage.removeItem("admin_auth"); }}>
            <LogOut className="w-4 h-4 mr-1" /> 登出
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="bookings" className="flex-1">預約列表</TabsTrigger>
            <TabsTrigger value="holidays" className="flex-1">公休設定</TabsTrigger>
            <TabsTrigger value="stats" className="flex-1">統計</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="mt-4 space-y-4">
            {/* View toggle bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4 mr-1" /> 列表
                </Button>
                <Button
                  variant={viewMode === "calendar" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("calendar")}
                >
                  <CalendarDays className="w-4 h-4 mr-1" /> 日曆
                </Button>
              </div>
              {viewMode === "list" && (
                <div className="flex items-center gap-2">
                  <Button
                    variant={!showCancelled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowCancelled(false)}
                  >
                    有效預約 ({activeBookings.length})
                  </Button>
                  <Button
                    variant={showCancelled ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setShowCancelled(true)}
                  >
                    已取消 ({cancelledBookings.length})
                  </Button>
                </div>
              )}
              {viewMode === "calendar" && (
                <div className="flex items-center gap-1">
                  <Button variant={calendarMode === "day" ? "default" : "outline"} size="sm" onClick={() => setCalendarMode("day")}>日</Button>
                  <Button variant={calendarMode === "week" ? "default" : "outline"} size="sm" onClick={() => setCalendarMode("week")}>週</Button>
                  <Button variant={calendarMode === "month" ? "default" : "outline"} size="sm" onClick={() => setCalendarMode("month")}>月</Button>
                </div>
              )}
            </div>

            {viewMode === "list" ? (
              <div className="bg-card rounded-xl shadow p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left p-2">下單時間</th>
                      <th className="text-left p-2">日期</th>
                      <th className="text-left p-2">時段</th>
                      <th className="text-left p-2">姓名</th>
                      <th className="text-left p-2">電話</th>
                      <th className="text-left p-2">服務</th>
                      <th className="text-left p-2">加購</th>
                      <th className="text-left p-2">時長</th>
                      <th className="text-left p-2">金額</th>
                      <th className="p-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedBookings.map(b => (
                      <tr key={b.id} className={cn("border-b border-border hover:bg-secondary/50", b.cancelled_at && "opacity-60")}>
                        <td className="p-2 whitespace-nowrap">{new Date(b.order_time).toLocaleString('zh-TW')}</td>
                        <td className="p-2">{b.date}</td>
                        <td className="p-2">{b.start_time_str}</td>
                        <td className="p-2">{b.name}</td>
                        <td className="p-2">{b.phone}</td>
                        <td className="p-2 max-w-[150px] truncate">{b.service}</td>
                        <td className="p-2 max-w-[120px] truncate">{b.addons?.join(', ') || '-'}</td>
                        <td className="p-2">{b.duration}分</td>
                        <td className="p-2 font-medium text-primary">NT${b.total_price.toLocaleString()}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            {b.cancelled_at ? (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => restoreBooking(b.id)} title="復原">
                                  <RotateCcw className="w-4 h-4 text-primary" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" title="永久刪除">
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>確認永久刪除？</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        此操作無法復原，預約資料將被永久移除。
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>取消</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => permanentDeleteBooking(b.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">確認刪除</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            ) : (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" title="取消預約">
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>確認取消預約？</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      取消後可在「已取消」列表中復原。
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>返回</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => softDeleteBooking(b.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">確認取消</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {displayedBookings.length === 0 && (
                      <tr><td colSpan={10} className="text-center text-muted-foreground p-8">{showCancelled ? "沒有已取消的預約" : "尚無預約"}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Calendar View */
              <div className="bg-card rounded-xl shadow p-4">
                {/* Calendar header */}
                <div className="flex items-center justify-between mb-4">
                  <Button variant="outline" size="sm" onClick={() => navigateCalendar(-1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="text-center">
                    <span className="font-semibold text-foreground">{calendarTitle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCalendarDate(new Date())}>今天</Button>
                    <Button variant="outline" size="sm" onClick={() => navigateCalendar(1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {calendarMode === "day" ? (
                  /* Day view: time slots with bookings */
                  <DayView day={calendarDate} bookings={activeBookings} />
                ) : calendarMode === "week" ? (
                  /* Week view */
                  <div className="grid grid-cols-7 gap-1">
                    {["一", "二", "三", "四", "五", "六", "日"].map(d => (
                      <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                    ))}
                    {calendarDays.map(day => {
                      const dayBookings = getBookingsForDay(day);
                      const isToday = isSameDay(day, new Date());
                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            "border border-border rounded-lg p-1 min-h-[100px] cursor-pointer hover:bg-secondary/30 transition-colors",
                            isToday && "border-primary bg-primary/5"
                          )}
                          onClick={() => { setCalendarMode("day"); setCalendarDate(day); }}
                        >
                          <div className={cn("text-xs font-medium mb-1 text-center", isToday ? "text-primary" : "text-foreground")}>
                            {format(day, "M/d")}
                          </div>
                          <div className="space-y-0.5">
                            {dayBookings.slice(0, 3).map(b => (
                              <div key={b.id} className="bg-primary/10 text-primary text-[10px] px-1 py-0.5 rounded truncate">
                                {b.start_time_str} {b.name}
                              </div>
                            ))}
                            {dayBookings.length > 3 && (
                              <div className="text-[10px] text-muted-foreground text-center">+{dayBookings.length - 3} 筆</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Month view */
                  <div className="grid grid-cols-7 gap-1">
                    {["一", "二", "三", "四", "五", "六", "日"].map(d => (
                      <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                    ))}
                    {/* Pad first week */}
                    {Array.from({ length: (calendarDays[0].getDay() + 6) % 7 }).map((_, i) => (
                      <div key={`pad-${i}`} className="min-h-[80px]" />
                    ))}
                    {calendarDays.map(day => {
                      const dayBookings = getBookingsForDay(day);
                      const isToday = isSameDay(day, new Date());
                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            "border border-border rounded p-1 min-h-[80px] cursor-pointer hover:bg-secondary/30 transition-colors",
                            isToday && "border-primary bg-primary/5"
                          )}
                          onClick={() => { setCalendarMode("day"); setCalendarDate(day); }}
                        >
                          <div className={cn("text-xs font-medium text-center", isToday ? "text-primary" : "text-foreground")}>
                            {format(day, "d")}
                          </div>
                          {dayBookings.length > 0 && (
                            <div className="mt-0.5">
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 w-full justify-center bg-primary/10 text-primary border-0">
                                {dayBookings.length} 筆
                              </Badge>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="holidays" className="mt-4 space-y-4">
            <div className="bg-card rounded-xl shadow p-4 space-y-4">
              <h2 className="font-semibold text-foreground">新增公休</h2>
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
                {hType === '部分時段公休' && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-sm">開始時間</Label>
                      <Select value={hStart} onValueChange={setHStart}>
                        <SelectTrigger><SelectValue placeholder="選擇" /></SelectTrigger>
                        <SelectContent>
                          {timeSlots.map(s => (
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
                          {timeSlots.map(s => (
                            <SelectItem key={s} value={s.toString()}>{formatHourToTime(s)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-sm">備註</Label>
                  <Input value={hNote} onChange={e => setHNote(e.target.value)} placeholder="選填" />
                </div>
              </div>
              <Button onClick={addHoliday}>新增公休</Button>
            </div>

            <div className="bg-card rounded-xl shadow p-4 overflow-x-auto">
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
                  {holidays.map(h => (
                    <tr key={h.id} className="border-b border-border">
                      <td className="p-2">{h.date}</td>
                      <td className="p-2">{h.type}</td>
                      <td className="p-2">{h.type === '部分時段公休' && h.start_hour != null ? `${formatHourToTime(h.start_hour)} ~ ${formatHourToTime(h.end_hour!)}` : '-'}</td>
                      <td className="p-2">{h.note || '-'}</td>
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
          </TabsContent>

          <TabsContent value="stats" className="mt-4 space-y-4">
            <div className="bg-card rounded-xl shadow p-4">
              <h2 className="font-semibold mb-4 text-foreground">月營收統計</h2>
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(val: number) => `NT$${val.toLocaleString()}`} />
                    <Bar dataKey="revenue" fill="hsl(145, 63%, 42%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-muted-foreground text-center py-8">尚無資料</p>}
            </div>

            <div className="bg-card rounded-xl shadow p-4">
              <h2 className="font-semibold mb-4 text-foreground">熱門服務</h2>
              {serviceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={serviceData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, count }) => `${name}: ${count}`}>
                      {serviceData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-muted-foreground text-center py-8">尚無資料</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* Day View Component */
function DayView({ day, bookings }: { day: Date; bookings: Booking[] }) {
  const dateStr = format(day, "yyyy-MM-dd");
  const dayBookings = bookings.filter(b => b.date === dateStr).sort((a, b) => a.start_hour - b.start_hour);

  const timeSlots = generateTimeSlots();

  return (
    <div className="space-y-0">
      {timeSlots.map(slot => {
        const slotBookings = dayBookings.filter(b => b.start_hour === slot);
        return (
          <div key={slot} className={cn("flex border-b border-border/50 min-h-[44px]", slotBookings.length > 0 && "bg-primary/5")}>
            <div className="w-16 shrink-0 text-xs text-muted-foreground py-2 pr-2 text-right font-mono">
              {formatHourToTime(slot)}
            </div>
            <div className="flex-1 py-1 px-2 space-y-1">
              {slotBookings.map(b => (
                <div key={b.id} className="bg-primary/15 border border-primary/20 rounded-md px-2 py-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{b.name}</span>
                    <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">
                      {b.duration}分
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {b.service} · NT${b.total_price.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {dayBookings.length === 0 && (
        <div className="text-center text-muted-foreground py-8">當日無預約</div>
      )}
    </div>
  );
}
