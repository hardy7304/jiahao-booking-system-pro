# 安平不老松 Lead 自動化 - 完整設定說明

## 一、匯入 Workflow

1. 開啟 n8n（例如 `https://n8n.tainanboxing.com`）
2. 左上角 **Workflows** → **Import from File**
3. 選擇 `anping-bulaosong-lead-automation.json`
4. 匯入後會看到兩個觸發流程：**LINE Webhook** 與 **Form 表單**

---

## 二、Credentials 設定

### 1. Notion API

- **路徑**：Settings → Credentials → Add Credential → **Notion API**
- **名稱**：`Notion 安平`
- **API Key**：`secret_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`（於 Notion Integrations 建立；實際格式可能為 `ntn_` 或 `secret_` 開頭，請貼上你自己的金鑰，勿提交至 Git）

### 2. LINE Access Token（HTTP Header Auth）

- **路徑**：Settings → Credentials → Add Credential → **Header Auth**
- **名稱**：`LINE Access Token`
- **Name**：`Authorization`
- **Value**：`Bearer <YOUR_LINE_CHANNEL_ACCESS_TOKEN>`（於 LINE Developers → Messaging API → Channel access token 取得，勿提交至 Git）

### 3. Resend API

- **路徑**：Settings → Credentials → Add Credential → **Resend**
- **名稱**：`Resend API`
- **API Key**：`re_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`（於 Resend 後台建立，勿提交至 Git）
- **寄件者**：需在 Resend 後台驗證網域後，改為 `noreply@不老松.tw` 或你的網域

### 4. Google Sheets OAuth2

- **路徑**：Settings → Credentials → Add Credential → **Google Sheets OAuth2 API**
- **名稱**：`Google Sheets`
- 依 n8n 指示完成 OAuth 授權

---

## 三、Workflow 內需手動設定的節點

### ④ Notion 查詢素材

- **Database ID**：`YOUR_NOTION_DATABASE_ID`（32 字元 hex，自 Notion 資料庫網址取得；勿與 API 金鑰一併外洩至公開 repo）
- **篩選**：使用 JSON 篩選 `{"property":"狀態","select":{"equals":"上線中"}}`
- 若欄位名稱或選項不同，請在節點內修改 `filterJson`；若匯入後篩選報錯，可刪除 filterType/filterJson，改在後方加 Code 節點過濾

### ⑤ 組裝 Flex Message

- 將 `$env.N8N_FORM_URL` 改為你的 **Form 表單網址**
- 或直接在程式碼中替換 `'https://your-n8n.com/form/xxx'` 為實際表單 URL

### ⑧ Form 表單

- 匯入後啟用 Workflow，點開 **Form 表單** 節點可取得表單 URL
- 將此 URL 填入 ⑤ 的 `formBase`
- 表單含隱藏欄位 `materialId`，從 Flex 按鈕連結 `?materialId=xxx&materialName=xxx` 自動帶入（需正式環境）

### ⑨ Notion 取得素材詳情

- 從 Form 隱藏欄位取得 `materialId`（由表單 URL 參數帶入）

### ⑫ Google Sheets 存 Lead

- 選擇要寫入的 **試算表** 與 **工作表**
- 建議試算表欄位：`姓名`、`Email`、`素材名稱`、`時間`

---

## 四、測試步驟

### 測試 1：LINE 關鍵字 → Flex

1. 啟用 Workflow
2. 取得 Webhook URL：`https://你的n8n網址/webhook/anping-line-lead`
3. 在 LINE Developers Console 將 Webhook URL 設為上述網址
4. 用 LINE 傳送「下載」或「衛教」或「簡報」
5. 預期：收到 Flex Carousel，顯示 Notion 中狀態=上線中的素材

### 測試 2：Form 表單 → 完整流程

1. 開啟 Form 表單 URL（從 ⑧ 節點取得）
2. 在網址後加 `?materialId=某Notion頁面ID&materialName=頸椎保養`
3. 填寫姓名、Email，送出
4. 預期：
   - 店家信箱收到「安平不老松新 Lead」
   - Lead 收到主旨/內容/連結（依 Notion 欄位）
   - Google Sheets 新增一筆
   - 老闆 LINE 收到「🆕 新Lead！」訊息

### 測試 3：Gmail 替代 Resend

若改用 Gmail：

- 新增 **Gmail** 節點取代 Resend
- **To**：`shop@your-domain.tw`（改為實際店家收件信箱，勿將含密碼或私密連結寫進 repo）
- **Subject**：`安平不老松新 Lead`
- **Body**：`姓名：XXX\nEmail：xxx@email\n素材：頸椎保養`

---

## 五、LINE 圖文選單設定

在 LINE Official Account Manager：

1. **設定** → **圖文選單**
2. 新增選單，例如：
   - **標題**：衛教素材
   - **選單項目**：
     - 文字：`下載` 或 `衛教` 或 `簡報`
     - 點擊後會送出該文字，觸發 Webhook

或使用 **Rich Menu** 的 Action 設定為「傳送訊息」，訊息內容為 `下載`、`衛教`、`簡報` 其中一個。

---

## 六、Notion Database 欄位建議

| 欄位名稱 | 類型 | 說明 |
|---------|------|------|
| 名稱 | Title | 素材名稱 |
| 狀態 | Select | 選項含「上線中」 |
| 圖片 | URL 或 Files | 封面圖 |
| 主旨 | Rich Text | 寄給 Lead 的信件主旨 |
| 內容 | Rich Text | 寄給 Lead 的信件內容 |
| 連結 | URL | 素材下載連結 |

---

## 七、節點註解一覽

| 節點 | 註解 |
|-----|------|
| ① | LINE 平台將訊息 POST 到此 URL，需在 LINE Developers 設定 Webhook |
| ② | 檢查訊息是否包含「下載」「衛教」「簡報」 |
| ③ | 若無 replyToken 表示關鍵字不符 |
| ④ | 查詢 Database，篩選 狀態=上線中 |
| ⑤ | 將 Notion 結果轉成 LINE Flex Carousel |
| ⑥ | 使用 LINE Reply API 回傳 Flex 給使用者 |
| ⑦ | 回傳 200 給 LINE，避免重試 |
| ⑧ | 收集 姓名、Email，素材可從 URL 參數帶入 |
| ⑨ | 依 materialId 取得 Notion 頁面詳情 |
| ⑩ | 寄信至店家信箱 |
| ⑪ | 依 Notion 主旨/內容/連結寄給 Lead |
| ⑫ | 將 Lead 寫入 Google Sheets |
| ⑬ | Push 訊息至老闆 LINE（僅由 ⑫ 觸發，避免重複 3 次） |
