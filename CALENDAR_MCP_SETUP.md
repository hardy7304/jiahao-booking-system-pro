# Google Calendar MCP 設定（Cursor 內用）

裝好後，可以在 Cursor 裡用自然語言查日曆、建立活動（例如：「我下週三有什麼行程？」、「幫我在明天下午 2 點加一個會議」）。

**注意**：這是「你在 Cursor 裡操作自己的 Google 日曆」，和「預約系統同步到店家日曆」是兩回事。預約同步仍靠 Supabase 的 **google-calendar-sync** Edge Function + **Service Account**。

---

## 1. Google Cloud 設定

1. 打開 [Google Cloud Console](https://console.cloud.google.com)（可用你現有的專案，或新建一個）。
2. **啟用 Calendar API**  
   **API 與服務** → **程式庫** → 搜尋「Google Calendar API」→ **啟用**。
3. **建立 OAuth 2.0 憑證（Desktop 用）**  
   - **API 與服務** → **憑證** → **建立憑證** → **OAuth 用戶端 ID**  
   - 應用程式類型選 **「桌面應用程式」**  
   - 名稱可自訂（例如 `Calendar MCP`）  
   - 若出現「OAuth 同意畫面」，先完成設定（應用程式名稱、支援電子郵件、測試使用者可加你的 Gmail）。
4. **下載 JSON**  
   建立完成後，點該憑證右側 **下載 JSON**，會得到一個 `client_secret_xxx.json`。

---

## 2. 放到專案並改名

1. 把下載的 JSON 檔**複製到專案根目錄**（和 `package.json` 同層）。
2. 檔名改成：**`gcp-oauth.keys.json`**  
   （`.cursor/mcp.json` 裡已指向這個檔名）

若你放在別的路徑，請改 **`.cursor/mcp.json`** 裡 `google-calendar` 的 `GOOGLE_OAUTH_CREDENTIALS` 為該檔的**完整路徑**（Windows 用 `\\`，例如 `C:\\Users\\你的帳號\\Desktop\\gcp-oauth.keys.json`）。

---

## 3. 重開 Cursor

1. 完全關掉 Cursor 再打開（或重新載入視窗）。
2. 第一次使用 Calendar MCP 時，可能會跳出瀏覽器要你**登入 Google 並授權**，完成後即可在 Cursor 裡用日曆。

---

## 4. 使用方式

在 Cursor 對話裡直接說，例如：

- 「我這週有哪些行程？」
- 「幫我在 3/20 下午 2 點建立一個『與客戶開會』的活動」
- 「下週三 10:00～11:00 我有空嗎？」

---

## 疑難排解

- **找不到憑證檔**：確認 `gcp-oauth.keys.json` 在專案根目錄，且檔名完全一致；若路徑不同，改 `.cursor/mcp.json` 的 `GOOGLE_OAUTH_CREDENTIALS`。
- **認證錯誤 / 測試模式**：到 Google Cloud → **OAuth 同意畫面** → 把你的 Gmail 加為**測試使用者**，等幾分鐘再試。
- **Token 一週就過期**：目前是「測試模式」，Token 約 7 天過期；重新用一次日曆功能會再開瀏覽器授權。若要長期不重登，可到 OAuth 同意畫面按「發佈應用程式」（未驗證應用程式會顯示警告，僅自己用可接受）。
