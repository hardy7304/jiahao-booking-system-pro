# 部署檢查清單

遷移或重新部署時，照此清單逐項完成即可恢復預約系統、日曆同步與 Email 通知。

**專案資訊**
- Supabase Project Ref: `plhrervpunzpdoqruagb`
- Supabase URL: `https://plhrervpunzpdoqruagb.supabase.co`
- Dashboard: https://supabase.com/dashboard/project/plhrervpunzpdoqruagb

---

## 一、Vercel（前端）

**位置**：Vercel 專案 → **Settings** → **Environment Variables**

| 勾選 | 變數名稱 | 值 | 備註 |
|:---:|----------|-----|------|
| ☐ | `VITE_SUPABASE_URL` | `https://plhrervpunzpdoqruagb.supabase.co` | 必填 |
| ☐ | `VITE_SUPABASE_ANON_KEY` | 從 Supabase Dashboard → API → anon public | 必填 |
| ☐ | `VITE_SUPABASE_PROJECT_ID` | `plhrervpunzpdoqruagb` | 選填 |

- 變數名稱**必須**以 `VITE_` 開頭，Vite 才會嵌入到前端。
- 修改後到 **Deployments** → 最新部署 → **Redeploy**。

---

## 二、Supabase Edge Functions 部署

**在專案根目錄執行：**

```bash
npx supabase functions deploy --project-ref plhrervpunzpdoqruagb
```

或個別部署：

```bash
npx supabase functions deploy api-booking
npx supabase functions deploy api-admin
npx supabase functions deploy google-calendar-sync
npx supabase functions deploy send-booking-email
# 其餘：api-available-slots, api-holidays, api-services, line-webhook（若使用）
```

| 勾選 | 項目 |
|:---:|------|
| ☐ | 已執行 `supabase functions deploy` |

---

## 三、Supabase Secrets（Edge Functions 用）

**位置**：Supabase Dashboard → **Edge Functions** → 選取函數 → **Settings** → **Secrets**

### 3.1 send-booking-email

| 勾選 | Name | Value |
|:---:|------|-------|
| ☐ | `RESEND_API_KEY` | Resend 的 API Key（`re_xxx`） |
| ☐ | `RESEND_FROM_EMAIL` | 寄件者 email（驗證過的網域，如 `booking@不老松.tw`） |
| ☐ | `RESEND_FROM_NAME` | 寄件者顯示名稱（例：不老松足湯安平店） |
| ☐ | `RESEND_STORE_EMAIL` | 店家通知信收件 email（選填） |

### 3.2 google-calendar-sync

| 勾選 | Name | Value |
|:---:|------|-------|
| ☐ | `GOOGLE_CALENDAR_ID` | 日曆 ID（如 `xxx@group.calendar.google.com`） |
| ☐ | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | 服務帳號 JSON 的 `client_email` |
| ☐ | `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | 服務帳號 JSON 的 `private_key` 整段（含 `-----BEGIN...` 與 `-----END...`） |

**私鑰注意**：直接從 JSON 複製 `private_key` 整段貼上；可保留 `\n` 或實際換行，不要多餘空格或截斷。

### 3.3 api-admin（若用日曆檢視）

- 日曆 ID 由 `config.get_calendar_id` 從 **google-calendar-sync** 的 `GOOGLE_CALENDAR_ID` 取得，無需在 api-admin 重設。

---

## 四、Resend 網域驗證（正式寄信必做）

**位置**：https://resend.com/domains

| 勾選 | 步驟 |
|:---:|------|
| ☐ | 在 Resend 新增網域（如 `不老松.tw`） |
| ☐ | 到網域 DNS 後台新增 Resend 提供的 **DKIM**（TXT `resend._domainkey`） |
| ☐ | 新增 **SPF**（MX + TXT，如 `send`） |
| ☐ | 選填：新增 **DMARC**（TXT `_dmarc`） |
| ☐ | 回到 Resend 點「I've added the records」等待驗證通過 |

驗證通過後，`RESEND_FROM_EMAIL` 改為該網域的 email（如 `booking@不老松.tw`）。

---

## 五、Google 日曆

| 勾選 | 步驟 |
|:---:|------|
| ☐ | Google Cloud：已建立服務帳號、下載 JSON、啟用 Calendar API |
| ☐ | Google Calendar：日曆已分享給服務帳號 email（權限：進行變更） |
| ☐ | 管理後台 iframe 嵌入：日曆設定 → **存取權限** → 勾選「提供給所有人使用」 |

---

## 六、本地開發 .env

專案根目錄建立 `.env`（已被 .gitignore，不會被 commit）：

```env
VITE_SUPABASE_URL=https://plhrervpunzpdoqruagb.supabase.co
VITE_SUPABASE_ANON_KEY=你的_anon_key
VITE_SUPABASE_PROJECT_ID=plhrervpunzpdoqruagb
```

參考範本：`.env.example`。

---

## 七、快速驗證

| 勾選 | 項目 |
|:---:|------|
| ☐ | 前端：打開預約頁，服務下拉有選項、可選日期時段 |
| ☐ | 預約一筆：成功後 DB 有資料 |
| ☐ | Email：收到預約確認信（需 Resend 網域驗證通過） |
| ☐ | 日曆：管理後台「Google 日曆即時檢視」可開啟、預約有同步到日曆 |

**診斷用 API（需 anon key）**
- 日曆設定：`POST .../functions/v1/google-calendar-sync` body: `{"action":"check"}`
- 寄信設定：`GET .../functions/v1/send-booking-email`

---

更細的步驟可參考：
- `EDGE_FUNCTIONS_DEPLOY.md` — Edge Functions 部署與變數
- `RESEND_SETUP.md` — Resend API 與網域
- `GOOGLE_CALENDAR_SETUP.md` — 服務帳號與日曆分享
- `DEBUG_寄信與日曆.md` — 寄信與日曆除錯
