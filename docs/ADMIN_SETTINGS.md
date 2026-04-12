# 後台「設定」與進階串接（LINE／Google Calendar）

> 說明 **老闆 LINE User ID**、**LINE Channel**、**Google Calendar Webhook** 等欄位存在哪裡、如何確認是否已有舊資料、以及暫時不填的影響。  
> 程式載入位置：[`src/pages/AdminPage.tsx`](../src/pages/AdminPage.tsx)（開啟「設定」時自 `system_config` 讀取）。

---

## 資料存在哪裡

這些欄位**不寫死在 repo**，而是存在 **Supabase `system_config`**，依 **`store_id`（店家）** 的 **key-value**：

| 畫面上的設定 | `system_config.key` |
|--------------|---------------------|
| 預約頁公開網址 | `booking_page_url` |
| 老闆 LINE User ID | `line_admin_user_id` |
| 店家聯絡 Email | `store_contact_email` |
| 預約政策文字 | `booking_policy` |
| Google Calendar Webhook URL | `google_calendar_webhook` |
| LINE Channel Access Token | `line_channel_token` |
| LINE Channel Secret | `line_channel_secret` |
| Email 模板（多段） | `email_tpl_*`（見後台表單） |

多租戶時：**每個 `store_id` 各自一組**；切換後台頂部店家後再開「設定」，載入的是該店資料。

---

## 如何確認是否已有舊資料（檢查清單）

請擇一完成：

1. **後台 UI**  
   - 登入 `/admin` → 選對店家 → 點 **「設定」**。  
   - 若 **老闆 LINE User ID**、**Token**、**Secret**、**Webhook** 等欄位**已有內容**，代表該店在資料庫裡**已存過**對應 key。  
   - 若皆空白，代表尚未儲存過（或從未寫入）。

2. **Supabase Dashboard**  
   - **Table Editor** → 表 **`system_config`**。  
   - 篩選 **`store_id`** = 你的店家 UUID。  
   - 檢查是否存在 **`key`** 為：`line_admin_user_id`、`line_channel_token`、`line_channel_secret`、`google_calendar_webhook` 等列，並查看 **`value`**。

3. **SQL（SQL Editor，只讀查詢範例）**  
   將 `:your_store_id` 換成實際店家 UUID：

   ```sql
   select key, length(value) as value_len, left(value, 8) as value_preview
   from public.system_config
   where store_id = ':your_store_id'::uuid
     and key in (
       'line_admin_user_id',
       'line_channel_token',
       'line_channel_secret',
       'google_calendar_webhook',
       'booking_page_url'
     )
   order by key;
   ```

   **注意**：不要在公開場合貼出完整 Token／Secret；`value_preview` 僅供確認「有值與否」。

**Repo 說明**：Git **不會**內建你的 LINE 憑證；是否已有資料完全取決於**該 Supabase 專案**裡是否曾儲存。

---

## 暫時不填可以嗎？

**可以。** 沒有強制「一定要先輸入」才能用後台其他功能；**空著代表該串接能力尚未啟用**。

| 項目 | 不填／空值時的影響（概略） |
|------|---------------------------|
| **老闆 LINE User ID** | [`send-line-notification`](../supabase/functions/send-line-notification/index.ts) 對老闆 **Push** 需同時滿足：可用的 Channel Token 路徑 **且** `line_admin_user_id` 有值；否則 **不會發老闆新預約／取消通知**。 |
| **LINE Channel Token** | 每店可存在 `system_config`；Edge 亦可能使用環境變數 `LINE_CHANNEL_ACCESS_TOKEN` 作為 fallback（見該函數原始碼）。老闆 ID 仍空則老闆推播不發。 |
| **LINE Channel Secret** | LINE **Webhook 驗簽**需與官方後台設定一致；多店時通常寫入每店 `system_config`（見 [`line-webhook`](../supabase/functions/line-webhook/index.ts)）。未設定則該路徑驗證可能失敗。 |
| **Google Calendar Webhook** | 未設定通常表示 **該 URL 整合未啟用**；實際行為依你部署的 `google-calendar-sync`／呼叫端為準。 |

---

## 實務建議

- 先依上一節 **確認 DB** 是否已有值，再貼上新憑證，避免誤覆蓋。  
- **憑證僅存後台或 Supabase**，勿 commit、勿貼公開聊天。  
- 需要 **新預約即推播給老闆** 時，再補齊 **`line_admin_user_id`** 與 **可用的 Channel Token**（每店或多店架構依營運設定）。

---

## 相關程式

| 用途 | 檔案 |
|------|------|
| 後台讀寫上述 key | `src/pages/AdminPage.tsx` |
| 老闆／客人 LINE 通知 | `supabase/functions/send-line-notification/index.ts` |
| LINE Webhook | `supabase/functions/line-webhook/index.ts` |
