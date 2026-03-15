# Lovable 遷移說明

從 Lovable 轉移到此專案後，需注意以下影響與設定。

---

## 1. Lovable 遷移會影響什麼？

### Supabase 專案不同

Lovable 會自動建立並管理一個 Supabase 專案。遷移後，你現在使用的是**新的 Supabase 專案**（`plhrervpunzpdoqruagb`）。

| 項目 | Lovable | 遷移後 |
|------|---------|--------|
| Supabase URL | Lovable 代管的專案 | 新專案 `plhrervpunzpdoqruagb` |
| 資料庫 | Lovable 專案的 DB | 需重新執行 schema、或匯入資料 |
| Edge Functions Secrets | Lovable 後台設定 | **需在 Supabase Dashboard 重新設定** |

### 必須重新設定的項目

以下在 Lovable 後台設定的東西，**不會**自動帶到新 Supabase 專案，需手動設定：

| 項目 | 設定位置 | 說明 |
|------|----------|------|
| **Resend**（寄信） | Supabase → Edge Functions → send-booking-email → Secrets | RESEND_API_KEY、RESEND_FROM_EMAIL 等 |
| **Google 日曆** | Supabase → Edge Functions → google-calendar-sync → Secrets | GOOGLE_CALENDAR_ID、服務帳號 email、私鑰 |
| **LINE**（若使用） | Supabase → Edge Functions → line-webhook → Secrets | LINE_CHANNEL_SECRET、LINE_CHANNEL_ACCESS_TOKEN |

### 資料庫

- 若使用全新的 Supabase 專案，需執行 `supabase-schema-complete.sql` 建立資料表
- 若有從 Lovable 匯出資料，需匯入到新專案的 `bookings`、`holidays`、`customers` 等表
- **holidays（公休）**：若新專案的 `holidays` 表是空的，前端不會擋公休、後端現在已加入公休檢查

---

## 2. 已修復：公休日阻擋預約

**問題**：公休日沒有擋預約。

**修復**：已在 `api-booking` 後端加入公休檢查：
- **整天公休**：該日無法預約，回傳「該日為公休日，無法預約」
- **部分時段公休**：與公休時段重疊的預約會被擋下，回傳「該時段為公休時段，無法預約」

前端 `timeUtils.getAvailableSlots` 本來就有檢查公休；後端現在也做檢查，形成雙重防護。

---

## 3. 遷移檢查清單

- [ ] `.env` 已更新為新 Supabase 專案的 URL 與 anon key
- [ ] 資料庫 schema 已執行（`supabase-schema-complete.sql`）
- [ ] 公休資料已匯入或重新建立（`holidays` 表）
- [ ] send-booking-email 的 Resend Secrets 已設定
- [ ] google-calendar-sync 的 Google 日曆 Secrets 已設定
- [ ] 所有 Edge Functions 已部署：`npx supabase functions deploy`
