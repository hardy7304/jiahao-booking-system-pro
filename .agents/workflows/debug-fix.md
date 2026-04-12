---
name: debug-fix
description: 分析錯誤、縮小問題範圍、提出修復步驟與驗證方式
---

# /debug-fix

當使用者輸入 /debug-fix 時，請依序執行：

1. 先要求使用者提供：
   - 錯誤訊息
   - 發生位置
   - 重現步驟
   - 預期結果
   - 實際結果

2. 將問題分類：
   - 前端 UI
   - API
   - Database
   - Auth
   - n8n
   - Webhook
   - Deployment
   - Environment variables

3. 先做根因分析，不要急著直接改：
   - 可能原因列表
   - 最有可能的原因
   - 如何驗證每個原因

4. 提出修復方案：
   - 最小修復方式
   - 穩定版修復方式
   - 是否會影響其他模組

5. 規劃驗證方法：
   - 如何重測
   - 哪些案例要回歸測試
   - 是否需要加 log、assertion 或 monitoring

6. 最後輸出：
   - 問題摘要
   - 可能根因
   - 建議修復方案
   - 驗證步驟
   - 後續預防建議

若使用者有提供 @terminal、@file、@problems，優先根據這些內容分析。
這個適合你平常貼終端錯誤、Supabase function error、前端 API 問題時使用。
