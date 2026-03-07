import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatHourToTime, generateTimeSlots } from "@/lib/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash2, LogOut } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

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
}

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
  const [tab, setTab] = useState("bookings");

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

  const deleteBooking = async (id: string) => {
    await supabase.from('bookings').delete().eq('id', id);
    fetchBookings();
    toast.success("已刪除預約");
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

  // Stats data
  const monthlyRevenue = bookings.reduce((acc, b) => {
    const month = b.date.substring(0, 7);
    acc[month] = (acc[month] || 0) + b.total_price;
    return acc;
  }, {} as Record<string, number>);

  const serviceCount = bookings.reduce((acc, b) => {
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
      <div className="max-w-5xl mx-auto px-4 py-6">
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

          <TabsContent value="bookings" className="mt-4">
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
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} className="border-b border-border hover:bg-secondary/50">
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
                        <Button variant="ghost" size="sm" onClick={() => deleteBooking(b.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr><td colSpan={10} className="text-center text-muted-foreground p-8">尚無預約</td></tr>
                  )}
                </tbody>
              </table>
            </div>
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
