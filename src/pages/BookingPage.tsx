import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatHourToTime } from "@/lib/services";
import { getAvailableSlots, generateGoogleCalendarLink } from "@/lib/timeUtils";
import { useCalendarNotes } from "@/hooks/useCalendarNotes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckCircle2, Clock, DollarSign, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DbService {
  id: string;
  name: string;
  duration: number;
  price: number;
  category: string;
  is_active: boolean;
  sort_order: number;
}

interface DbAddon {
  id: string;
  name: string;
  extra_duration: number;
  extra_price: number;
  applicable_categories: string[];
  addon_type: string;
  is_active: boolean;
  sort_order: number;
}

export default function BookingPage() {
  const { notes: calendarNotes } = useCalendarNotes();
  const [dbServices, setDbServices] = useState<DbService[]>([]);
  const [dbAddons, setDbAddons] = useState<DbAddon[]>([]);
  const [selectedService, setSelectedService] = useState<DbService | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedAroma, setSelectedAroma] = useState<string>("");
  const [date, setDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<number[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  // Load services and addons from DB
  useEffect(() => {
    const load = async () => {
      const [{ data: s }, { data: a }] = await Promise.all([
        supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("addons").select("*").eq("is_active", true).order("sort_order"),
      ]);
      if (s) setDbServices(s as DbService[]);
      if (a) setDbAddons(a as DbAddon[]);
    };
    load();
  }, []);

  // Filter addons based on selected service category
  const availableAddons = useMemo(() => {
    if (!selectedService) return [];
    // 套餐: hide all addons
    if (selectedService.category === "package") return [];

    return dbAddons.filter(addon => {
      // Only show addons applicable to this category
      if (addon.applicable_categories.length > 0 && !addon.applicable_categories.includes(selectedService.category)) {
        return false;
      }
      // Hide aroma type from checkbox list (shown separately)
      if (addon.addon_type === "精油香味") return false;
      return true;
    });
  }, [selectedService, dbAddons]);

  const aromaOptions = useMemo(() => {
    return dbAddons.filter(a => a.addon_type === "精油香味" && a.is_active);
  }, [dbAddons]);

  const hasOilUpgrade = selectedAddons.some(name => name.includes("精油"));

  const totalDuration = useMemo(() => {
    if (!selectedService) return 0;
    const addonDur = dbAddons
      .filter(a => selectedAddons.includes(a.name))
      .reduce((sum, a) => sum + a.extra_duration, 0);
    return selectedService.duration + addonDur;
  }, [selectedService, selectedAddons, dbAddons]);

  const totalPrice = useMemo(() => {
    if (!selectedService) return 0;
    const addonPrice = dbAddons
      .filter(a => selectedAddons.includes(a.name))
      .reduce((sum, a) => sum + a.extra_price, 0);
    return selectedService.price + addonPrice;
  }, [selectedService, selectedAddons, dbAddons]);

  useEffect(() => {
    setSelectedAddons([]);
    setSelectedAroma("");
  }, [selectedService]);

  useEffect(() => {
    setSelectedSlot(null);
  }, [date, totalDuration]);

  useEffect(() => {
    if (!date || !selectedService) return;
    const dateStr = format(date, "yyyy-MM-dd");
    setLoadingSlots(true);
    getAvailableSlots(dateStr, totalDuration).then(slots => {
      setAvailableSlots(slots);
      setLoadingSlots(false);
    });
  }, [date, totalDuration, selectedService]);

  const handleAddonToggle = (addonName: string) => {
    setSelectedAddons(prev =>
      prev.includes(addonName)
        ? prev.filter(a => a !== addonName)
        : [...prev, addonName]
    );
    if (addonName.includes("精油")) {
      setSelectedAroma("");
    }
  };

  const handleSubmit = async () => {
    if (!selectedService || !date || selectedSlot === null || !name.trim() || !phone.trim()) {
      toast.error("請填寫所有必填欄位");
      return;
    }
    if (hasOilUpgrade && !selectedAroma) {
      toast.error("請選擇精油香味");
      return;
    }

    setLoading(true);
    const dateStr = format(date, "yyyy-MM-dd");
    const allAddons = [...selectedAddons];
    if (selectedAroma) allAddons.push(selectedAroma);

    const bookingData = {
      date: dateStr,
      start_hour: selectedSlot,
      start_time_str: formatHourToTime(selectedSlot),
      name: name.trim(),
      phone: phone.trim(),
      service: selectedService.name,
      addons: allAddons,
      duration: totalDuration,
      total_price: totalPrice,
      source: 'customer',
    };

    const { error } = await supabase.from('bookings').insert(bookingData);
    setLoading(false);

    if (error) {
      toast.error("預約失敗，請稍後再試");
      console.error(error);
    } else {
      setSuccess({
        ...bookingData,
        calendarLink: generateGoogleCalendarLink({
          date: dateStr,
          start_hour: selectedSlot,
          duration: totalDuration,
          service: selectedService.name,
          name: name.trim(),
          phone: phone.trim(),
          addons: allAddons,
          total_price: totalPrice,
        }),
      });
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-lg p-6 max-w-md w-full animate-fade-in">
          <div className="text-center mb-6">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-foreground">預約成功！</h1>
            <p className="text-muted-foreground mt-1">感謝您的預約，以下是預約資訊</p>
          </div>
          <div className="space-y-3 bg-secondary rounded-lg p-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">日期</span><span className="font-medium">{success.date}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">時段</span><span className="font-medium">{success.start_time_str}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">姓名</span><span className="font-medium">{success.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">電話</span><span className="font-medium">{success.phone}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">服務</span><span className="font-medium text-right max-w-[200px]">{success.service}</span></div>
            {success.addons.length > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">加購</span><span className="font-medium text-right max-w-[200px]">{success.addons.join(', ')}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">時長</span><span className="font-medium">{success.duration} 分鐘</span></div>
            <div className="flex justify-between border-t border-border pt-2"><span className="text-muted-foreground">金額</span><span className="font-bold text-primary text-lg">NT$ {success.total_price.toLocaleString()}</span></div>
          </div>
          <div className="mt-6 space-y-3">
            <a href={success.calendarLink} target="_blank" rel="noopener noreferrer">
              <Button className="w-full" variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                加入 Google 日曆
              </Button>
            </a>
            <Button className="w-full" onClick={() => {
              setSuccess(null);
              setSelectedService(null);
              setSelectedAddons([]);
              setSelectedAroma("");
              setDate(undefined);
              setSelectedSlot(null);
              setName("");
              setPhone("");
            }}>
              再次預約
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">不老松足湯安平店</h1>
          <p className="text-muted-foreground mt-1">嘉豪師傅 · 線上預約</p>
        </div>

        <div className="bg-card rounded-xl shadow-lg p-5 space-y-5 animate-fade-in">
          {/* Service Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">選擇服務 *</Label>
            <Select onValueChange={(val) => setSelectedService(dbServices.find(s => s.name === val) || null)}>
              <SelectTrigger>
                <SelectValue placeholder="請選擇服務項目" />
              </SelectTrigger>
              <SelectContent>
                {dbServices.map(s => (
                  <SelectItem key={s.id} value={s.name}>
                    {s.name} — NT${s.price.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Add-ons */}
          {selectedService && availableAddons.length > 0 && (
            <div className="space-y-3 animate-fade-in">
              <Label className="text-sm font-semibold">加購項目</Label>
              {availableAddons.map(addon => (
                <div key={addon.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={addon.name}
                    checked={selectedAddons.includes(addon.name)}
                    onCheckedChange={() => handleAddonToggle(addon.name)}
                  />
                  <label htmlFor={addon.name} className="text-sm cursor-pointer flex-1">
                    {addon.name}
                    {addon.extra_price > 0 && <span className="text-primary font-medium ml-1">+NT${addon.extra_price}</span>}
                  </label>
                </div>
              ))}

              {/* Aroma selection */}
              {hasOilUpgrade && aromaOptions.length > 0 && (
                <div className="ml-6 p-3 bg-accent rounded-lg animate-fade-in">
                  <Label className="text-sm font-semibold text-accent-foreground mb-2 block">選擇精油香味 *</Label>
                  <RadioGroup value={selectedAroma} onValueChange={setSelectedAroma}>
                    {aromaOptions.map(a => (
                      <div key={a.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={a.name} id={a.name} />
                        <label htmlFor={a.name} className="text-sm cursor-pointer">{a.name}</label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </div>
          )}

          {/* Price & Duration */}
          {selectedService && (
            <div className="flex gap-3 animate-fade-in">
              <div className="flex-1 bg-accent rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-accent-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">{totalDuration} 分鐘</span>
                </div>
              </div>
              <div className="flex-1 bg-primary/10 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-primary">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm font-bold">NT$ {totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Date Picker */}
          {selectedService && (
            <div className="space-y-2 animate-fade-in">
              <Label className="text-sm font-semibold">選擇日期 *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "yyyy年MM月dd日", { locale: zhTW }) : "請選擇日期"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Time Slots */}
          {date && selectedService && (
            <div className="space-y-2 animate-fade-in">
              <Label className="text-sm font-semibold">選擇時段 *</Label>
              {loadingSlots ? (
                <p className="text-sm text-muted-foreground">載入可用時段中...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-destructive">該日無可用時段</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map(slot => (
                    <Button
                      key={slot}
                      variant={selectedSlot === slot ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSlot(slot)}
                      className="text-xs"
                    >
                      {formatHourToTime(slot)}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Name & Phone */}
          {selectedSlot !== null && (
            <div className="space-y-3 animate-fade-in">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">姓名 *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="請輸入姓名" maxLength={50} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">電話 *</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="請輸入電話號碼" maxLength={20} type="tel" />
              </div>
            </div>
          )}

          {/* Submit */}
          {selectedSlot !== null && (
            <Button className="w-full text-base py-5 animate-fade-in" onClick={handleSubmit} disabled={loading}>
              {loading ? "預約中..." : "確認預約"}
            </Button>
          )}
        </div>

        <div className="text-center mt-6 space-y-1">
          <p className="text-xs text-muted-foreground">營業時間：14:00 ~ 02:00（隔日）</p>
          <p className="text-xs text-muted-foreground">台南市安平區 · 不老松足湯安平店</p>
        </div>
      </div>
    </div>
  );
}
