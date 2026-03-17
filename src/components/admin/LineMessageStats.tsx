import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { adminApi } from "@/lib/adminApi";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { RefreshCw, MessageCircle, AlertTriangle, CheckCircle2, XCircle, TrendingUp } from "lucide-react";

interface LogEntry {
  id: string;
  customer_phone: string | null;
  line_user_id: string | null;
  message_type: string;
  sent_at: string | null;
  success: boolean | null;
  cost_counted: boolean | null;
  error_message: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  booking_confirmed: "預約確認",
  booking_cancelled: "取消通知",
  booking_reminder: "前一天提醒",
  care: "關懷訊息",
  marketing: "行銷推播",
};

export default function LineMessageStats() {
  const { storeId } = useStore();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [monthlyUsed, setMonthlyUsed] = useState(0);
  const [quota, setQuota] = useState(200);
  const [alertThreshold, setAlertThreshold] = useState(180);
  const [vipOnly, setVipOnly] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [editQuota, setEditQuota] = useState("200");
  const [editThreshold, setEditThreshold] = useState("180");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        { count },
        { data: recentLogs },
        { data: quotaRow },
        { data: thresholdRow },
        { data: vipRow },
      ] = await Promise.all([
        supabase
          .from("line_message_log")
          .select("id", { count: "exact", head: true })
          .eq("cost_counted", true)
          .eq("success", true)
          .eq("store_id", storeId)
          .gte("sent_at", monthStart),
        supabase
          .from("line_message_log")
          .select("*")
          .eq("store_id", storeId)
          .order("sent_at", { ascending: false })
          .limit(30),
        supabase.from("system_config").select("value").eq("key", "line_monthly_quota").eq("store_id", storeId).maybeSingle(),
        supabase.from("system_config").select("value").eq("key", "line_quota_alert_threshold").eq("store_id", storeId).maybeSingle(),
        supabase.from("system_config").select("value").eq("key", "line_notify_vip_only").eq("store_id", storeId).maybeSingle(),
      ]);

      const q = parseInt(quotaRow?.value || "200") || 200;
      const t = parseInt(thresholdRow?.value || "180") || 180;
      const v = vipRow?.value === "true";

      setMonthlyUsed(count ?? 0);
      setLogs((recentLogs as LogEntry[]) || []);
      setQuota(q);
      setAlertThreshold(t);
      setVipOnly(v);
      setEditQuota(String(q));
      setEditThreshold(String(t));
    } catch (e) {
      console.error("Failed to fetch LINE stats:", e);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await adminApi("config.update", {
        configs: [
          { key: "line_monthly_quota", value: editQuota },
          { key: "line_quota_alert_threshold", value: editThreshold },
          { key: "line_notify_vip_only", value: vipOnly ? "true" : "false" },
        ],
      }, storeId);
      toast.success("LINE 設定已儲存");
      setQuota(parseInt(editQuota) || 200);
      setAlertThreshold(parseInt(editThreshold) || 180);
    } catch {
      toast.error("儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  const usagePercent = quota > 0 ? Math.min((monthlyUsed / quota) * 100, 100) : 0;
  const barColor = usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-yellow-500" : "bg-green-500";

  // Breakdown by type this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonthLogs = logs.filter(l => l.sent_at && l.sent_at >= monthStart && l.cost_counted && l.success);
  const byType: Record<string, number> = {};
  thisMonthLogs.forEach(l => {
    byType[l.message_type] = (byType[l.message_type] || 0) + 1;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-600" />
          LINE 訊息統計
        </h2>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-1" /> 重新整理
        </Button>
      </div>

      {/* Usage bar */}
      <div className="bg-card rounded-xl shadow p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">本月推播用量</span>
          <span className="text-sm font-bold">
            {monthlyUsed} / {quota} 則
            {monthlyUsed >= alertThreshold && monthlyUsed < quota && (
              <Badge variant="outline" className="ml-2 text-yellow-700 border-yellow-400">
                <AlertTriangle className="w-3 h-3 mr-1" /> 接近上限
              </Badge>
            )}
            {monthlyUsed >= quota && (
              <Badge variant="destructive" className="ml-2">
                已達上限
              </Badge>
            )}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${usagePercent}%` }} />
        </div>

        {/* Breakdown */}
        {Object.keys(byType).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(byType).map(([type, count]) => (
              <Badge key={type} variant="secondary" className="text-xs">
                {TYPE_LABELS[type] || type}：{count}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="bg-card rounded-xl shadow p-4 space-y-4">
        <h3 className="text-sm font-bold">推播設定</h3>

        <div className="flex items-center gap-3">
          <Switch checked={vipOnly} onCheckedChange={setVipOnly} />
          <Label className="text-sm">
            僅 VIP / 常客接收推播通知
            <span className="text-xs text-muted-foreground ml-2">（來訪 5 次以上或有 VIP 標籤）</span>
          </Label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">每月額度上限</Label>
            <Input type="number" value={editQuota} onChange={(e) => setEditQuota(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">警告閾值（接近上限提醒）</Label>
            <Input type="number" value={editThreshold} onChange={(e) => setEditThreshold(e.target.value)} className="mt-1" />
          </div>
        </div>

        <Button size="sm" onClick={handleSaveSettings} disabled={saving}>
          {saving ? "儲存中..." : "儲存設定"}
        </Button>
      </div>

      {/* Recent logs */}
      <div className="bg-card rounded-xl shadow p-4 space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> 近期發送紀錄
        </h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚無紀錄</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-3">時間</th>
                  <th className="pb-2 pr-3">類型</th>
                  <th className="pb-2 pr-3">電話</th>
                  <th className="pb-2 pr-3">狀態</th>
                  <th className="pb-2">計費</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 20).map((log) => (
                  <tr key={log.id} className="border-b border-muted/50">
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      {log.sent_at ? new Date(log.sent_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-"}
                    </td>
                    <td className="py-1.5 pr-3">
                      <Badge variant="outline" className="text-[10px]">
                        {TYPE_LABELS[log.message_type] || log.message_type}
                      </Badge>
                    </td>
                    <td className="py-1.5 pr-3">{log.customer_phone || "-"}</td>
                    <td className="py-1.5 pr-3">
                      {log.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-3.5 h-3.5" />
                          {log.error_message && <span className="truncate max-w-[120px]" title={log.error_message}>{log.error_message}</span>}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5">
                      {log.cost_counted ? "是" : "否"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
