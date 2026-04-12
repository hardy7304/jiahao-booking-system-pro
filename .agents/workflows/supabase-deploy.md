---
description: 檢查並規劃 Supabase migration、Edge Functions 與部署流程
---

# /supabase-deploy

當使用者輸入 /supabase-deploy 時：

1. 先確認要部署的內容：schema、RLS、Edge Function、env。
2. 檢查是否有 migration、table、policy、secret 變更。
3. 列出部署前檢查項目。
4. 產出部署步驟，必要時附 CLI 指令。
5. 列出部署後驗證方式。
6. 最後輸出：
   - 部署清單
   - 指令順序
   - 風險與回滾建議
