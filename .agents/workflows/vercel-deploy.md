---
name: vercel-deploy
description: 確認 Vercel 部署狀態、環境變數與上線驗證流程
---

# /vercel-deploy

當使用者輸入 /vercel-deploy 時，請依序執行：

1. 先確認部署範圍：
   - 是 preview 還是 production
   - 哪個 branch 要部署
   - 有沒有新的環境變數

2. 部署前檢查：
   - .env.example 是否更新
   - Vercel 環境變數是否同步
   - build 有沒有錯誤
   - Supabase URL 和 ANON_KEY 是否正確
   - API endpoint 是否指向正式環境

3. 部署步驟：
   - git push origin main 觸發自動部署
   - 或手動 vercel --prod

4. 部署後驗證：
   - 首頁可開啟
   - 預約功能可使用
   - Supabase 連線正常
   - LINE webhook 收得到
   - 環境變數沒有洩漏到前端

5. 若部署失敗：
   - 看 Vercel build log
   - 確認 Node 版本
   - 確認 npm build 指令
   - 回滾到上一個部署

6. 最後輸出：
   - 部署前 checklist
   - 部署指令
   - 驗收清單
   - 失敗排查方向
