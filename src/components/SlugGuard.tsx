import { useStore } from "@/contexts/StoreContext";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";

/** 包住 /s/:slug/* 底下頁面：slug 解析中顯示載入；無效 slug 顯示 404 */
export function SlugGuard({ children }: { children: React.ReactNode }) {
  const { slugRouteNotFound, isSlugRoutePending } = useStore();
  if (slugRouteNotFound) return <NotFound />;
  if (isSlugRoutePending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">載入店家資訊</span>
      </div>
    );
  }
  return <>{children}</>;
}
