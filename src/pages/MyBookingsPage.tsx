import { useState } from "react";
import { supabase, supabaseUrl } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Phone, Calendar, Clock, X, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
  const [phone, setPhone] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleSearch = async () => {
    const cleaned = phone.replace(/\s|-/g, "").trim();
    if (!cleaned || cleaned.length < 8) {
      toast.error("請輸入有效的電話號碼");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, date, start_time_str, name, phone, service, addons, duration, total_price, status, cancelled_at, cancel_reason")
        .eq("phone", cleaned)
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

  const handleCancel = async (booking: Booking) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(booking.date + "T00:00:00");

    if (bookingDate < today) {
      toast.error("無法取消過去的預約");
      return;
    }

    if (!confirm(`確定要取消 ${booking.date} ${booking.start_time_str} 的預約嗎？`)) return;

    setCancellingId(booking.id);
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/api-booking?id=${booking.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!resp.ok) throw new Error("取消失敗");

      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? { ...b, cancelled_at: new Date().toISOString(), status: "cancelled" }
            : b
        )
      );
      toast.success("預約已取消");
    } catch {
      toast.error("取消失敗，請稍後再試");
    } finally {
      setCancellingId(null);
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
          <Button variant="ghost" size="icon" onClick={() => navigate("/booking")}>
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
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                  maxLength={15}
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4 mr-1" />
                查詢
              </Button>
            </div>
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
                onCancel={handleCancel}
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
              <Badge variant="destructive" className="text-[10px]">已取消</Badge>
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
