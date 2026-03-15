# Resend 設定指南

此專案使用 Resend 發送預約確認信給客人，以及新預約通知給店家。

---

## 步驟 1：取得 Resend API Key

1. 前往 [Resend](https://resend.com) 並登入
2. 點擊左側 **API Keys**
3. 點擊 **Create API Key**
4. 輸入名稱（如：`嘉豪預約系統`）
5. 選擇權限：**Sending access**
6. 複製產生的 API Key（格式：`re_xxxxxxxxxx`），**只會顯示一次**，請妥善保存

---

## 步驟 2：驗證網域（正式環境必做）

若只做測試，可跳過此步驟，使用 Resend 預設的 `onboarding@resend.dev` 寄件（收件人有限制）。

### 正式發信需驗證自己的網域：

1. 前往 [Resend Domains](https://resend.com/domains)
2. 點擊 **Add Domain**
3. 輸入網域，例如：
   - `yourdomain.com`（主網域）
   - 或子網域 `booking.yourdomain.com`（建議，較好管理）
4. Resend 會顯示兩組 DNS 記錄：**SPF** 和 **DKIM**
5. 到你的網域 DNS 管理介面（如 Cloudflare、GoDaddy、中華電信等）新增這些記錄
6. 回到 Resend 點擊 **Verify DNS Records**
7. 驗證成功後，即可使用該網域發信，例如：`booking@yourdomain.com`

---

## 步驟 3：在 Supabase 設定 Secrets

### 方法 A：透過 Supabase Dashboard（建議）

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇專案 `plhrervpunzpdoqruagb`
3. 左側選單 **Edge Functions** → **send-booking-email**
4. 點擊 **Settings** → **Secrets**
5. 新增以下變數：

| Name | Value | 必填 |
|------|-------|------|
| `RESEND_API_KEY` | `re_xxxxxxxxxx`（你的 API Key） | ✅ |
| `RESEND_FROM_EMAIL` | `booking@yourdomain.com`（或 `onboarding@resend.dev` 測試用） | 建議 |
| `RESEND_FROM_NAME` | `不老松足湯安平店` | 選填 |
| `RESEND_STORE_EMAIL` | `store@yourdomain.com`（店家收通知的 email） | 選填 |

### 方法 B：透過 Supabase CLI

在專案根目錄執行：

```bash
# 先連結專案（若尚未連結）
supabase link --project-ref plhrervpunzpdoqruagb

# 設定 secrets
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxx
supabase secrets set RESEND_FROM_EMAIL=booking@yourdomain.com
supabase secrets set RESEND_FROM_NAME="不老松足湯安平店"
supabase secrets set RESEND_STORE_EMAIL=store@yourdomain.com
```

將 `re_xxxxxxxxxx`、`booking@yourdomain.com`、`store@yourdomain.com` 換成你的實際值。

---

## 步驟 4：部署 Edge Function

```bash
supabase functions deploy send-booking-email
```

---

## 步驟 5：測試

1. 開啟預約頁面
2. 完成一筆預約，並填寫 **Email（選填）** 欄位
3. 檢查：
   - 客人 email 是否收到「預約確認」信
   - 若有設定 `RESEND_STORE_EMAIL`，店家是否收到「新預約通知」

---

## 常見問題

### Q: 使用 onboarding@resend.dev 可以寄給任何人嗎？
A: 不行。Resend 測試網域只能寄給你在 Resend 帳號中註冊的 email。正式環境請驗證自己的網域。

### Q: 寄信失敗、收不到信？
A: 檢查：
1. `RESEND_API_KEY` 是否正確
2. `RESEND_FROM_EMAIL` 是否已在 Resend 驗證過
3. 到 [Resend Logs](https://resend.com/emails) 查看發送紀錄與錯誤訊息

### Q: 店家沒收到通知？
A: 確認有設定 `RESEND_STORE_EMAIL`，且為有效 email 格式。
