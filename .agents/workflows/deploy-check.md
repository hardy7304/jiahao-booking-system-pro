---
name: deploy-check
description: 上線前檢查前端、後端、環境變數、Webhook 與整體可用性
---

# /deploy-check

當使用者輸入 /deploy-check 時，請依序執行：

1. 先確認本次上線範圍：
   - 前端頁面
   - Supabase schema
   - Edge Functions
   - n8n workflow
   - LINE webhook
   - 第三方 API

2. 列出部署前檢查項目：
   - Git 狀態是否乾淨
   - 環境變數是否齊全
   - migration 是否已建立
   - webhook URL 是否正確
   - callback / redirect URL 是否正確
   - 權限與密鑰是否分清 dev / prod

3. 列出部署步驟：
   - 先部署哪一層
   - 哪些地方需要手動確認
   - 哪些步驟可自動化

4. 列出部署後驗證：
   - 首頁可開啟
   - 關鍵表單可送出
   - 預約可建立
   - 通知可送出
   - 後台可查看資料
   - 錯誤監控正常

5. 若發現風險，補上：
   - 回滾方案
   - 臨時替代方案
   - 監控重點

6. 最後輸出：
   - 上線前檢查表
   - 上線步驟
   - 驗收清單
   - 回滾清單

請用 checklist 格式輸出。
這個很適合你 Vercel + Supabase + n8n 的混合上線流程。
