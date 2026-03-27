import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase, supabaseUrl, supabaseAnonKey } from "@/integrations/supabase/client";
import { formatHourToTime } from "@/lib/services";
import { getAvailableSlots, generateGoogleCalendarLink } from "@/lib/timeUtils";
import { useCalendarNotes } from "@/hooks/useCalendarNotes";
import { useShopInfo } from "@/hooks/useShopInfo";
import { useBookingSettings } from "@/hooks/useBookingSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon, CheckCircle2, Clock, DollarSign, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useStore, FALLBACK_STORE_ID } from "@/contexts/StoreContext";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { resolveMainCoachFromCoachRows } from "@/lib/mainCoachResolution";

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

interface CoachOption {
  id: string;
  name: string;
  is_active: boolean;
  available_today: boolean;
  shift_start_hour?: number;
  shift_end_hour?: number;
  display_order: number;
}

const formatCoachHour = (hour?: number) => {
  const raw = Number.isFinite(hour) ? Number(hour) : 14;
  const normalized = raw >= 24 ? raw - 24 : raw;
  return `${String(Math.floor(normalized)).padStart(2, "0")}:00`;
};

/** LINE 內建瀏覽器對 target=_blank 支援不佳，改為直接導向 Google 日曆 */
function openGoogleCalendarLink(url: string) {
  const isLine = /Line\//i.test(navigator.userAgent || "");
  if (isLine) {
    window.location.assign(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export default function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLineCalendarEntry = /^\/mylinecalendar$/i.test(location.pathname);
  const { storeId, currentStore } = useStore();
  const effectiveStoreId =
    typeof storeId === "string" && storeId.trim() !== "" ? storeId.trim() : FALLBACK_STORE_ID;
  const { notes: calendarNotes } = useCalendarNotes();
  const { info: shopInfo } = useShopInfo();
  const { content: landingContent } = useStoreSettings();
  const { settings: bookingSettings } = useBookingSettings();
  const [dbServices, setDbServices] = useState<DbService[]>([]);
  const [dbAddons, setDbAddons] = useState<DbAddon[]>([]);
  const [selectedService, setSelectedService] = useState<DbService | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedAroma, setSelectedAroma] = useState<string>("");
  const [date, setDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<number[]>([]);
  const [singleModeSlots, setSingleModeSlots] = useState<number[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [partySize, setPartySize] = useState<"1" | "2">("1");
  const [coaches, setCoaches] = useState<CoachOption[]>([]);
  const [preferredBackupCoachId, setPreferredBackupCoachId] = useState<string>("none");
  const [preferredBackupCoachName, setPreferredBackupCoachName] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [phoneError, setPhoneError] = useState("");
  const [showUnavailableDetails, setShowUnavailableDetails] = useState(false);
  const [genericPairSlotCount, setGenericPairSlotCount] = useState(0);
  const [predictedPairBackupName, setPredictedPairBackupName] = useState<string | null>(null);
  const [symptomTags, setSymptomTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const validatePhone = (value: string): string => {
    const cleaned = value.replace(/[\s\-()]/g, "");
    if (!cleaned) return "請輸入電話號碼";
    if (!/^\d+$/.test(cleaned)) return "電話號碼只能包含數字";
    if (!cleaned.startsWith("09")) return "手機號碼需以 09 開頭";
    if (cleaned.length !== 10) return "手機號碼需為 10 碼，例如 0912345678";
    return "";
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (phoneError) setPhoneError(validatePhone(value));
  };

  useEffect(() => {
    if (!isLineCalendarEntry) return;
    const base = currentStore?.name ?? shopInfo.store_name ?? "線上預約";
    const prev = document.title;
    document.title = `${base}｜預約日曆`;
    return () => {
      document.title = prev;
    };
  }, [isLineCalendarEntry, currentStore?.name, shopInfo.store_name]);

  // Load services and addons from DB
  useEffect(() => {
    const load = async () => {
      const [{ data: s }, { data: a }, coachResp] = await Promise.all([
        supabase.from("services").select("*").eq("is_active", true).eq("store_id", storeId).order("sort_order"),
        supabase.from("addons").select("*").eq("is_active", true).eq("store_id", storeId).order("sort_order"),
        supabase
          .from("coaches")
          .select("id,name,is_active,available_today,shift_start_hour,shift_end_hour,display_order")
          .eq("store_id", storeId)
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);
      if (s) setDbServices(s as DbService[]);
      if (a) setDbAddons(a as DbAddon[]);
      if (coachResp.error?.message?.includes("shift_start_hour")) {
        const fallback = await supabase
          .from("coaches")
          .select("id,name,is_active,available_today,display_order")
          .eq("store_id", storeId)
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: true });
        if (fallback.data) {
          setCoaches(
            (fallback.data as Array<Omit<CoachOption, "shift_start_hour" | "shift_end_hour">>).map((x) => ({
              ...x,
              shift_start_hour: 14,
              shift_end_hour: 26,
            })),
          );
        }
      } else if (coachResp.data) {
        setCoaches(coachResp.data as CoachOption[]);
      }
    };
    load();
  }, [effectiveStoreId]);

  /** 與 CMS 調理師標題 + api-booking 一致（服務管理皆為搭班池，主師傅由此比對 coaches.name） */
  const resolvedMainCoach = useMemo(() => {
    return resolveMainCoachFromCoachRows(
      coaches,
      landingContent.therapist_section_title || "",
      shopInfo.therapist_name,
    );
  }, [coaches, landingContent.therapist_section_title, shopInfo.therapist_name]);

  const mainCoachNameForSlots = useMemo(() => {
    const cms = (landingContent.therapist_section_title || "").trim();
    const sys = (shopInfo.therapist_name || "").trim();
    return cms || sys || undefined;
  }, [landingContent.therapist_section_title, shopInfo.therapist_name]);

  const backupCoachOptions = useMemo(() => {
    if (!resolvedMainCoach) return [];
    return coaches.filter((coach) => coach.id !== resolvedMainCoach.id && coach.is_active);
  }, [coaches, resolvedMainCoach]);

  /** 不指定時，今日可能進入自動分配池的搭班師傅（僅說明用） */
  const autoAssignBackupPoolLabel = useMemo(() => {
    if (!resolvedMainCoach) return "";
    const pool = coaches.filter(
      (c) => c.id !== resolvedMainCoach.id && c.is_active && c.available_today,
    );
    if (pool.length === 0) return "今日暫無其他已開班搭班師傅";
    return pool.map((c) => c.name).join("、");
  }, [coaches, resolvedMainCoach]);

  useEffect(() => {
    if (partySize !== "2") {
      setPreferredBackupCoachId("none");
    }
  }, [partySize]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pair = params.get("pair");
    const coach = params.get("coach");
    const coachName = params.get("coachName");
    if (pair === "1") {
      setPartySize("2");
    }
    if (coach) {
      setPreferredBackupCoachId(coach);
    }
    if (coachName) {
      setPreferredBackupCoachName(coachName);
    }
  }, [location.search]);

  useEffect(() => {
    if (preferredBackupCoachId === "none") return;
    const exists = backupCoachOptions.some((coach) => coach.id === preferredBackupCoachId);
    if (!exists && backupCoachOptions.length > 0) {
      setPreferredBackupCoachId("none");
      setPreferredBackupCoachName("");
    }
  }, [backupCoachOptions, preferredBackupCoachId]);

  useEffect(() => {
    if (!resolvedMainCoach || preferredBackupCoachId === "none") return;
    if (preferredBackupCoachId === resolvedMainCoach.id) {
      setPreferredBackupCoachId("none");
      setPreferredBackupCoachName("");
      toast.info("主師傅無法指定為搭班，已改為不指定。");
    }
  }, [resolvedMainCoach?.id, preferredBackupCoachId]);

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

  // Service duration + addon duration (without free addon, for display)
  const serviceDuration = useMemo(() => {
    if (!selectedService) return 0;
    const addonDur = dbAddons
      .filter(a => selectedAddons.includes(a.name))
      .reduce((sum, a) => sum + a.extra_duration, 0);
    return selectedService.duration + addonDur;
  }, [selectedService, selectedAddons, dbAddons]);

  // Total duration including free addon (for slot calculation & booking)
  const totalDuration = serviceDuration + (selectedService ? bookingSettings.free_addon_duration : 0);

  // 雙人 + 不指定：依後端規則預估該時段會配到哪一位搭班師傅（與 api-booking 一致）
  useEffect(() => {
    if (
      partySize !== "2" ||
      preferredBackupCoachId !== "none" ||
      selectedSlot === null ||
      !date ||
      !selectedService ||
      !resolvedMainCoach ||
      totalDuration <= 0
    ) {
      setPredictedPairBackupName(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      const dateStr = format(date, "yyyy-MM-dd");
      const { data: cfgRows } = await supabase
        .from("system_config")
        .select("key,value")
        .eq("store_id", effectiveStoreId)
        .in("key", ["buffer_minutes"]);
      const bufferMinutes =
        parseInt(cfgRows?.find((r) => r.key === "buffer_minutes")?.value || "10", 10) || 10;

      const { data: bookingRows } = await supabase
        .from("bookings")
        .select("coach_id,start_hour,duration")
        .eq("store_id", effectiveStoreId)
        .eq("date", dateStr)
        .is("cancelled_at", null);

      if (cancelled) return;
      const allBookings = (bookingRows || []) as Array<{
        coach_id: string | null;
        start_hour: number;
        duration: number;
      }>;

      const slotOverlap = (
        startHour: number,
        durationMin: number,
        rows: Array<{ start_hour: number; duration: number }>,
      ) => {
        const newEnd = startHour + durationMin / 60;
        return rows.some((b) => {
          const bEnd = b.start_hour + (b.duration + bufferMinutes) / 60;
          return startHour < bEnd && newEnd > b.start_hour;
        });
      };

      const mainCoach = resolvedMainCoach;
      if (!mainCoach) {
        setPredictedPairBackupName(null);
        return;
      }

      const sorted = [...coaches].sort((a, b) => a.display_order - b.display_order);
      const newEnd = selectedSlot + totalDuration / 60;
      const mainBookings = allBookings
        .filter((b) => b.coach_id === mainCoach.id || b.coach_id == null)
        .map((b) => ({ start_hour: b.start_hour, duration: b.duration }));
      if (slotOverlap(selectedSlot, totalDuration, mainBookings)) {
        setPredictedPairBackupName(null);
        return;
      }

      const backupPool = sorted.filter(
        (c) =>
          c.id !== mainCoach.id &&
          c.available_today &&
          selectedSlot >= (c.shift_start_hour ?? 14) &&
          newEnd <= (c.shift_end_hour ?? 26),
      );

      const picks = backupPool
        .map((coach) => {
          const coachBookings = allBookings
            .filter((b) => b.coach_id === coach.id)
            .map((b) => ({ start_hour: b.start_hour, duration: b.duration }));
          return {
            name: coach.name,
            canTake: !slotOverlap(selectedSlot, totalDuration, coachBookings),
            dailyLoad: coachBookings.length,
          };
        })
        .filter((x) => x.canTake)
        .sort((a, b) => a.dailyLoad - b.dailyLoad);

      setPredictedPairBackupName(picks[0]?.name ?? null);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [
    partySize,
    preferredBackupCoachId,
    selectedSlot,
    date,
    selectedService,
    resolvedMainCoach,
    coaches,
    totalDuration,
    effectiveStoreId,
  ]);

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
    setShowUnavailableDetails(false);
  }, [date, partySize, selectedService, preferredBackupCoachId]);

  useEffect(() => {
    if (!date || !selectedService) return;
    const dateStr = format(date, "yyyy-MM-dd");
    setLoadingSlots(true);
    if (partySize === "2") {
      if (preferredBackupCoachId !== "none") {
        Promise.all([
          getAvailableSlots(
            dateStr,
            totalDuration,
            effectiveStoreId,
            true,
            preferredBackupCoachId,
            mainCoachNameForSlots,
          ),
          getAvailableSlots(
            dateStr,
            totalDuration,
            effectiveStoreId,
            true,
            undefined,
            mainCoachNameForSlots,
          ),
          getAvailableSlots(dateStr, totalDuration, effectiveStoreId, false),
        ]).then(([pairSlotsPreferred, pairSlotsGeneric, singleSlots]) => {
          setAvailableSlots(pairSlotsPreferred);
          setGenericPairSlotCount(pairSlotsGeneric.length);
          setSingleModeSlots(singleSlots);
          setLoadingSlots(false);
        });
      } else {
        Promise.all([
          getAvailableSlots(
            dateStr,
            totalDuration,
            effectiveStoreId,
            true,
            undefined,
            mainCoachNameForSlots,
          ),
          getAvailableSlots(dateStr, totalDuration, effectiveStoreId, false),
        ]).then(([pairSlots, singleSlots]) => {
          setAvailableSlots(pairSlots);
          setGenericPairSlotCount(pairSlots.length);
          setSingleModeSlots(singleSlots);
          setLoadingSlots(false);
        });
      }
    } else {
      getAvailableSlots(dateStr, totalDuration, effectiveStoreId, false).then(slots => {
        setAvailableSlots(slots);
        setGenericPairSlotCount(0);
        setSingleModeSlots(slots);
        setLoadingSlots(false);
      });
    }
  }, [date, totalDuration, selectedService, effectiveStoreId, partySize, preferredBackupCoachId, mainCoachNameForSlots]);

  const allCandidateSlots = useMemo(() => {
    const result: number[] = [];
    for (let hour = 14; hour < 26; hour += 0.5) result.push(hour);
    return result;
  }, []);

  const unavailablePairSlots = useMemo(() => {
    if (partySize !== "2") return [];
    return allCandidateSlots
      .filter((slot) => !availableSlots.includes(slot))
      .map((slot) => ({
        slot,
        reason: singleModeSlots.includes(slot) ? "今天搭班師傅未開班" : "主師傅該時段已額滿或公休",
      }));
  }, [allCandidateSlots, availableSlots, partySize, singleModeSlots]);

  const unavailablePairSummary = useMemo(() => {
    if (partySize !== "2") return { backupOff: 0, mainBusy: 0 };
    let backupOff = 0;
    let mainBusy = 0;
    unavailablePairSlots.forEach((x) => {
      if (x.reason.includes("搭班師傅")) backupOff += 1;
      else mainBusy += 1;
    });
    return { backupOff, mainBusy };
  }, [partySize, unavailablePairSlots]);

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
    const phoneValidationError = validatePhone(phone);
    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      toast.error(phoneValidationError);
      return;
    }
    setPhoneError("");
    if (hasOilUpgrade && !selectedAroma) {
      toast.error("請選擇精油香味");
      return;
    }

    setLoading(true);

    // Blacklist check
    const { data: customerData } = await supabase
      .from("customers")
      .select("is_blacklisted, blacklist_action")
      .eq("phone", phone.trim())
      .eq("store_id", effectiveStoreId)
      .maybeSingle();

    if (customerData?.is_blacklisted) {
      if (customerData.blacklist_action === "block") {
        toast.error("此電話號碼無法進行線上預約，請直接聯繫店家");
        setLoading(false);
        return;
      }
      // "warn" action: allow booking but it will show warning in admin
    }
    const dateStr = format(date, "yyyy-MM-dd");
    const allAddons = [...selectedAddons];
    if (selectedAroma) allAddons.push(selectedAroma);

    const bookingData = {
      date: dateStr,
      start_hour: selectedSlot,
      name: name.trim(),
      phone: phone.trim(),
      service: selectedService.name,
      addons: allAddons,
      duration: totalDuration,
      total_price: totalPrice,
      store_id: effectiveStoreId,
      needs_pair: partySize === "2",
      ...(partySize === "2" && preferredBackupCoachId !== "none"
        ? { preferred_backup_coach_id: preferredBackupCoachId }
        : {}),
      ...(email.trim() && { email: email.trim() }),
      symptom_tags: symptomTags,
      notes: notes.trim() || "",
    };

    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/api-booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(bookingData),
      });

      setLoading(false);
      if (!resp.ok) {
        let errMsg = "預約失敗，請稍後再試";
        try {
          const err = await resp.json();
          errMsg = err?.error || errMsg;
        } catch {
          // keep default message
        }
        toast.error(errMsg);
      } else {
        const okData = await resp.json();
        setSuccess({
          ...bookingData,
          party_size: partySize === "2" ? 2 : 1,
          primary_coach_name: okData?.assignment?.primaryCoachName || shopInfo.therapist_name,
          secondary_coach_name: okData?.assignment?.secondaryCoachName || null,
          start_time_str: formatHourToTime(selectedSlot),
          calendarLink: generateGoogleCalendarLink({
            date: dateStr,
            start_hour: selectedSlot,
            duration: totalDuration,
            service: selectedService.name,
            name: name.trim(),
            phone: phone.trim(),
            addons: allAddons,
            total_price: totalPrice,
            needs_pair: partySize === "2",
            primaryCoachName: okData?.assignment?.primaryCoachName || shopInfo.therapist_name,
            secondaryCoachName: okData?.assignment?.secondaryCoachName || undefined,
            calendarNotes,
            storeName: shopInfo.store_name,
            therapistName: shopInfo.therapist_name,
            storeLocation: shopInfo.store_location,
          }),
        });
      }
    } catch {
      setLoading(false);
      toast.error("預約失敗，請稍後再試");
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="mb-4 w-full max-w-md">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              回首頁
            </Link>
          </Button>
        </div>
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
            <div className="flex justify-between"><span className="text-muted-foreground">人數</span><span className="font-medium">{success.party_size} 位</span></div>
            {success.party_size === 2 ? (
              <div className="flex justify-between"><span className="text-muted-foreground">安排師傅</span><span className="font-medium text-right max-w-[200px]">{success.primary_coach_name} + {success.secondary_coach_name}</span></div>
            ) : null}
            {success.addons.length > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">加購</span><span className="font-medium text-right max-w-[200px]">{success.addons.join(', ')}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">時長</span><span className="font-medium">{success.duration} 分鐘</span></div>
            <div className="flex justify-between border-t border-border pt-2"><span className="text-muted-foreground">金額</span><span className="font-bold text-primary text-lg">NT$ {success.total_price.toLocaleString()}</span></div>
          </div>
          <div className="mt-6 space-y-3">
            <Button
              type="button"
              className="w-full"
              variant="outline"
              onClick={() => openGoogleCalendarLink(success.calendarLink)}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              加入 Google 日曆
            </Button>
            <Button className="w-full" onClick={() => {
              setSuccess(null);
              setSelectedService(null);
              setSelectedAddons([]);
              setSelectedAroma("");
              setDate(undefined);
              setSelectedSlot(null);
              setName("");
              setPhone("");
              setEmail("");
              setPartySize("1");
              setSymptomTags([]);
              setNotes("");
            }}>
              再次預約
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/">返回首頁</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-4">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              回首頁
            </Link>
          </Button>
        </div>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">{currentStore?.name ?? shopInfo.store_name ?? "線上預約"}</h1>
          <p className="text-muted-foreground mt-1">{shopInfo.frontend_subtitle || "線上預約系統"}</p>
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

          {/* Party size - show immediately after selecting service */}
          <div className="space-y-2 animate-fade-in">
            <Label className="text-sm font-semibold">預約人數 *</Label>
            <RadioGroup value={partySize} onValueChange={(v) => setPartySize(v as "1" | "2")} className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2 rounded-md border p-2">
                <RadioGroupItem value="1" id="party-one" />
                <label htmlFor="party-one" className="text-sm cursor-pointer">1 位（主師傅）</label>
              </div>
              <div className="flex items-center space-x-2 rounded-md border p-2">
                <RadioGroupItem value="2" id="party-two" />
                <label htmlFor="party-two" className="text-sm cursor-pointer">2 位（雙人）</label>
              </div>
            </RadioGroup>
            {partySize === "2" ? (
              <p className="text-xs text-amber-600">雙人預約需主師傅與搭班師傅同時可接，時段會較少。</p>
            ) : null}
            {partySize === "2" ? (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">指定搭班師傅（選填）</Label>
                <Select
                  value={preferredBackupCoachId}
                  onValueChange={(v) => {
                    setPreferredBackupCoachId(v);
                    const found = backupCoachOptions.find((coach) => coach.id === v);
                    setPreferredBackupCoachName(found?.name || "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="不指定，系統自動安排" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不指定，系統自動安排</SelectItem>
                    {preferredBackupCoachId !== "none" &&
                    !backupCoachOptions.some((coach) => coach.id === preferredBackupCoachId) ? (
                      <SelectItem value={preferredBackupCoachId}>
                        {preferredBackupCoachName || "指定師傅"}（目前不可選）
                      </SelectItem>
                    ) : null}
                    {backupCoachOptions.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.name}
                        {!coach.available_today
                          ? "（今日未值班）"
                          : coach.shift_start_hour != null && coach.shift_end_hour != null
                            ? `（${formatCoachHour(coach.shift_start_hour)}-${formatCoachHour(coach.shift_end_hour)}）`
                            : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  主師傅以 Landing/CMS「調理師區標題」為準，並比對服務管理師傅姓名（目前：「
                  {resolvedMainCoach?.name ||
                    landingContent.therapist_section_title?.trim() ||
                    shopInfo.therapist_name ||
                    "—"}
                  」）；此處僅選搭班師傅。
                </p>
                {preferredBackupCoachId === "none" ? (
                  <p className="text-[11px] text-muted-foreground">
                    不指定時，搭班由系統自動安排：會從今日已開班名單中，優先選當日預約較少者。可能人選包含：{autoAssignBackupPoolLabel}
                    。選好日期與時段後，下方會顯示該時段預估搭班師傅（仍以送出成功頁為準）。
                  </p>
                ) : (
                  <p className="text-[11px] text-amber-600">
                    已指定搭班師傅：{preferredBackupCoachName || "該師傅"}。若顯示無法預約，通常是「今日未值班」、班表時段不含該格，或該時段已有預約。
                  </p>
                )}
              </div>
            ) : null}
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
            <div className="space-y-2 animate-fade-in">
              <div className="flex gap-3">
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
              {bookingSettings.free_addon_duration > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  ✨ 含免費 {bookingSettings.free_addon_duration} 分鐘泡腳肩頸（已計入總時長）
                </p>
              )}
            </div>
          )}

          {/* Symptom Tags & Notes — shown after service selected */}
          {selectedService && (
            <div className="space-y-4 animate-fade-in">
              {/* 痛點部位勾選 */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">請問您今天哪裡最不舒服？(可複選)</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {["肩頸僵硬", "下背痠痛", "腿部腫脹", "睡眠品質差", "全身緊繃"].map((tag) => (
                    <label
                      key={tag}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-all duration-200 select-none",
                        "hover:border-amber-400/60 hover:bg-amber-500/5",
                        symptomTags.includes(tag)
                          ? "border-amber-500 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                          : "border-border bg-card"
                      )}
                    >
                      <Checkbox
                        id={`symptom-${tag}`}
                        checked={symptomTags.includes(tag)}
                        onCheckedChange={(checked) => {
                          setSymptomTags((prev) =>
                            checked ? [...prev, tag] : prev.filter((t) => t !== tag)
                          );
                        }}
                        className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                      />
                      <span className="text-sm">{tag}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 師傅備註 */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">給師傅的備註（選填）</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="有沒有什麼需要師傅特別注意的？（例如：最近剛落枕、怕痛需要輕柔一點...）"
                  maxLength={500}
                  rows={3}
                  className="resize-none transition-all duration-200 focus:border-amber-500 focus:ring-amber-500/20 focus:shadow-[0_0_12px_rgba(245,158,11,0.1)]"
                />
                {notes.length > 0 && (
                  <p className="text-xs text-muted-foreground text-right">{notes.length}/500</p>
                )}
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
                <div className="space-y-2">
                  <p className="text-sm text-destructive">
                    {partySize === "2" ? "目前此日期沒有雙人可預約時段，建議改為 1 位或更換日期" : "該日無可用時段"}
                  </p>
                  {partySize === "2" && preferredBackupCoachId !== "none" && genericPairSlotCount > 0 ? (
                    <button
                      type="button"
                      className="text-xs text-primary underline underline-offset-2"
                      onClick={() => {
                        setPreferredBackupCoachId("none");
                        setPreferredBackupCoachName("");
                      }}
                    >
                      指定師傅該日無可接時段，改為「不指定系統安排」可預約 {genericPairSlotCount} 個時段
                    </button>
                  ) : null}
                </div>
              ) : (
                <div>
                  {partySize === "2" && (
                    <div className="mb-2 rounded-md border border-amber-300/40 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      雙人模式：需「主師傅 {resolvedMainCoach?.name ?? "—"}」與至少一位搭班師傅同時可接。
                      {preferredBackupCoachId === "none" && selectedSlot !== null && predictedPairBackupName ? (
                        <span className="mt-1 block font-medium text-amber-900">
                          此時段預估搭班：{predictedPairBackupName}（預覽，以送出成功為準）
                        </span>
                      ) : null}
                    </div>
                  )}
                  {availableSlots.some(s => s >= 24) && (
                    <p className="text-xs text-amber-600 mb-2">⚠️ 00:00～02:00 時段為當天深夜（隔日凌晨），非次日白天</p>
                  )}
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map(slot => (
                      <Button
                        key={slot}
                        variant={selectedSlot === slot ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedSlot(slot)}
                        className={`text-xs ${slot >= 24 ? "border-amber-400 text-amber-700" : ""}`}
                      >
                        {formatHourToTime(slot)}{slot >= 24 ? " 🌙" : ""}
                        {partySize === "2" ? " 👥" : ""}
                      </Button>
                    ))}
                  </div>
                  {partySize === "2" && unavailablePairSlots.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-muted-foreground">雙人不可約摘要：</p>
                      <div className="flex flex-wrap gap-2">
                        <div className="rounded border border-border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                          搭班師傅未開班：{unavailablePairSummary.backupOff} 個時段
                        </div>
                        <div className="rounded border border-border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                          主師傅滿檔或公休：{unavailablePairSummary.mainBusy} 個時段
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-[11px] text-primary underline underline-offset-2"
                        onClick={() => setShowUnavailableDetails((v) => !v)}
                      >
                        {showUnavailableDetails ? "收起時段明細" : "展開時段明細"}
                      </button>
                      {showUnavailableDetails ? (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {unavailablePairSlots.slice(0, 10).map(({ slot, reason }) => (
                            <div key={`unavailable-${slot}`} className="rounded border border-border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                              <span className="font-medium">{formatHourToTime(slot)}</span>
                              <span className="ml-1">· {reason}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Name, Phone, Email */}
          {selectedSlot !== null && (
            <div className="space-y-3 animate-fade-in">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">姓名 *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="請輸入姓名" maxLength={50} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">電話 *</Label>
                <Input
                  value={phone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="0912345678"
                  maxLength={10}
                  type="tel"
                  className={phoneError ? "border-destructive" : ""}
                />
                {phoneError && (
                  <p className="text-xs text-destructive">{phoneError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Email（選填，用於寄送預約確認信）</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" maxLength={100} type="email" />
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

        <div className="text-center mt-6 space-y-2">
          <button
            onClick={() => navigate(isLineCalendarEntry ? "/mylinebookings" : "/my-bookings")}
            className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
          >
            查詢 / 取消我的預約
          </button>
          <p className="text-xs text-muted-foreground">營業時間：{shopInfo.business_hours || "尚未設定營業時間"}</p>
          <p className="text-xs text-muted-foreground">{shopInfo.store_address}</p>
        </div>
      </div>
    </div>
  );
}
