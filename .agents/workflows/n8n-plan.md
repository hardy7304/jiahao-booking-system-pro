---
description: 規劃 n8n workflow 並輸出節點清單與資料流
---

# n8n-plan

當使用者輸入 /n8n-plan 時，請依序執行：

1. 先詢問工作流目的、觸發來源、輸入資料、輸出結果。
2. 將需求拆成節點列表。
3. 說明每個節點的用途。
4. 標出可能用到的 webhook、HTTP request、IF、Code、Set、Supabase 節點。
5. 最後輸出：
   - workflow 摘要
   - 節點順序
   - JSON 結構建議
   - 風險與注意事項
