# 前端多租戶改造計畫（Multi-Tenant Migration Plan）

**專案**：不老松足湯預約系統  
**當前預設 store_id**：`8e8388bf-860e-44f7-8e14-35b76c64fb52`（不老松安平店）  
**目標**：所有讀取／寫入都依 `store_id` 隔離，並為未來多店切換鋪路。

---

## 一、store_id 存放策略（React Context）

### 建議架構

```
App
 └── StoreProvider (React Context)
       └── storeId: string | null
       └── storeSlug: string | null  (可選，供 URL 路由用)
       └── setStore: (id, slug?) => void
       └── BrowserRouter
             └── Routes...
```

### 實作方向（分階段）

| 階段 | 做法 | 適用場景 |
|------|------|----------|
| **Phase 1** | `store_id` 放在 `.env`（`VITE_STORE_ID`），Context 只負責讀取並提供給子元件 | 單店或先快速上線 |
| **Phase 2** | 用 URL 路徑 `/s/:storeSlug/...` 決定店家，Context 依 slug 查 stores 表取得 store_id | 多店共用同一網域 |
| **Phase 3** | 登入後選店，store_id 存在 sessionStorage，Context 依 session 初始化 | Admin 多店切換 |

**建議先做 Phase 1**：在 `.env` 加 `VITE_STORE_ID=8e8388bf-860e-44f7-8e14-35b76c64fb52`，建立 `StoreContext` 從 env 讀取，所有 API 呼叫都從 Context 拿 `storeId`。

---

## 二、需要修改的檔案總覽

### A. 前端（src/）

| 檔案 | 改動類型 | 說明 |
|------|----------|------|
| `src/contexts/StoreContext.tsx` | **新增** | 提供 `storeId` 給全專案 |
| `src/App.tsx` | 修改 | 包一層 `StoreProvider` |
| `src/integrations/supabase/client.ts` | 修改（可選） | 若有用到 Realtime，可考慮 RLS；本專案主要用 REST，可略 |
| `src/pages/BookingPage.tsx` | 修改 | 服務／ addon 查詢加 `store_id`；建立預約時帶入 `store_id` |
| `src/pages/MyBookingsPage.tsx` | 修改 | 查詢 bookings 加 `store_id`；取消預約時傳 `store_id` |
| `src/pages/AdminPage.tsx` | 修改 | bookings / holidays / customers / admin 密碼查詢加 `store_id` |
| `src/lib/adminApi.ts` | 修改 | 每次呼叫 api-admin 都帶 `store_id` |
| `src/lib/timeUtils.ts` | 修改 | `getAvailableSlots` 查 bookings / holidays 加 `store_id`；`getBookingConfig` 若 system_config 有 store_id 也需過濾 |
| `src/hooks/useShopInfo.ts` | 修改 | system_config 查詢若支援 store 需加 `store_id` |
| `src/hooks/useBookingSettings.ts` | 修改 | 同上 |
| `src/hooks/useCalendarNotes.ts` | 修改 | 同上 |
| `src/hooks/useCommission.ts` | 修改 | system_config、services、addons 查詢加 `store_id` |
| `src/components/ServiceManagement.tsx` | 修改 | services / addons 查詢加 `store_id` |
| `src/components/admin/CustomerTracking.tsx` | 修改 | customers / bookings / tags / notes / custom_fields / field_values 查詢與寫入加 `store_id` |
| `src/components/admin/LineMessageStats.tsx` | 修改 | line_message_log 查詢加 `store_id`；system_config 若依 store 則加 `store_id` |

### B. Edge Functions（supabase/functions/）

| 檔案 | 改動類型 | 說明 |
|------|----------|------|
| `api-booking/index.ts` | 修改 | GET/POST/DELETE 皆以 `store_id` 過濾／寫入 |
| `api-admin/index.ts` | 修改 | 所有 action 的查詢／插入／更新／刪除都加 `store_id` |
| `api-services/index.ts` | 修改 | services / addons 查詢加 `store_id` |
| `api-holidays/index.ts` | 修改 | holidays 查詢加 `store_id` |
| `api-available-slots/index.ts` | 修改 | bookings / holidays / system_config 查詢加 `store_id` |
| `line-webhook/index.ts` | 修改 | customers / bookings 查詢與更新加 `store_id`；需依 LINE 頻道或 webhook URL 決定 store |
| `send-line-notification/index.ts` | 修改 | customers / line_message_log / system_config 查詢若依 store 則加 `store_id` |
| `send-booking-reminder/index.ts` | 修改 | bookings / customers / system_config 查詢加 `store_id` |
| `google-calendar-sync/index.ts` | 修改 | bookings / holidays 更新加 `store_id` 條件（避免誤改別店） |

### C. system_config 表

**提醒**：若 `system_config` 目前尚未加 `store_id`，多租戶下需：
- 加 `store_id` 欄位
- 每個 key 依 store 存不同值（例：安平店 buffer_minutes=10，另一店=15）

否則所有店家會共用同一組 config。

---

## 三、具體修改清單（依執行順序）

### Step 1：建立 StoreContext

1. 新增 `src/contexts/StoreContext.tsx`
   - 從 `import.meta.env.VITE_STORE_ID` 讀取預設 `storeId`
   - 若 env 沒設，用 `8e8388bf-860e-44f7-8e14-35b76c64fb52`
   - 提供 `StoreProvider`、`useStore()`，回傳 `{ storeId }`

2. 在 `.env` 與 `.env.example` 加上：
   ```
   VITE_STORE_ID=8e8388bf-860e-44f7-8e14-35b76c64fb52
   ```

3. 在 `App.tsx` 外層包 `StoreProvider`

### Step 2：adminApi 統一帶 store_id

1. 修改 `src/lib/adminApi.ts`
   - 從 `useStore()` 或參數取得 `store_id`
   - 由於 adminApi 非 React 元件，改為每次呼叫時傳入 `store_id`，或從全域/函式參數注入
   - 建議：`adminApi(action, { ...data, store_id: storeId })`

### Step 3：前台頁面（BookingPage、MyBookingsPage）

1. **BookingPage.tsx**
   - `useStore()` 取得 `storeId`
   - 載入 services、addons 時加 `.eq('store_id', storeId)`
   - 黑名單查 customers 加 `.eq('store_id', storeId)`
   - POST api-booking 的 body 加 `store_id`

2. **MyBookingsPage.tsx**
   - 查 bookings 加 `.eq('store_id', storeId)`
   - DELETE api-booking 可在 body 傳 `store_id`（或後端從 booking 推斷，但前端傳更明確）

### Step 4：後台與共用邏輯

1. **timeUtils.ts**
   - `getAvailableSlots`：bookings、holidays 查詢加 `store_id`
   - `getBookingConfig`：若 system_config 有 `store_id`，加 `.eq('store_id', storeId)`

2. **AdminPage.tsx**
   - 所有 `supabase.from(...)` 查詢加 `store_id`
   - 呼叫 `adminApi` 時帶 `store_id`

3. **Hooks**（useShopInfo、useBookingSettings、useCalendarNotes、useCommission）
   - system_config、services、addons 查詢加 `store_id`

4. **ServiceManagement.tsx、CustomerTracking.tsx、LineMessageStats.tsx**
   - 依表格逐一加 `store_id` 過濾

### Step 5：Edge Functions

1. **api-booking**
   - 從 request body 或 header 取得 `store_id`
   - GET：`query = query.eq('store_id', store_id)`
   - POST：`bookingData` 加 `store_id`
   - DELETE：確認該 booking 的 `store_id` 符合請求的 `store_id`（安全）

2. **api-admin**
   - 從 body 取得 `store_id`，每個 action 的 select/insert/update/delete 都加 `store_id`

3. **api-services、api-holidays、api-available-slots**
   - 從 query 或 body 取得 `store_id`，所有查詢加 `.eq('store_id', store_id)`

4. **line-webhook**
   - 需有機制決定「這個 webhook 屬於哪個 store」（例如不同 LINE 頻道對應不同 store，或 URL path 帶 store_slug）
   - 查詢 customers、bookings 時加 `store_id`

5. **send-line-notification、send-booking-reminder**
   - 呼叫時傳入 `store_id`，查詢 customers、line_message_log 等加 `store_id`

6. **google-calendar-sync**
   - 更新 bookings、holidays 時加 `.eq('store_id', store_id)` 條件

### Step 6：前端呼叫 Edge Functions 時傳 store_id

| 呼叫來源 | 目標 Function | 傳遞方式 |
|----------|---------------|----------|
| BookingPage | api-booking (POST) | body.store_id |
| MyBookingsPage | api-booking (DELETE) | body.store_id（可選，後端可從 booking 推斷） |
| adminApi | api-admin | body.store_id |
| api-booking 內部 | api-available-slots（若透過 function） | 本專案 timeUtils 在前端直接查 Supabase，無此呼叫 |
| timeUtils | — | 直接 supabase client 查詢，加 store_id |
| api-admin 內部 | google-calendar-sync, send-line-notification | 從原請求的 store_id 一併傳下去 |

---

## 四、資料流示意

```
使用者 → React (useStore) → storeId
                ↓
        ┌───────┴───────┐
        ↓               ↓
  supabase.from()   fetch(api-xxx)
  .eq('store_id')   body: { store_id }
        ↓               ↓
        └───────┬───────┘
                ↓
        Supabase DB (RLS 可選，但先以應用層過濾為主)
```

---

## 五、注意事項

1. **adminApi 非 React**：`adminApi` 在普通函式中呼叫，拿不到 `useStore()`。解法：
   - 呼叫 `adminApi` 的元件先 `useStore()` 拿 `storeId`，再 `adminApi(action, { ...data, store_id: storeId })`
   - 或建立 `getStoreId()` 從 sessionStorage / 全域變數讀取（需在登入或選店時寫入）

2. **line-webhook 的 store 判定**：每個店家可能有不同 LINE  Official Account，需在 webhook 依 `x-line-signature` 或 webhook URL 決定 store_id，或從 `system_config` 的 `line_channel_id → store_id` 對應表查詢。

3. **system_config 多租戶**：若尚未加 `store_id`，需另做 migration，並更新所有讀取 system_config 的查詢。

4. **RLS（Row Level Security）**：可選，在 DB 層加 RLS 強制 `store_id` 隔離，作為第二道防線。

---

## 六、建議執行順序

1. 建立 `StoreContext` + `.env` 設定  
2. 修改 `adminApi` 介面（接受 store_id 參數）  
3. 修改 `BookingPage`、`MyBookingsPage`  
4. 修改 `timeUtils`  
5. 修改 `AdminPage` 與所有使用 `adminApi` 的元件  
6. 修改 hooks（useShopInfo、useBookingSettings、useCalendarNotes、useCommission）  
7. 修改 ServiceManagement、CustomerTracking、LineMessageStats  
8. 部署並修改 Edge Functions（api-booking → api-admin → api-services → api-holidays → api-available-slots → line-webhook → send-* → google-calendar-sync）  
9. 依需求決定是否為 system_config 加 `store_id` 並調整查詢  

完成後即可開始依此計畫逐步改 code。
