# Edge Functions 部署指南

新 Supabase 專案 URL: `https://plhrervpunzpdoqruagb.supabase.co`

---

## 1. 需要的 Edge Functions 清單

| 函數名稱 | 用途 | 由誰呼叫 |
|----------|------|----------|
| **api-booking** | 預約 CRUD（建立、查詢、取消） | 預約頁、我的預約頁 |
| **api-admin** | 管理後台所有操作 | 管理後台 |
| **api-available-slots** | 取得可預約時段 | 預約頁（若使用） |
| **api-holidays** | 取得假日列表 | 日曆相關 |
| **api-services** | 取得服務與加購項目 | 預約頁（備援） |
| **google-calendar-sync** | 同步 Google 日曆 | api-booking、api-admin |
| **line-webhook** | LINE 訊息 Webhook | LINE 平台（若啟用） |

**預約寫入依賴**：`api-booking` 負責將預約寫入 `bookings` 表。

---

## 2. 部署步驟

### 前提：安裝 Supabase CLI

```bash
# 使用 npm 安裝
npm install -g supabase

# 或使用 scoop (Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 步驟 1：登入 Supabase

```bash
supabase login
```

瀏覽器會開啟，登入後即可。

### 步驟 2：連結新專案

在專案根目錄執行：

```bash
supabase link --project-ref plhrervpunzpdoqruagb
```

會要求輸入 database password（建立專案時設定的密碼）。

### 步驟 3：更新 config.toml（可選）

編輯 `supabase/config.toml`，將 `project_id` 改為新專案：

```toml
project_id = "plhrervpunzpdoqruagb"
```

### 步驟 4：部署所有 Edge Functions

```bash
supabase functions deploy
```

或分別部署：

```bash
supabase functions deploy api-booking
supabase functions deploy api-admin
supabase functions deploy api-available-slots
supabase functions deploy api-holidays
supabase functions deploy api-services
supabase functions deploy google-calendar-sync
supabase functions deploy line-webhook
```

### 步驟 5：更新前端 .env

前往 [Supabase Dashboard](https://supabase.com/dashboard/project/plhrervpunzpdoqruagb/settings/api)  
→ **Settings** → **API**，取得：

- **Project URL**：`https://plhrervpunzpdoqruagb.supabase.co`
- **anon public** key

更新 `.env`：

```env
VITE_SUPABASE_PROJECT_ID="plhrervpunzpdoqruagb"
VITE_SUPABASE_URL="https://plhrervpunzpdoqruagb.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="你的新 anon key"
```

### 步驟 6：重新啟動前端

```bash
npm run dev
```

---

## 3. 驗證部署

### 測試 api-booking

```bash
curl -X POST "https://plhrervpunzpdoqruagb.supabase.co/functions/v1/api-booking" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 你的_anon_key" \
  -d '{"action":"list"}'
```

若回傳 `[]` 或預約陣列，表示部署成功。

### 建立一筆測試預約

```bash
curl -X POST "https://plhrervpunzpdoqruagb.supabase.co/functions/v1/api-booking" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 你的_anon_key" \
  -d '{
    "action": "create",
    "booking": {
      "date": "2025-03-20",
      "start_hour": 10,
      "start_time_str": "10:00",
      "name": "測試",
      "phone": "0912345678",
      "service": "腳底按摩",
      "addons": [],
      "duration": 60,
      "total_price": 800
    }
  }'
```

---

## 4. 常見問題

### Q: 部署時出現 "function size exceeded"？
A: 單一函數上限約 20MB，若過大可檢查相依套件與 bundle 設定。

### Q: 預約仍寫不入？
A: 檢查：
1. `.env` 是否已更新為新 Supabase URL 與 anon key
2. 是否重新 build / 重啟 dev server（`npm run dev`）
3. 瀏覽器 Network 是否打到 `plhrervpunzpdoqruagb.supabase.co` 的 `api-booking`

### Q: admin 後台 401？
A: 在 `system_config` 新增 `admin_password`，或在第一次登入時依 UI 設定密碼。
