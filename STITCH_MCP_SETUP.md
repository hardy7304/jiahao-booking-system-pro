# Google Stitch MCP 安裝說明

已在專案 `.cursor/mcp.json` 加入 **`stitch`** 伺服器（使用 npm 套件 `stitch-mcp`）。

## 已設定的 GCP 專案 ID

`.cursor/mcp.json` 內 **`GOOGLE_CLOUD_PROJECT`** 已設為：`gen-lang-client-0596789924`

## 你還需要在本機終端機執行（無法由 Cursor 代你登入）

### 1. 安裝並登入 gcloud（若尚未）

1. 安裝 [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
2. 在 **PowerShell 或 CMD** 依序執行：

```bash
gcloud auth login
gcloud config set project gen-lang-client-0596789924
gcloud auth application-default set-quota-project gen-lang-client-0596789924
gcloud auth application-default login
```

### 2. 啟用 Stitch API

```bash
gcloud beta services mcp enable stitch.googleapis.com
```

（若 `beta` 指令不可用，請以 [stitch-mcp 官方 README](https://www.npmjs.com/package/stitch-mcp) 或 Google Cloud 文件為準更新指令。）

### 3. 重啟 Cursor

關閉並重新開啟 Cursor，或 **Settings → MCP** 重新整理，確認 **stitch** 顯示為已連線。

## 套件說明

- **套件**：`stitch-mcp`（社群維護，對接 Google Stitch）
- **首次執行**：Cursor 會透過 `npx -y stitch-mcp` 自動下載，無需手動 `npm install`

## stitch-mcp 顯示紅燈？依序檢查

### 1. Windows：Cursor 找不到 `npx`（最常見）

專案已把 `stitch` 改成用 **`cmd.exe /c npx ...`** 啟動（較適合 Windows）。  
若仍紅燈，請在 PowerShell 手動測試：

```powershell
npx -y stitch-mcp
```

- 若這裡就報錯：先安裝 [Node.js LTS](https://nodejs.org/)，關閉 Cursor 重開，再試。
- 若手動能跑、Cursor 仍紅燈：改試**全域安裝**後改指令：

```powershell
npm install -g stitch-mcp
```

再把 `.cursor/mcp.json` 裡 `stitch` 改成（路徑請改成你電腦上 `where stitch-mcp` 的結果，常見在 `npm` 全域目錄）：

```json
"stitch": {
  "command": "stitch-mcp",
  "args": [],
  "env": {
    "GOOGLE_CLOUD_PROJECT": "gen-lang-client-0596789924"
  }
}
```

若 `stitch-mcp` 不在 PATH，可改用**完整路徑**，例如：

`C:\\Users\\你的使用者\\AppData\\Roaming\\npm\\stitch-mcp.cmd`

### 2. Google 憑證未登入

```powershell
gcloud auth application-default login
gcloud config get-value project
```

應顯示 `gen-lang-client-0596789924`。

### 3. Stitch API 未啟用

```powershell
gcloud beta services mcp enable stitch.googleapis.com
```

### 4. 改完設定後

完全關閉 Cursor → 再開啟 → **Settings → MCP** 看 **stitch** 是否變綠。

---

## 常見問題（速查）

| 狀況 | 處理方式 |
|------|----------|
| MCP 紅燈 / 無法連線 | 先跑 `npx -y stitch-mcp` 看錯誤；Windows 用 `cmd /c npx` 或全域 `stitch-mcp` |
| 403 / API 未啟用 | `gcloud beta services mcp enable stitch.googleapis.com` |
| 專案 ID 錯誤 | `GOOGLE_CLOUD_PROJECT` 與 `gcloud config get-value project` 一致 |

## 安全提醒

請勿將含 API 金鑰、Token 的 `mcp.json` 提交到公開儲存庫；建議使用 `.gitignore` 排除或改用環境變數。
