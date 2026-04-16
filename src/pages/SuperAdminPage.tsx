import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminApi } from "@/lib/adminApi";
import { FALLBACK_STORE_ID } from "@/contexts/StoreContext";
import { suggestStoreSlug } from "@/lib/suggestStoreSlug";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ExternalLink, Loader2, LogOut, Shield } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

const SUPER_ADMIN_SESSION_KEY = "super_admin_auth";

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean | null;
  created_at: string | null;
};

function openStoreLanding(slug: string) {
  const path = `/s/${encodeURIComponent(slug)}`;
  window.open(`${window.location.origin}${path}`, "_blank", "noopener,noreferrer");
}

export default function SuperAdminPage() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const [configLoading, setConfigLoading] = useState(true);
  const [superAdminConfigured, setSuperAdminConfigured] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  const [stores, setStores] = useState<StoreRow[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);

  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadSuperAdminConfigFlag = useCallback(async () => {
    setConfigLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "super_admin_password")
        .limit(1);
      if (error) throw error;
      const raw = data?.[0]?.value;
      const v = typeof raw === "string" ? raw.trim() : "";
      setSuperAdminConfigured(v.length > 0);
    } catch {
      setSuperAdminConfigured(false);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const loadStores = useCallback(async () => {
    setStoresLoading(true);
    try {
      const res = await adminApi("store.list", {}, FALLBACK_STORE_ID);
      const list = res.stores;
      if (!Array.isArray(list)) {
        setStores([]);
        return;
      }
      setStores(list as StoreRow[]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "無法載入店家列表");
      setStores([]);
    } finally {
      setStoresLoading(false);
    }
  }, []);

  useEffect(() => {
    setAuthenticated(sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY) === "true");
    setSessionChecked(true);
  }, []);

  useEffect(() => {
    void loadSuperAdminConfigFlag();
  }, [loadSuperAdminConfigFlag]);

  useEffect(() => {
    if (!sessionChecked || !authenticated) return;
    void loadStores();
  }, [sessionChecked, authenticated, loadStores]);

  const handleLogin = () => {
    const pwd = passwordInput.trim();
    if (!pwd) {
      toast.error("請輸入密碼");
      return;
    }
    void (async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "super_admin_password")
        .limit(1);
      if (error) {
        toast.error(error.message);
        return;
      }
      const raw = data?.[0]?.value;
      const expected = typeof raw === "string" ? raw.trim() : "";
      if (!expected) {
        toast.error("尚未設定平台管理密碼，請至 Supabase system_config 設定 super_admin_password");
        return;
      }
      if (pwd !== expected) {
        toast.error("密碼錯誤");
        return;
      }
      sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, "true");
      sessionStorage.setItem("admin_password", pwd);
      setAuthenticated(true);
      setPasswordInput("");
      toast.success("已登入平台管理");
    })();
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
    sessionStorage.removeItem("admin_password");
    setAuthenticated(false);
    toast.message("已登出");
  };

  const handleCreateStore = async () => {
    const name = newName.trim();
    const slug = newSlug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name || !slug) {
      toast.error("請填寫店名與 slug");
      return;
    }
    setCreating(true);
    try {
      const res = await adminApi(
        "store.create",
        { name, slug, is_active: newActive },
        FALLBACK_STORE_ID,
      );
      if (typeof res.landing_warning === "string") {
        toast.warning(`店家已建立，但 Landing 預設稿未寫入：${res.landing_warning}`);
      } else {
        toast.success("店家已建立，Landing 頁面已自動初始化");
      }
      const origin = window.location.origin;
      toast.message(`新店網址：${origin}/s/${encodeURIComponent(slug)}`, { duration: 8000 });
      setNewName("");
      setNewSlug("");
      setNewActive(true);
      await loadStores();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "建立失敗");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (!newName.trim()) return;
    setNewSlug((prev) => {
      if (prev.trim() === "") return suggestStoreSlug(newName);
      return prev;
    });
  }, [newName]);

  if (!sessionChecked || configLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" aria-hidden />
            </div>
            <CardTitle>平台管理</CardTitle>
            <CardDescription>
              密碼儲存於 <code className="text-xs">system_config.super_admin_password</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!superAdminConfigured ? (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                尚未設定平台管理密碼。請在 Supabase 新增或更新{" "}
                <code className="rounded bg-muted px-1">key = super_admin_password</code>{" "}
                的設定值後再登入。
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="super-admin-pw">平台管理密碼</Label>
              <Input
                id="super-admin-pw"
                type="password"
                autoComplete="current-password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="請輸入密碼"
              />
            </div>
            <Button className="w-full" onClick={handleLogin} disabled={!superAdminConfigured}>
              登入
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">平台管理</h1>
            <p className="text-sm text-muted-foreground">新增店家、檢視各店 Landing 網址</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2 shrink-0">
            <LogOut className="h-4 w-4" />
            登出
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>新增店家</CardTitle>
              <CardDescription>
                建立後會自動初始化 Landing；網址格式為{" "}
                <code className="text-xs">/s/&#123;slug&#125;</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">店名（必填）</Label>
                <Input
                  id="new-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例：好棒棒按摩店"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-slug">網址代碼 slug（必填）</Label>
                <Input
                  id="new-slug"
                  value={newSlug}
                  onChange={(e) =>
                    setNewSlug(e.target.value.trim().toLowerCase().replace(/\s+/g, "-"))
                  }
                  placeholder="例：haobang"
                />
                <p className="text-xs text-muted-foreground">
                  可自訂；留空時會依店名產生英數 slug（純中文店名會產生 store- 開頭代碼）。
                </p>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="new-active" className="cursor-pointer">
                  啟用中
                </Label>
                <Switch id="new-active" checked={newActive} onCheckedChange={setNewActive} />
              </div>
              <Button
                className="w-full"
                disabled={creating || !newName.trim() || !newSlug.trim()}
                onClick={() => void handleCreateStore()}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    建立中…
                  </>
                ) : (
                  "建立店家"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:row-span-1">
            <CardHeader>
              <CardTitle>店家列表</CardTitle>
              <CardDescription>
                點連結可在新分頁開啟該店 Landing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {storesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>店名</TableHead>
                        <TableHead>slug</TableHead>
                        <TableHead>狀態</TableHead>
                        <TableHead>建立時間</TableHead>
                        <TableHead className="text-right">網址</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stores.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            尚無店家
                          </TableCell>
                        </TableRow>
                      ) : (
                        stores.map((s) => {
                          const slugDisp = (s.slug ?? "").trim() || s.id;
                          return (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">{s.name}</TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-1 rounded">{slugDisp}</code>
                              </TableCell>
                              <TableCell>{s.is_active === false ? "停用" : "啟用"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                {s.created_at
                                  ? format(new Date(s.created_at), "yyyy-MM-dd HH:mm", {
                                      locale: zhTW,
                                    })
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => openStoreLanding(slugDisp)}
                                >
                                  開啟
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
