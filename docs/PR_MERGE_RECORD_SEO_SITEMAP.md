# Pull Request 紀錄（合併後補登）

> 本變更已於本機合併進 `main` 並推送；此文件作為 **PR 說明與稽核紀錄** 留存。

## 摘要

| 項目 | 內容 |
|------|------|
| **標題** | feat: add dynamic SEO meta, schema, sitemap edge function |
| **來源分支** | `feature/new-store-default-landing` |
| **目標分支** | `main` |
| **合併 commit** | `903c8e4` |
| **合併方式** | merge commit（`Merge branch 'feature/new-store-default-landing' into main`） |
| **遠端** | `https://github.com/hardy7304/jiahao-booking-system-pro` |

## GitHub 連結（手動檢視）

- **合併 commit**：  
  `https://github.com/hardy7304/jiahao-booking-system-pro/commit/903c8e4`
- **main 分支**：  
  `https://github.com/hardy7304/jiahao-booking-system-pro/tree/main`

## 變更範圍（高層）

- **SEO**：`react-helmet-async`、`useSEO`、`LandingPageStitch` 動態／根路徑 meta、JSON-LD（店家頁）
- **資料庫**：`stores` 欄位（seo、og、phone 等）、GRANT、`updated_at`（sitemap lastmod）
- **Sitemap**：Edge Function `sitemap`、`vercel.json` 將 `/sitemap.xml` 轉發至 Function
- **靜態**：`public/robots.txt`
- **多租戶／Landing**：`SlugGuard`、`StoreContext` 擴充、Landing v2 服務卡與 CMS 等（與該功能分支一致）

## 部署提醒

1. Supabase：套用相關 migrations 後再部署 `sitemap` function：  
   `supabase functions deploy sitemap`
2. 確認 `https://booking.tainanboxing.com/sitemap.xml` 與 `robots.txt` 可存取。

---
*文件建立日：2026-04-16（依專案慣例可於後續 PR 改為自動產生）*
