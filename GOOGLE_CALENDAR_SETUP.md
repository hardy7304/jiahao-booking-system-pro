# Google 日曆同步設定指南

預約成功後會自動同步到 Google Calendar，需完成以下設定。

---

## 步驟 1：建立 Google Cloud 服務帳號

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立或選擇專案
3. 左側選單 **IAM 與管理** → **服務帳號**
4. 點擊 **建立服務帳號**
   - 名稱：如 `booking-calendar-sync`
   - 建立並繼續（角色可略過）
5. 進入剛建立的服務帳號 → **金鑰** 分頁
6. **新增金鑰** → **建立新金鑰** → 選擇 **JSON**
7. 下載的 JSON 檔會包含 `client_email` 和 `private_key`，**請妥善保管**

---

## 步驟 2：啟用 Google Calendar API

1. 在 Google Cloud Console 左側選單點 **API 與服務** → **程式庫**
2. 搜尋 **Google Calendar API**
3. 點擊啟用

---

## 步驟 3：取得日曆 ID 並分享給服務帳號

1. 開啟 [Google Calendar](https://calendar.google.com)
2. 左側找到要同步的日曆 → 點日曆名稱旁的 **⋮** → **設定與共用**
3. 在 **整合日曆** 區塊找到 **日曆 ID**（格式如 `xxx@group.calendar.google.com` 或你的 Gmail）
4. **重要**：在 **與特定使用者共用** 區塊，點 **新增使用者**
5. 輸入服務帳號的 email（JSON 檔中的 `client_email`，格式如 `xxx@project-id.iam.gserviceaccount.com`）
6. 權限設為 **進行變更的權限**（Make changes to events）
7. 儲存

---

## 步驟 4：在 Supabase 設定 google-calendar-sync 的 Secrets

前往 [Supabase Dashboard](https://supabase.com/dashboard) → **Edge Functions** → **google-calendar-sync** → **Settings** → **Secrets**

新增以下變數（**注意：是 google-calendar-sync 函數**，不是 send-booking-email）：

| Name | Value | 說明 |
|------|-------|------|
| `GOOGLE_CALENDAR_ID` | `xxx@group.calendar.google.com` | 步驟 3 取得的日曆 ID |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `xxx@project-id.iam.gserviceaccount.com` | JSON 中的 client_email |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | 完整 private_key 內容 | 見下方說明 |

### 關於 GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

從 JSON 檔複製 `private_key` 的值（包含 `-----BEGIN PRIVATE KEY-----` 和 `-----END PRIVATE KEY-----`）。

**在 Supabase Secrets 中**：
- 可保留換行，或使用 `\n` 表示換行
- 若貼上後有問題，可將整段用雙引號包住

範例（JSON 中的格式）：
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFA...
...多行...
-----END PRIVATE KEY-----
```

---

## 步驟 5：重新部署

```bash
npx supabase functions deploy google-calendar-sync
```

---

## 驗證設定

### 方法 A：查看 Supabase Logs

1. Supabase Dashboard → **Edge Functions** → **google-calendar-sync** → **Logs**
2. 建立一筆預約
3. 檢查是否有錯誤訊息

### 方法 B：手動測試

```bash
curl -X POST "https://plhrervpunzpdoqruagb.supabase.co/functions/v1/google-calendar-sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 你的_SERVICE_ROLE_KEY" \
  -d '{"action":"list_events","timeMin":"2025-03-15T00:00:00Z","timeMax":"2025-03-16T00:00:00Z"}'
```

若回傳 `{"events":[...]}` 表示設定成功。

---

## 常見問題

### Q: 回傳 "Missing Google Calendar configuration secrets"
A: 三個變數都必須在 **google-calendar-sync** 函數的 Secrets 中設定。Supabase 的 Secrets 是**依函數分開**的。

### Q: 回傳 403 或 "Calendar not found"
A: 確認日曆已**分享**給服務帳號 email，且權限為「進行變更的權限」。

### Q: 預約成功但 Google 日曆沒出現
A: 
1. 到 Supabase → Edge Functions → google-calendar-sync → Logs 查看錯誤
2. 確認 api-booking 有成功呼叫（預約會成功，但 sync 可能靜默失敗）
3. 確認 GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY 格式正確（含 BEGIN/END 行）

### Q: 私鑰貼上後格式錯誤
A: 在 Supabase Secrets 中，可嘗試將 `\n` 換成實際換行，或整段用 `"` 包住。
