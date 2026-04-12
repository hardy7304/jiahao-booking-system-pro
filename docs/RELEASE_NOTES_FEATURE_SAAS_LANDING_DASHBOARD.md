# 發行說明：`feature/saas-landing-dashboard`

> **目的**：詳細記錄本分支相對於 `main` 的變更，供 PR 說明、上線檢核與交接使用。  
> **匯入 Notion**：在 Notion 新增頁面 → 將本檔全文複製貼上 → Notion 會自動辨識標題與清單；可再調整 icon／資料庫屬性。

---

## 範圍與 Git

| 項目 | 內容 |
|------|------|
| 分支 | `feature/saas-landing-dashboard` |
| 合併目標（建議） | `main` |
| 相對 `main` 的 commit 數 | 見下方「Commit 清單」 |
| 遠端同步 | 推送目標為 `origin/feature/saas-landing-dashboard`（與本文件撰寫時之最新一致者為準） |

### Commit 清單（`main..HEAD`，新 → 舊）

1. `7f6f985` — fix(db): migration 對齊遠端、store_settings 補欄位、stores RLS  
2. `2fd88df` — feat(booking): 升級預約信件通知系統與後台 Email 模板管理功能  
3. `eb55d32` — feat(admin): enhance dashboard analytics cards  
4. `afd0b2b` — feat(admin): add store switcher for multi-tenant webhook routing  
5. `6b36afb` — feat(booking): 主師傅由 CMS 標題解析、雙人搭班與師傅遷移  
6. `5b975ef` — chore: switch root to new landing, keep legacy at `/landing-legacy`  
7. `907169c` — feat: add framer-motion landing v2 with admin image controls  
8. `07227f9` — chore: allow trycloudflare host in Vite dev server  
9. `50c0db0` — feat: Landing 無障礙優化、Agency Agents、gitignore 更新  
10. `802a788` — feat: Landing CMS、store_settings 精簡 payload、Booking 回首頁連結、前台特效  
11. `848134b` — feat(landing): dragon lobster dashboard + admin charts  

---

## 功能摘要（依領域）

### 前台／Landing

- 新版 Landing（含儀表板風格區塊、後台圖表／數據相關能力之鋪墊）。
- Framer Motion 動效、後台可管控之圖片／展示相關控制。
- 根路徑改為新 Landing；舊版保留於 `/landing-legacy`。
- Landing CMS、`store_settings` 讀取精簡、Booking 回首頁連結、前台特效。
- 無障礙（a11y）與開發用主機（如 trycloudflare）等設定調整。

### 後台／Admin

- 儀表板分析卡片強化（dragon lobster dashboard + admin charts 等）。
- **多租戶**：店家切換器，與 webhook 路由依店家分流。
- Email 模板與後台管理（與預約信件一併升級）。

### 預約／Booking

- 主師傅名稱由 CMS 標題解析、雙人搭班、師傅欄位遷移等。
- 預約信件通知升級；後台 Email 模板管理。

### Edge Functions（Supabase）

- `api-booking`、`send-booking-email`、`send-line-notification` 等配合預約與通知流程更新（以 repo 實際 diff 為準）。

### 資料庫（Supabase Migrations）

- **Migration 歷史與遠端對齊**  
  - 將重複版本前綴之 `20260317_*` 拆分為 `20260316010000`、`20260316010001`。  
  - 新增 `20260324102307_align_remote_history.sql` 與遠端已存在之版本對齊。  
- **`store_settings`（`20260322120000`）**  
  - 遠端若為舊表結構，`CREATE TABLE IF NOT EXISTS` 不會補欄位；已於同一支 migration 內以 `ADD COLUMN IF NOT EXISTS` 補齊再行 `INSERT`，避免漂移錯誤。  
- **`stores` 安全（`20260331140000`）**  
  - 啟用 RLS。  
  - `anon`／`authenticated` 僅能 `SELECT` 欄位：`id`, `name`, `slug`, `is_active`。  
  - `service_role` 保留完整表權限供後台／Edge 使用。  

更完整的長期多租戶計畫可併參：`docs/MULTI_TENANT_MIGRATION_PLAN.md`。

### 工具／開發體驗

- `.cursor/run-stitch-mcp.bat`：移除寫死之使用者路徑，改依 `%LOCALAPPDATA%` 尋找 Google Cloud SDK（`gcloud`）。

---

## 上線／部署檢核表

合併至 `main` 並部署前建議勾選：

- [ ] **Supabase**：目標專案（staging／production）已執行 `supabase db push` 或等同流程，migration 與遠端一致。  
- [ ] **環境變數**：`VITE_*`、Edge Functions 所需之 URL／金鑰與正式站一致。  
- [ ] **多租戶**：`VITE_STORE_ID` 或店家列表行為在正式網域下正確。  
- [ ] **預約動線**：建立／修改預約、信件、LINE 是否依環境測過。  
- [ ] **RLS**：前台僅需之 `stores` 欄位；敏感表（如客戶、預約全文）若 Advisor 仍警示，排程後續收斂政策。  

---

## PR 標題／描述（可複製）

**標題建議**

```text
feat: SaaS 前台 Landing、多租戶後台、預約／通知與 DB 安全強化
```

**描述**：可直接以本文件「功能摘要」＋「上線檢核表」精簡貼上 GitHub；完整內容保留於本檔。

---

## 修訂紀錄

| 日期 | 說明 |
|------|------|
| 2026-03-31 | 初版：依 `git log main..HEAD` 與對話紀錄整理 |
