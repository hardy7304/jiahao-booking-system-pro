import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useStoreSettings, type LandingContent, type LandingServiceItem } from "@/hooks/useStoreSettings";
import { adminApi } from "@/lib/adminApi";
import type { ClosingGalleryMode } from "@/lib/landingContent";
import { AdminLandingImageField } from "@/components/admin/AdminLandingImageField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Copy, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function emptyService(): LandingServiceItem {
  return {
    name: "新服務",
    description: "請輸入服務說明",
    tiers: [{ label: "60 分鐘", price: "NT$800" }],
  };
}

/** 僅允許數字、可暫時清空，blur 時正規化（去掉前導 0），避免 type=number 無法刪除 0 的問題 */
function StatNumberField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (n: number) => void;
}) {
  const [text, setText] = useState(() => String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        inputMode="numeric"
        autoComplete="off"
        value={text}
        onFocus={() => {
          setFocused(true);
          setText(String(value));
        }}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, "");
          setText(next);
        }}
        onBlur={() => {
          setFocused(false);
          const trimmed = text.trim();
          if (trimmed === "") {
            onCommit(0);
            setText("0");
            return;
          }
          const n = Number.parseInt(trimmed, 10);
          if (!Number.isFinite(n)) {
            setText(String(value));
            return;
          }
          onCommit(n);
          setText(String(n));
        }}
      />
    </div>
  );
}

export default function LandingPageSettings() {
  const { storeId } = useStore();
  const { content, loading, saveSettings, refetch, hasStoreSettingsRow } = useStoreSettings();
  const [draft, setDraft] = useState<LandingContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  /** 服務卡片「價格／時間列」摺疊：預設收合 */
  const [openTiersByService, setOpenTiersByService] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (loading) return;
    setDraft({ ...content });
  }, [loading, content]);

  const updateDraft = useCallback((patch: Partial<LandingContent>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const handleApplyDefaultTemplate = async () => {
    if (!storeId) {
      toast.error("尚未選擇店家。");
      return;
    }
    setApplyingTemplate(true);
    try {
      const res = await adminApi("initialize_store_settings", {}, storeId);
      const already =
        typeof res.already_initialized === "boolean" ? res.already_initialized : false;
      if (already) {
        toast.info("此店家已有 Landing 設定，未覆寫內容。");
      } else {
        toast.success("已套用預設 Landing 模板");
      }
      await refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "套用失敗";
      toast.error(msg);
    } finally {
      setApplyingTemplate(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const services = draft.services
        .map((s) => ({
          ...s,
          name: s.name.trim(),
          description: s.description.trim(),
          image_url: s.image_url?.trim() ? s.image_url.trim() : undefined,
          tiers: s.tiers.filter((t) => t.label.trim() && t.price.trim()),
        }))
        .filter((s) => s.name && s.description);

      if (services.length === 0) {
        toast.error("請至少保留一個服務項目（名稱與說明皆須填寫）。");
        return;
      }

      const toSave: Partial<LandingContent> = {
        ...draft,
        services,
        therapist_highlights: draft.therapist_highlights
          .map((l) => l.trim())
          .filter(Boolean),
      };

      await saveSettings(toSave);
      await refetch();
      toast.success("首頁內容已儲存，重新整理前台即可看到更新");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "儲存失敗";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !draft) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        載入首頁設定…
      </div>
    );
  }

  const setService = (index: number, next: LandingServiceItem) => {
    const services = [...draft.services];
    services[index] = next;
    updateDraft({ services });
  };

  const removeService = (index: number) => {
    updateDraft({ services: draft.services.filter((_, i) => i !== index) });
    setOpenTiersByService((prev) => {
      const next: Record<number, boolean> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const i = Number(k);
        if (Number.isNaN(i)) return;
        if (i < index) next[i] = v;
        else if (i > index) next[i - 1] = v;
      });
      return next;
    });
  };

  const addService = () => {
    updateDraft({ services: [...draft.services, emptyService()] });
  };

  const copyServiceAt = (index: number) => {
    const svc = draft.services[index];
    if (!svc) return;
    const nameBase = svc.name.trim();
    const cloned: LandingServiceItem = {
      ...svc,
      name: nameBase.includes("（複本）") ? `${nameBase} 2` : `${nameBase || "服務"}（複本）`,
      featured: false,
      tiers: svc.tiers.map((t) => ({ ...t })),
    };
    const services = [...draft.services.slice(0, index + 1), cloned, ...draft.services.slice(index + 1)];
    updateDraft({ services });
    setOpenTiersByService((prev) => {
      const next: Record<number, boolean> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const i = Number(k);
        if (Number.isNaN(i)) return;
        if (i <= index) next[i] = v;
        else next[i + 1] = v;
      });
      next[index + 1] = true;
      return next;
    });
    toast.success("已複製服務，可直接修改名稱與價格");
  };

  const setTier = (si: number, ti: number, field: "label" | "price", value: string) => {
    const svc = draft.services[si];
    if (!svc) return;
    const tiers = svc.tiers.map((t, i) => (i === ti ? { ...t, [field]: value } : t));
    setService(si, { ...svc, tiers });
  };

  const addTier = (si: number) => {
    const svc = draft.services[si];
    if (!svc) return;
    setService(si, { ...svc, tiers: [...svc.tiers, { label: "", price: "" }] });
    setOpenTiersByService((o) => ({ ...o, [si]: true }));
  };

  const removeTier = (si: number, ti: number) => {
    const svc = draft.services[si];
    if (!svc) return;
    setService(si, { ...svc, tiers: svc.tiers.filter((_, i) => i !== ti) });
  };

  const highlightsText = draft.therapist_highlights.join("\n");

  return (
    <div className="space-y-6">
      {!loading && !hasStoreSettingsRow && (
        <Card className="border-amber-500/35 bg-amber-500/[0.06]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">尚未建立 Landing 內容</CardTitle>
            <CardDescription>
              此店家尚未設定 Landing 內容，是否套用預設模板？
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-2 text-sm text-muted-foreground">
            預設模板會依店名填入標題與範例服務／師傅區文案，不會影響其他店家。
          </CardContent>
          <CardFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={applyingTemplate || !storeId}
              onClick={() => void handleApplyDefaultTemplate()}
            >
              {applyingTemplate ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  套用中…
                </>
              ) : (
                "套用預設模板"
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">首頁 CMS（Landing）</h2>
          <p className="text-xs text-muted-foreground mt-1">
            儲存後，訪客重新整理首頁即可看到更新。
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              儲存中…
            </>
          ) : (
            "儲存首頁設定"
          )}
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={["hero", "hours", "studios", "services"]} className="space-y-2">
        <AccordionItem value="hero" className="border rounded-lg px-4 bg-card">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            主視覺標題
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label>大標題</Label>
              <Input
                value={draft.hero_title}
                onChange={(e) => updateDraft({ hero_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>副標／說明</Label>
              <Textarea
                rows={3}
                value={draft.hero_subtitle}
                onChange={(e) => updateDraft({ hero_subtitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>主按鈕文案</Label>
              <Input
                value={draft.hero_cta_label}
                onChange={(e) => updateDraft({ hero_cta_label: e.target.value })}
                placeholder="開啟舒壓儀式"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>時段徽章（如 14–02）</Label>
                <Input
                  value={draft.hero_hours_badge_short}
                  onChange={(e) => updateDraft({ hero_hours_badge_short: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>深夜標籤文案</Label>
                <Input
                  value={draft.hero_late_night_note}
                  onChange={(e) => updateDraft({ hero_late_night_note: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>起價標籤</Label>
                <Input
                  value={draft.hero_starting_price_label}
                  onChange={(e) => updateDraft({ hero_starting_price_label: e.target.value })}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="hours" className="border rounded-lg px-4 bg-card">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            營業時間
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label>營業時間顯示字串</Label>
              <Input
                placeholder="例：14:00 — 02:00"
                value={draft.business_hours_display}
                onChange={(e) => updateDraft({ business_hours_display: e.target.value })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="services" className="border rounded-lg px-4 bg-card">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            服務項目卡片（價格／時間）
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pb-4">
            <p className="text-xs text-muted-foreground">
              每個服務可有多個「時長／方案」列（標籤 + 價格）。空白列會在儲存時自動略過。
            </p>
            {draft.services.map((svc, si) => (
              <div key={si} className="rounded-lg border p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">服務 #{si + 1}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyServiceAt(si)}
                      className="h-8 gap-1 text-xs"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      複製此服務
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeService(si)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">名稱</Label>
                    <Input
                      value={svc.name}
                      onChange={(e) => setService(si, { ...svc, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">小標（選填）</Label>
                    <Input
                      value={svc.tagline ?? ""}
                      onChange={(e) =>
                        setService(si, { ...svc, tagline: e.target.value || undefined })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">描述</Label>
                  <Textarea
                    rows={2}
                    value={svc.description}
                    onChange={(e) => setService(si, { ...svc, description: e.target.value })}
                  />
                </div>
                <AdminLandingImageField
                  storeId={typeof storeId === "string" ? storeId : ""}
                  label="服務卡片主圖（Landing v2，選填）"
                  hint="留白則使用預設示意圖。可貼公開圖片網址，或使用「上傳」（需已執行 Supabase migration 建立 landing-images 貯體並部署 api-admin）。"
                  value={svc.image_url ?? ""}
                  onChange={(url) =>
                    setService(si, { ...svc, image_url: url.trim() ? url.trim() : undefined })
                  }
                />
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!svc.featured}
                      onChange={(e) => setService(si, { ...svc, featured: e.target.checked })}
                    />
                    標示為招牌
                  </label>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">起價說明（選填，無階層時顯示）</Label>
                  <Input
                    value={svc.starting_price_label ?? ""}
                    onChange={(e) =>
                      setService(si, {
                        ...svc,
                        starting_price_label: e.target.value || undefined,
                      })
                    }
                  />
                </div>
                <Collapsible
                  open={openTiersByService[si] ?? false}
                  onOpenChange={(open) =>
                    setOpenTiersByService((prev) => ({ ...prev, [si]: open }))
                  }
                  className="space-y-2"
                >
                  <div className="flex flex-wrap items-stretch gap-2">
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-9 flex-1 justify-between gap-2 text-left text-xs font-normal [&[data-state=open]_svg]:rotate-180"
                      >
                        <span>
                          <span className="font-medium text-foreground">價格／時間列</span>
                          <span className="ml-2 text-muted-foreground">
                            （共 {svc.tiers.length} 列，點擊展開）
                          </span>
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-70 transition-transform duration-200" />
                      </Button>
                    </CollapsibleTrigger>
                    <Button type="button" variant="secondary" size="sm" onClick={() => addTier(si)}>
                      <Plus className="h-3 w-3 mr-1" />
                      新增列
                    </Button>
                  </div>
                  <CollapsibleContent className="space-y-2 pt-1">
                    {svc.tiers.map((t, ti) => (
                      <div key={ti} className="flex flex-wrap gap-2 items-end">
                        <div className="flex-1 min-w-[120px] space-y-1">
                          <Label className="text-[10px] text-muted-foreground">標籤（如 60 分鐘）</Label>
                          <Input
                            value={t.label}
                            onChange={(e) => setTier(si, ti, "label", e.target.value)}
                          />
                        </div>
                        <div className="flex-1 min-w-[120px] space-y-1">
                          <Label className="text-[10px] text-muted-foreground">價格</Label>
                          <Input
                            value={t.price}
                            onChange={(e) => setTier(si, ti, "price", e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => removeTier(si, ti)}
                          disabled={svc.tiers.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={addService}>
              <Plus className="h-4 w-4 mr-2" />
              新增服務卡片
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="stats" className="border rounded-lg px-4 bg-card">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            數據區（Brand Stats）
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>區塊標題</Label>
                <Input
                  value={draft.brand_stats_title}
                  onChange={(e) => updateDraft({ brand_stats_title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>區塊副標</Label>
                <Input
                  value={draft.brand_stats_subtitle}
                  onChange={(e) => updateDraft({ brand_stats_subtitle: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatNumberField
                label="解除痠痛（人次）"
                value={draft.relief_count}
                onCommit={(n) => updateDraft({ relief_count: n })}
              />
              <StatNumberField
                label="好評（％）"
                value={draft.review_percent}
                onCommit={(n) => updateDraft({ review_percent: Math.min(100, Math.max(0, n)) })}
              />
            </div>
            <div className="space-y-2">
              <Label>調理手法（自訂文案）</Label>
              <Textarea
                rows={3}
                placeholder="例：腳底按摩、全身指壓、筋膜刀、傳統整復等，依客人狀態靈活運用"
                value={draft.techniques_display}
                onChange={(e) => updateDraft({ techniques_display: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                顯示於品牌實績第三張卡片，可換行。未填寫自訂文案時，會以「{draft.techniques_count}{" "}
                種」作為備用顯示。
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="therapist" className="border rounded-lg px-4 bg-card">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            師傅介紹
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label>師傅區標題</Label>
              <Input
                value={draft.therapist_section_title}
                onChange={(e) => updateDraft({ therapist_section_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>師傅區內文</Label>
              <Textarea
                rows={3}
                value={draft.therapist_section_body}
                onChange={(e) => updateDraft({ therapist_section_body: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>標籤列（用 · 或逗號分隔）</Label>
              <Input
                value={draft.therapist_tags_line}
                onChange={(e) => updateDraft({ therapist_tags_line: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>重點列表（每行一點）</Label>
              <Textarea
                rows={4}
                value={highlightsText}
                onChange={(e) =>
                  updateDraft({
                    therapist_highlights: e.target.value.split("\n"),
                  })
                }
              />
            </div>
            <AdminLandingImageField
              storeId={typeof storeId === "string" ? storeId : ""}
              label="調理師頭像（Landing v2，選填）"
              hint="顯示於 /landing-v2「匠心大師」區塊。留白則使用預設示意圖。"
              value={draft.therapist_portrait_url ?? ""}
              onChange={(url) =>
                updateDraft({ therapist_portrait_url: url.trim() ? url.trim() : "" })
              }
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="footer" className="border rounded-lg px-4 bg-card">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            頁尾 CTA
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label>標題</Label>
              <Input
                value={draft.footer_cta_title}
                onChange={(e) => updateDraft({ footer_cta_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>內文</Label>
              <Textarea
                rows={2}
                value={draft.footer_cta_body}
                onChange={(e) => updateDraft({ footer_cta_body: e.target.value })}
              />
            </div>
            <div className="rounded-md border border-dashed border-amber-500/30 bg-amber-500/5 p-4 space-y-4">
              <p className="text-xs font-medium text-foreground">Landing v2 專用：尾段圖片列</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                在「頁尾 CTA」標題與按鈕<strong>上方</strong>的橫向環境圖（僅{" "}
                <code className="rounded bg-muted px-1">/landing-v2</code>）。正式首頁{" "}
                <code className="rounded bg-muted px-1">/</code> 版面不同，不受此設定影響。
              </p>
              <div className="space-y-2">
                <Label>環境圖區塊</Label>
                <Select
                  value={draft.closing_gallery_mode}
                  onValueChange={(v) =>
                    updateDraft({ closing_gallery_mode: v as ClosingGalleryMode })
                  }
                >
                  <SelectTrigger className="max-w-md">
                    <SelectValue placeholder="選擇顯示方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">使用預設示意圖（兩張）</SelectItem>
                    <SelectItem value="custom">自訂（下方 1～2 張圖片）</SelectItem>
                    <SelectItem value="hidden">不顯示（只保留標題與按鈕）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {draft.closing_gallery_mode === "custom" ? (
                <div className="space-y-4 pt-2">
                  <AdminLandingImageField
                    storeId={typeof storeId === "string" ? storeId : ""}
                    label="環境圖 1"
                    value={draft.closing_image_url_1}
                    onChange={(url) => updateDraft({ closing_image_url_1: url })}
                  />
                  <AdminLandingImageField
                    storeId={typeof storeId === "string" ? storeId : ""}
                    label="環境圖 2（選填）"
                    value={draft.closing_image_url_2}
                    onChange={(url) => updateDraft({ closing_image_url_2: url })}
                  />
                </div>
              ) : null}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
