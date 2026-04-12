---
name: store-setup
description: 規劃新門市建立、多租戶設定、公休、服務項目與權限配置
---

# /store-setup

當使用者輸入 /store-setup 時，請依序執行：

1. 先確認目標：
   - 是新增門市還是修改現有門市
   - 門市名稱、地址、時區
   - 營業時間、公休規則
   - 服務項目清單

2. 規劃資料庫操作：
   - stores table 新增/修改
   - store_hours 設定
   - holidays 設定
   - services 與 staff 關聯

3. 確認多租戶隔離：
   - store_id 是否正確
   - RLS 是否涵蓋新門市
   - admin 權限是否正確綁定

4. 規劃前端操作：
   - 後台新增門市頁面流程
   - 切換門市 context 方式
   - 服務項目管理

5. 確認通知設定：
   - LINE 官方帳號是否對應
   - 預約通知 template 是否各門市獨立
   - 提醒時間設定

6. 最後輸出：
   - 門市設定清單
   - SQL / migration 建議
   - RLS 規則確認
   - 前端操作步驟
   - 測試驗收清單
