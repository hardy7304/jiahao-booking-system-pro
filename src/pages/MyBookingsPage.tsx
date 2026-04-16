import { useState } from "react";
import { supabase, supabaseAnonKey, supabaseUrl } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, Phone, Calendar, Clock, X, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/contexts/StoreContext";

interface Booking {
  id: string;
  date: string;
  start_time_str: string;
  name: string;
  phone: string;
  service: string;
  addons: string[] | null;
  duration: number;
  total_price: number;
  status: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
}

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const { storeId, buildStorePath } = useStore();
  const [phone, setPhone] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");

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

  const handleSearch = async () => {
    const cleaned = phone.replace(/[\s\-()]/g, "").trim();
    const error = validatePhone(cleaned);
    if (error) {
      setPhoneError(error);
      toast.error(error);
      return;
    }
    setPhoneError("");
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, date, start_time_str, name, phone, service, addons, duration, total_price, status, cancelled_at, cancel_reason")
        .eq("phone", cleaned)
        .eq("store_id", storeId)
        .order("date", { ascending: false })
        .order("start_hour", { ascending: false });
      if (error) throw error;
      setBookings(data || []);
      setSearched(true);
    } catch {
      toast.error("查詢失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const openCancelDialog = (booking: Booking) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(booking.date + "T00:00:00");

    if (bookingDate < today) {
      toast.error("無法取消過去的預約");
      return;
    }

    setCancelTarget(booking);
    setCancelReason("");
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;

    setCancelDialogOpen(false);
    setCancellingId(cancelTarget.id);
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/api-booking?id=${cancelTarget.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          cancel_reason: cancelReason.trim() || undefined,
          store_id: storeId,
        }),
      });
      if (!resp.ok) throw new Error("取消失敗");

      setBookings((prev) =>
        prev.map((b) =>
          b.id === cancelTarget.id
            ? { ...b, cancelled_at: new Date().toISOString(), status: "cancelled", cancel_reason: cancelReason.trim() || null }
            : b
        )
      );
      toast.success("預約已取消");
    } catch {
      toast.error("取消失敗，請稍後再試");
    } finally {
      setCancellingId(null);
      setCancelTarget(null);
    }
  };

  const isUpcoming = (booking: Booking) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(booking.date + "T00:00:00") >= today;
  };

  const activeBookings = bookings.filter((b) => !b.cancelled_at && isUpcoming(b));
  const pastBookings = bookings.filter((b) => !b.cancelled_at && !isUpcoming(b));
  const cancelledBookings = bookings.filter((b) => b.cancelled_at);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(buildStorePath("booking"))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">我的預約</h1>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Label htmlFor="phone" className="text-sm font-medium mb-2 block">
              輸入預約電話號碼查詢
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="0912345678"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className={`pl-9 ${phoneError ? "border-destructive" : ""}`}
                  maxLength={10}
                  type="tel"
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4 mr-1" />
                查詢
              </Button>
            </div>
            {phoneError && (
              <p className="text-xs text-destructive mt-1.5">{phoneError}</p>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {searched && bookings.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            找不到此電話號碼的預約紀錄
          </p>
        )}

        {activeBookings.length > 0 && (
          <Section title="即將到來" count={activeBookings.length}>
            {activeBookings.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                onCancel={openCancelDialog}
                cancelling={cancellingId === b.id}
                showCancel
              />
            ))}
          </Section>
        )}

        {pastBookings.length > 0 && (
          <Section title="過去紀錄" count={pastBookings.length}>
            {pastBookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </Section>
        )}

        {cancelledBookings.length > 0 && (
          <Section title="已取消" count={cancelledBookings.length}>
            {cancelledBookings.map((b) => (
              <BookingCard key={b.id} booking={b} cancelled />
            ))}
          </Section>
        )}

        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>取消預約</DialogTitle>
              <DialogDescription>
                {cancelTarget && `${cancelTarget.date} ${cancelTarget.start_time_str} - ${cancelTarget.service}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="cancel-reason" className="text-sm font-medium">
                取消原因（選填）
              </Label>
              <Textarea
                id="cancel-reason"
                placeholder="例如：臨時有事、時間衝突..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                maxLength={200}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">{cancelReason.length}/200</p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                返回
              </Button>
              <Button variant="destructive" onClick={handleConfirmCancel}>
                確認取消
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        {title} <Badge variant="secondary">{count}</Badge>
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function BookingCard({
  booking,
  onCancel,
  cancelling,
  showCancel,
  cancelled,
}: {
  booking: Booking;
  onCancel?: (b: Booking) => void;
  cancelling?: boolean;
  showCancel?: boolean;
  cancelled?: boolean;
}) {
  const dateStr = (() => {
    try {
      return format(new Date(booking.date + "T00:00:00"), "M/d (EEEE)", { locale: zhTW });
    } catch {
      return booking.date;
    }
  })();

  return (
    <Card className={cancelled ? "opacity-50" : ""}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {dateStr}
              <Clock className="h-3.5 w-3.5 text-muted-foreground ml-1" />
              {booking.start_time_str}
            </div>
            <p className="text-sm font-semibold">{booking.service}</p>
            {booking.addons && booking.addons.length > 0 && (
              <p className="text-xs text-muted-foreground">
                加購：{booking.addons.join("、")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {booking.duration} 分鐘 ・ ${booking.total_price}
            </p>
            {cancelled && (
              <>
                <Badge variant="destructive" className="text-[10px]">已取消</Badge>
                {booking.cancel_reason && (
                  <p className="text-xs text-muted-foreground">原因：{booking.cancel_reason}</p>
                )}
              </>
            )}
          </div>
          {showCancel && onCancel && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => onCancel(booking)}
              disabled={cancelling}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              {cancelling ? "取消中..." : "取消預約"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
