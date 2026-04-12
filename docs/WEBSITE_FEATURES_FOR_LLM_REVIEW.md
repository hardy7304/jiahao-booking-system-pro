# 網站功能總覽（供 LLM／審查用）

> **專案**：jiahao-booking-system-pro（React + Vite + TypeScript + Supabase）  
> **用途**：給 LLM 做程式碼審查、安全檢視、測試案例發想或文件補齊。  
> **注意**：以下依 repo 結構整理；實際行為以程式與部署環境為準。

---

## 0. 與本 repo 現況對照（避免誤判「已實作」）

| 項目 | 現況（已核對程式庫） |
|------|----------------------|
| **LIFF** | **未**引入 `@line/liff`；§3／§4／§7 關於 LIFF 為 **產品建議／架構規劃**，實作需另加 SDK、LIFF ID、與後端欄位。 |
| **TanStack React Query** | **v5**（`package.json`：`@tanstack/react-query` ^5.83.0）。 |
| **預約建立** | 前端以 **POST** `api-booking`，標頭 `Authorization: Bearer <VITE_SUPABASE_ANON_KEY>`；**無** `supabase.from('bookings').insert()` 建立預約。 |
| **前端讀取 `bookings`** | 有 **`SELECT`**（例如雙人時段預估時讀取當日預約與 `coach_id`），屬輔助計算，非寫入。 |
| **`bookings.line_user_id`** | **目前 schema 無此欄**；`line_user_id` 見於 **`line_message_log`** 等；若採 §4 建議需 migration。 |

---

## 1. 路由與頁面（`src/App.tsx`）

| 路徑 | 說明 | 備註 |
|------|------|------|
| `/` | 首頁：Stitch 版型 **Obsidian Sanctuary**（`LandingPageStitch` → `ObsidianSanctuaryLanding`） | 內容來自 `store_settings`（`useStoreSettings`），品牌名來自 `StoreContext` |
| `/landing-legacy` | 舊版 Landing（`LandingPage`） | 保留對照用，非目前根路徑 |
| `/booking` | 線上預約主流程（`BookingPage`） | |
| `/mylinecalendar` | 與 `/booking` **相同元件** | 可作 LINE 圖文選單／短網址入口；**是否 LIFF 取決於 LINE 端設定，非本 repo 內建** |
| `/my-line-calendar` | 前端轉址至 `/mylinecalendar`（`<Navigate replace>`） | Client-side redirect，非 HTTP 301 |
| `/my-bookings` | 用電話查詢自己的預約（`MyBookingsPage`） | ⚠️ 見 §4 隱私風險與 LIFF 改善方案 |
| `/mylinebookings` | 同 `/my-bookings`（LINE 慣用路徑） | |
| `/my-line-bookings` | 前端轉址至 `/mylinebookings`（`<Navigate replace>`） | Client-side redirect，非 HTTP 301 |
| `/admin` | 後台管理（`AdminPage`） | ⚠️ 見 §5 安全風險 |
| `*` | 404（`NotFound`） | |

**全域**：`StoreProvider`（多店 `storeId`）、TanStack React Query **v5**、`TooltipProvider`、Toaster、SkipLink（無障礙跳至主內容）。

---

## 2. 前台：首頁（Landing）

- **資料**：`store_settings`（CMS：文案、區塊、服務 JSON、師傅區、拳擊區、footer CTA 等）。
- **多租戶**：`StoreContext` 載入 `stores` 清單、`VITE_STORE_ID` 預設／localStorage 記憶選店。
- **舊版** `/landing-legacy`：另一套 Landing 實作，保留對照。

---

## 3. 前台：預約（`/booking`、`/mylinecalendar`）

### 入口方式（產品／營運常見設定；**本 repo 未內建 LIFF SDK**）

- 實務上可透過 LINE 官方帳號 → 圖文選單 → **LIFF** 開啟 `/mylinecalendar`；需在 LINE Developers 與前端另整合 `@line/liff`。
- 若未整合 LIFF，使用者仍以一般瀏覽器開啟同一 URL，行為與 `/booking` 相同。
- **客人預約流程目前不需登入**（無 Supabase Auth 前台）。

### 大致流程

1. 依 `store_id` 載入服務、加購、師傅、店家設定（`useStoreSettings`、`useBookingSettings`、`useShopInfo`、`useCalendarNotes`）。
2. 選服務、加購、芳療／選項、**日期**、**時段**（含可預約時段計算、雙人／併桌邏輯、師傅偏好與備援）。
3. 填 **姓名、手機（09 開頭 10 碼）、Email**、症狀標籤、備註等。
4. 送出預約 → **POST** Edge Function **`api-booking`**（見 §0：無前端直接 `insert` 建立預約）。
5. 成功後可產生 **Google 日曆連結**；LINE 內建瀏覽器改 `window.location` 避免 `target=_blank` 問題。

### 預約相關概念（程式內可見）

- 服務／加購分類、價格、時長、排序。
- **師傅**：可選、今日是否可約、班表起迄、雙人／`needs_pair`、備援師傅名稱預測等。
- **症狀標籤**、**備註**、精油／加購選項（依 UI）。
- 與 **Landing CMS** 解析主師傅名稱（`resolveMainCoachFromCoachRows` 等）。
- **黑名單**：送出前 `customers` 查詢 `is_blacklisted`（可阻擋或僅後台警示）。

### LIFF userId 寫入 `bookings`（**建議，尚未實作**）

若未來整合 LIFF，可將 `liff.getProfile().userId` 一併送進 `api-booking` 並存表，供「我的預約」用 **userId** 查詢；**需 DB migration 與 Edge 配合**（見 §0）。

### ⚠️ 併發風險

兩位客人同時預約同一師傅同一時段時，前端無法單獨防止 race condition。**必須在 `api-booking`（與／或 DB）以 transaction、unique constraint、或明確鎖定** 確保同一 `store_id` + 師傅 + 時段不致重複有效預約。請以 `supabase/functions/api-booking/index.ts` 實作為準。

---

## 4. 前台：我的預約（`/my-bookings`、`/mylinebookings`）

- 目前以 **手機號碼**（同預約頁驗證規則）查詢該 `store_id` 下之 `bookings`。
- 列表顯示日期、時段、狀態等；可 **取消預約**（含原因），依實作呼叫後端／Supabase。

### 🔴 隱私風險與 LIFF 改善方案（**規劃**；現況仍為手機查詢）

**現狀問題**：僅以手機號碼查詢，無身份驗證。任何人輸入他人手機即可查看預約詳情或惡意取消。

**建議改法（利用 LIFF 天然優勢，需先完成 §0 欄位與 SDK）**：

| | 現狀 | 改善後 |
|---|---|---|
| 查詢方式 | 手動輸入手機號碼 | LIFF 自動取得 LINE `userId`，直接查詢 |
| 客人體驗 | 要手動打字 | **打開就看到自己的預約，零輸入** |
| 安全性 | ❌ 可查／取消別人的 | ✅ 只能看到自己的 |
| 前提 | — | 預約時需將 `line_user_id`（或同等欄位）寫入 `bookings` 並於 RLS／API 強制 |

**非 LIFF 環境 fallback**：若客人從一般瀏覽器進入 `/my-bookings`，可保留手機號碼查詢，但需加上 **OTP 驗證**（透過 LINE Webhook 或 SMS 發送驗證碼，5 分鐘過期 + 錯誤鎖定）— **亦為規劃**，非現況。

---

## 5. 後台（`/admin`）

### 🔴 登入安全風險

- 前端存有 **`DEFAULT_ADMIN_PASSWORD` 常數**（fallback 用途）。
- 登入狀態以**明文密碼**存於 `sessionStorage`（key: `admin_password`），後續 API 呼叫帶入 `api-admin` 驗證。
- 任何人按 F12 開發者工具即可能看到密碼值。
- **此密碼僅影響後台 `/admin`，與客人預約流程無關。**

**修正方向（分階段）**：

1. **短期**：移除前端預設常數、確保 `api-admin` 有獨立密碼驗證 + rate limiting + IP 限制。
2. **中期**：改用 **Supabase Auth**（Email/Password），前端只負責送出帳密，由 Supabase 核發 JWT Token 驗證。

### 多租戶

- 頂部 **店家選擇器**（`stores`），切換 `storeId` 影響所有資料查詢與 webhook URL。

### 分頁（Tabs）

| Tab | 內容概要 |
|-----|----------|
| `today` | 今日儀表（`TodayDashboard`）：當日預約／重點摘要 |
| `dashboard` | 圖表儀表（`AdminChartsDashboard`） |
| `bookings` | 預約列表／**清單與月曆**切換（`BookingCalendarView`）、篩選排序（`BookingFiltersBar`）、佣金欄位顯示切換、取消／備註／編輯／**手動建單** |
| `holidays` | 休假日／部分時段公休（表單＋月曆操作） |
| `services` | **服務與加購、師傅**（`ServiceManagement`）：CRUD、排序、上下架、圖片、班表、landing 顯示等 |
| `landing` | Landing CMS（`LandingPageSettings`）：編輯 `store_settings`、圖片上傳至 Supabase Storage |
| `stats` | 統計（`StatsDashboard`）＋佣金（`useCommission`） |
| `customers` | 客戶追蹤（`CustomerTracking`） |
| `line` | LINE 推播統計（`LineMessageStats`） |

### 設定彈窗（常見）

- 店名／師傅名／地址、聯絡 Email、預約政策文字。
- **LINE**：webhook 網址（含 `store_id`）、Channel token／secret、後台 user id、預約頁公開網址。
- **Google Calendar** webhook、日曆備註文字。
- **預約規則**：時段間隔、buffer、免費加購分鐘數、前置封鎖等（數值欄位）。
- **Email 模板**（客人／店家多段：開頭、結尾、頁尾等，支援 placeholder 如 `{{客人姓名}}`、`{{店名}}`）。
- **管理員密碼**修改（可選）。

上述 LINE／Webhook 等之 **`system_config` key**、**是否已有舊資料**、**暫時不填之影響**：見 [`ADMIN_SETTINGS.md`](./ADMIN_SETTINGS.md)。

### 預約操作

- 篩選：日期區間、狀態、服務、姓名、排序。
- 單筆：**取消**（原因）、**備註**、**編輯**（含來源 `customer`／`admin`／`front_desk`、油資紅利等）、來源標籤顯示。

---

## 6. 後端：Supabase Edge Functions（`supabase/functions`）

| 函數 | 用途 | 備註 |
|------|------|------|
| `api-booking` | 建立預約、寫入 `bookings`、觸發通知 | ⚠️ 併發鎖定請讀 `index.ts` |
| `api-admin` | 後台敏感操作（帶 `action`、`password`、`store_id`） | ⚠️ 驗證與 rate limiting 請讀 `index.ts` |
| `api-available-slots` | 查詢可預約時段 | |
| `api-services` | 查詢服務資料 | |
| `api-holidays` | 查詢／管理假日 | |
| `send-booking-email` | 發送預約確認／通知信件 | |
| `send-line-notification` | 發送 LINE 通知 | |
| `send-booking-reminder` | 預約提醒 | `[待確認：cron／排程觸發]` |
| `line-webhook` | LINE Messaging webhook（query 含 `store_id`） | |
| `google-calendar-sync` | Google 日曆同步 | |

> 📌 實際 method／payload 請讀各函數的 `index.ts`。建議後續補齊每個函數的 **輸入參數與回傳格式** 至此表。

---

## 7. 資料與整合

- **Supabase**：PostgreSQL + RLS。已知 **`stores`** 等有政策調整；其餘表請以 migrations／Dashboard Advisors 為準。`[待補：完整 RLS 表清單與政策摘要]`
- **Storage**：Supabase Storage（如 landing 圖片上傳）。
- **環境變數**：`.env` 內 `VITE_SUPABASE_*`、`VITE_STORE_ID` 等（見 `.env.example`）。
- **佣金**：`useCommission` hook。`[待補：計算邏輯與資料來源表名]`
- **日曆備註／店家資訊／預約設定**：各 hook（`useCalendarNotes`、`useShopInfo`、`useBookingSettings`）。
- **LIFF**：**本 repo 未整合**；若產品需要，再補 SDK 與初始化程式。`[待實作]`
- **Edge Functions 呼叫**：預約相關範例使用 **`Authorization: Bearer <anon key>`**；後台 `api-admin` 另帶自訂 `password`。`[待補：是否全面改為 JWT]`

---

## 8. 外部自動化生態（Automation Ecosystem）

本 Repo **程式碼內未必** 直接列出 n8n／Notion webhook；若營運有串接，屬 **基礎設施外** 的流程：

- **n8n**：Webhook 觸發自動化（預約轉發、排程等）。**修改 Edge URL 或 payload 前請與營運確認。**
- **Notion**：病歷／客戶同步等。**`[待補：具體資料流向與觸發點]`**

> ⚠️ LLM 修改程式時，避免擅自移除 Edge 公開 URL 或變更 JSON 格式而未對照外部自動化。

---

## 9. 系統架構：前台 vs 後台安全邊界

| | 🧑 客人（前台） | 🔧 管理員（後台） |
|---|---|---|
| **入口** | 一般瀏覽器或 LINE 內開啟 `/booking`、`/mylinecalendar` 等 | `/admin` |
| **身份識別** | 目前無登入；**規劃中**可為 LIFF `userId` | 密碼（**規劃**改 Supabase Auth） |
| **需要密碼？** | ❌ 目前不需要 | ✅ 需要 |
| **可執行操作** | 預約、查詢／取消（依 §4 風險） | 該店管理功能 |
| **資料存取範圍** | 依 API／RLS／查詢條件 | 該 `store_id` 下資料 |

> 📌 前台「零摩擦」與後台「強驗證」應分開演進。

---

## 10. 給 LLM 的檢查方向（建議提示）

依優先級排序：

1. 🔴 **安全（後台）**：`DEFAULT_ADMIN_PASSWORD`、`sessionStorage` 明文、`api-admin` 驗證。
2. 🔴 **隱私（前台查詢）**：`/my-bookings` 手機查詢風險 → **規劃** LIFF `userId` 或 OTP（見 §0：欄位與 SDK 尚未落地）。
3. 🟠 **併發**：`api-booking` DB 層級防 double booking。
4. 🟠 **多租戶**：切店、webhook、信件是否錯店。
5. 🟠 **LIFF**：**若產品要導入**，再檢 userId 入表與錯誤處理；**勿假設已存在於本 repo**。
6. 🟡 **LINE／Email**：錯誤處理、重試、個資。
7. 🟡 **外部自動化**：n8n／Notion 是否依賴固定 URL／payload。
8. ⚪ **無障礙**：SkipLink、表單標籤。
9. ⚪ **邊界**：雙人預約、時段、取消截止。

---

## 11. 待確認項目彙整

| # | 項目 | 所在章節 | 優先級 | 備註（2026-04 核對） |
|---|------|----------|--------|----------------------|
| 1 | `api-admin` 後端驗證與 rate limiting | §5 | 🔴 高 | 讀 `api-admin/index.ts` |
| 2 | `bookings` 是否存入 LINE `userId` | §3、§4 | 🔴 高 | **現況：無此欄；屬規劃** |
| 3 | `/my-bookings` 非 LIFF 的 OTP fallback | §4 | 🔴 高 | 規劃 |
| 4 | `api-booking` 併發鎖定 | §3 | 🟠 中 | 讀 Edge + DB constraint |
| 5 | 各 Edge Function 的 HTTP method 與 payload | §6 | 🟠 中 | |
| 6 | 完整 RLS 表清單與政策 | §7 | 🟠 中 | |
| 7 | Edge 是否改全面 JWT | §7 | 🟠 中 | 現況預約用 anon Bearer |
| 8 | 預約是否有前端直接 insert | §3 | ✅ | **無**；僅 `api-booking` POST；另有 `SELECT` 輔助 |
| 9 | LIFF SDK 與初始化 | §7 | 🟡 低 | **未整合** |
| 10 | n8n／Notion 資料流 | §8 | 🟡 低 | 多為 repo 外 |
| 11 | `send-booking-reminder` 觸發 | §6 | 🟡 低 | |
| 12 | React Query 版本 | §1 | ✅ | **v5** |
| 13 | 佣金邏輯與來源表 | §7 | ⚪ 低 | |

---

## 12. 修訂紀錄

| 日期 | 說明 |
|------|------|
| 2026-04-01 | 初版：依 `App.tsx`、主要 pages、Admin tabs、functions 目錄整理 |
| 2026-04-13 | 第二版（討論稿）：安全優先級、外部生態、待確認表 |
| 2026-04-13 | 第三版：LIFF 架構、§4 改善、§9 邊界 |
| 2026-04-13 | **第四版**：併入 §0「現況對照」、修正 LIFF／line_user／React Query／預約 insert 與討論稿一致，避免誤判已實作 |
