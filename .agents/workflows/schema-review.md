---
name: schema-review
description: 審查資料表設計、欄位命名、關聯、RLS 與多租戶風險
---

# /schema-review

當使用者輸入 /schema-review 時，請依序執行：

1. 先確認資料模型目標：
   - 這張表是做什麼
   - 主要使用者是誰
   - 寫入來源與讀取來源是什麼

2. 檢查 schema 結構：
   - 表名是否清楚
   - 欄位命名是否一致
   - 型別是否合適
   - nullable 是否合理
   - default 值是否完整

3. 檢查關聯與約束：
   - foreign key
   - unique constraint
   - index
   - cascade 規則

4. 檢查安全性與多租戶風險：
   - 是否有 tenant / store 隔離
   - RLS 是否足夠
   - service role 使用是否過度
   - 查詢是否可能跨店洩漏資料

5. 檢查可維護性：
   - 是否需要 audit fields
   - 是否需要 soft delete
   - 是否需要 status enum
   - 是否需要 migration 調整

6. 最後輸出：
   - schema 審查摘要
   - 問題清單
   - 建議修改
   - migration 建議
   - 風險等級

若有 SQL 或 schema 檔案，先閱讀後再評論。
這個 workflow 很適合你的多租戶 booking system，尤其是 store 隔離與 RLS 檢查。
