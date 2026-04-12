# MCP 在家裡也能用 — 同步步驟

MCP 設定檔 `.cursor/mcp.json` 因含本機路徑與憑證，**不會**隨 Git 提交。要在家裡使用，請依下列方式處理。

---

## 方式一：從範本複製（推薦）

每次 `git pull` 後，若家裡還沒有 MCP 設定：

```powershell
# 在專案根目錄執行
copy .cursor\mcp.json.example .cursor\mcp.json
```

接著依照 [STITCH_MCP_SETUP.md](STITCH_MCP_SETUP.md) 和 [CALENDAR_MCP_SETUP.md](CALENDAR_MCP_SETUP.md) 填入本機憑證（gcloud 登入、OAuth 路徑等）。

---

## 方式二：從公司複製設定檔

在公司電腦上：

1. 開啟 `C:\Users\你的帳號\Desktop\jiahao-booking-system-e0455db6\.cursor\mcp.json`
2. 複製整個內容
3. 透過 OneDrive、Google Drive、Line、Email 等帶回家

在家裡：

1. 在專案建立 `.cursor\mcp.json`，貼上內容
2. 若有 `GOOGLE_OAUTH_CREDENTIALS` 路徑，改為家裡電腦的路徑（例如 `C:\\Users\\Jiahao\\...\\gcp-oauth.keys.json`）
3. 將 `gcp-oauth.keys.json` 複製到專案根目錄（或對應路徑）
4. 重開 Cursor

---

## 方式三：使用全域設定（所有專案共用）

若希望同一台電腦上所有專案都使用同一組 MCP：

1. 將 `mcp.json` 內容複製到：`C:\Users\Jiahao\.cursor\mcp.json`
2. 路徑與憑證改成該電腦專用的設定
3. 重開 Cursor

之後該電腦上開啟任何專案都會載入這組 MCP。

---

## 家裡電腦需額外確認

- **Node.js**：已安裝且 `npx` 可用
- **gcloud**（若用 stitch）：`gcloud auth application-default login`
- **憑證檔**：`gcp-oauth.keys.json` 在專案根目錄或 `mcp.json` 所指路徑
