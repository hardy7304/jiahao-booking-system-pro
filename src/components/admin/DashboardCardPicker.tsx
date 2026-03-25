import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

export type DashboardCardDef = {
  id: string;
  label: string;
  note: string;
};

/**
 * 將「可顯示統計卡」收進 Popover，避免主畫面被大塊設定區佔滿。
 */
export function DashboardCardPicker({
  cards,
  visibleCards,
  setVisibleCards,
  loadingPrefs,
  defaultVisibleCardIds,
  triggerLabel = "自訂卡片",
  idPrefix = "card_picker",
}: {
  cards: DashboardCardDef[];
  visibleCards: string[];
  setVisibleCards: (next: string[]) => void;
  loadingPrefs: boolean;
  defaultVisibleCardIds: string[];
  triggerLabel?: string;
  idPrefix?: string;
}) {
  const toggle = (id: string, on: boolean) => {
    const next = new Set(visibleCards);
    if (on) next.add(id);
    else next.delete(id);
    setVisibleCards(Array.from(next));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">{triggerLabel}</span>
          <span className="text-muted-foreground text-xs tabular-nums">
            ({visibleCards.length}/{cards.length})
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="end">
        <div className="border-b border-border px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium text-foreground">可顯示的統計卡</div>
            {loadingPrefs ? <Skeleton className="h-6 w-14 rounded-md" /> : null}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">已依店家記住；與「儀表板」分頁共用。</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            disabled={loadingPrefs}
            onClick={() => setVisibleCards(cards.map((c) => c.id))}
          >
            全選
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            disabled={loadingPrefs}
            onClick={() => setVisibleCards([])}
          >
            清除
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            disabled={loadingPrefs}
            onClick={() => setVisibleCards(defaultVisibleCardIds)}
          >
            重設預設
          </Button>
        </div>
        <div className="max-h-[min(50vh,22rem)] overflow-y-auto p-1.5">
          {loadingPrefs ? (
            <div className="space-y-2 px-1 py-1">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : (
            cards.map((c) => (
              <div
                key={c.id}
                className="flex items-start justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/60"
              >
                <div className="min-w-0 pr-1">
                  <div className="text-sm font-medium leading-snug">{c.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{c.note}</div>
                </div>
                <Switch
                  id={`${idPrefix}_${c.id}`}
                  checked={visibleCards.includes(c.id)}
                  onCheckedChange={(v) => toggle(c.id, v === true)}
                  className="shrink-0 mt-0.5"
                />
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
