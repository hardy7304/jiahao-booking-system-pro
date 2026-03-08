
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, RefreshCw, AlertTriangle } from "lucide-react";

interface Customer {
  id: string;
  phone: string;
  name: string;
  visit_count: number;
  no_show_count: number;
  last_visit_date: string | null;
  created_at: string;
}

export default function CustomerTracking() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) setCustomers(data as Customer[]);
    setLoading(false);
  }, []);

  // Seed existing bookings into customers table
  const seedFromBookings = async () => {
    setLoading(true);
    // Get all unique phones from bookings
    const { data: bookings } = await supabase
      .from("bookings")
      .select("phone, name, date, status, cancel_reason");
    
    if (bookings && bookings.length > 0) {
      const phoneMap = new Map<string, {
        name: string;
        visit_count: number;
        no_show_count: number;
        last_visit_date: string | null;
      }>();

      for (const b of bookings) {
        const existing = phoneMap.get(b.phone) || {
          name: b.name,
          visit_count: 0,
          no_show_count: 0,
          last_visit_date: null,
        };
        if (b.status === "completed") {
          existing.visit_count++;
          if (!existing.last_visit_date || b.date > existing.last_visit_date) {
            existing.last_visit_date = b.date;
          }
        }
        if (b.status === "cancelled" && b.cancel_reason?.includes("爽約")) {
          existing.no_show_count++;
        }
        existing.name = b.name; // use latest name
        phoneMap.set(b.phone, existing);
      }

      for (const [phone, stats] of phoneMap) {
        await supabase.from("customers").upsert({
          phone,
          name: stats.name,
          visit_count: stats.visit_count,
          no_show_count: stats.no_show_count,
          last_visit_date: stats.last_visit_date,
        } as any, { onConflict: "phone" });
      }
    }
    
    await fetchCustomers();
  };

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filtered = search
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.phone.includes(search)
      )
    : customers;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">客戶追蹤</h2>
          <Badge variant="secondary">{customers.length} 位客戶</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={seedFromBookings}>
            <RefreshCw className="w-4 h-4 mr-1" /> 從預約同步
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="搜尋姓名或電話..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {search ? "找不到符合的客戶" : "尚無客戶資料，點擊「從預約同步」匯入"}
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left p-3">姓名</th>
                <th className="text-left p-3">電話</th>
                <th className="text-center p-3">來訪次數</th>
                <th className="text-center p-3">爽約次數</th>
                <th className="text-left p-3">最後造訪</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border hover:bg-secondary/50"
                >
                  <td className="p-3 font-medium text-foreground">{c.name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.phone}</td>
                  <td className="p-3 text-center">
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                      {c.visit_count}
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    {c.no_show_count > 0 ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {c.no_show_count}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {c.last_visit_date || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
