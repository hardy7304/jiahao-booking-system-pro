# 寄信與日曆 — 快速除錯

依序執行下列步驟，找出問題。

---

## 步驟 1：一鍵診斷

在專案目錄執行（將 `你的_anon_key` 換成 .env 裡的 `VITE_SUPABASE_PUBLISHABLE_KEY`）：

```powershell
$KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsaHJlcnZwdW56cGRvcXJ1YWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODI2ODksImV4cCI6MjA4OTA1ODY4OX0.vWtdoVotzMqzj1LXha6mLr9yuiM5Z45NBm-FweLHUt4"
$URL = "https://plhrervpunzpdoqruagb.supabase.co"

Write-Host "=== 寄信 (Resend) 診斷 ==="
Invoke-RestMethod -Uri "$URL/functions/v1/send-booking-email" -Headers @{ Authorization = "Bearer $KEY" }

Write-Host "`n=== 日曆 (Google) 診斷 ==="
Invoke-RestMethod -Uri "$URL/functions/v1/google-calendar-sync" -Method POST -Headers @{ "Authorization" = "Bearer $KEY"; "Content-Type" = "application/json" } -Body '{"action":"check"}'
```

或用 curl（在 Git Bash 或 WSL）：

```bash
# 寄信診斷
curl "https://plhrervpunzpdoqruagb.supabase.co/functions/v1/send-booking-email" \
  -H "Authorization: Bearer 你的_anon_key"

# 日曆診斷
curl -X POST "https://plhrervpunzpdoqruagb.supabase.co/functions/v1/google-calendar-sync" \
  -H "Authorization: Bearer 你的_anon_key" \
  -H "Content-Type: application/json" \
  -d '{"action":"check"}'
```

### 解讀結果

| 寄信 | 日曆 | 說明 |
|------|------|------|
| `resend_api_key_set: false` | `google_calendar_id: "未設定"` 等 | 對應的 Secrets 尚未設定 |
| `ok: true` | `ok: true` | 設定正確，問題可能在其他步驟 |

---

## 步驟 2：寄信 — 常見問題

### ① 沒填 Email

預約時**一定要填「Email（選填）」**，否則不會寄信。系統不會主動寄給沒提供 email 的客人。

### ② RESEND_API_KEY 格式

- 正確格式：`re_xxxxxxxxxxxxxxxxxx`（以 `re_` 開頭）
- 若在 Supabase 貼上後變成亂碼或 hash，請重新貼一次完整金鑰

### ③ 使用 onboarding@resend.dev 時

若用預設 `onboarding@resend.dev`，**只能寄到 Resend 帳號登入用的 email**。  
若要寄給任意客人，需在 Resend 驗證自己的網域並設定 `RESEND_FROM_EMAIL`。

### ④ 查 Log 確認錯誤

Supabase Dashboard → Edge Functions → send-booking-email → **Logs**，查看錯誤訊息。

---

## 步驟 3：日曆 — 常見問題

### ① Secrets 未設定

`google-calendar-sync` 需要三個 Secrets，且都要設定在 **google-calendar-sync** 這個 function 底下（不是 send-booking-email）：

- `GOOGLE_CALENDAR_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

### ② 日曆未分享給服務帳號

在 Google 日曆中，將日曆**分享**給服務帳號的 email，權限設為「進行變更的權限」。

### ③ 查 Log

Supabase Dashboard → Edge Functions → google-calendar-sync → **Logs**，查看錯誤內容。

---

## 步驟 4：重新部署後再診斷

修改或設定完成後，執行：

```bash
npx supabase functions deploy send-booking-email
npx supabase functions deploy google-calendar-sync
```

再重跑一次步驟 1 的診斷指令。
