---
name: payment-setup
description: 規劃藍新或綠界金流串接、callback、訂單狀態與測試流程
---

# /payment-setup

當使用者輸入 /payment-setup 時，請依序執行：

1. 先確認金流目標：
   - 使用藍新還是綠界
   - 付款方式：信用卡、ATM、超商
   - 是否需要定期定額
   - 測試環境還是正式環境

2. 規劃串接流程：
   - 前端觸發付款
   - Supabase Edge Function 建立訂單
   - 金流 API 呼叫
   - callback / notify URL 設定
   - 付款成功 / 失敗處理

3. 規劃資料庫：
   - orders table 欄位
   - payment_status enum
   - transaction_id 儲存
   - 退款紀錄

4. 規劃 n8n 整合：
   - 付款成功後觸發通知
   - LINE 確認訊息
   - Supabase 更新預約狀態

5. 安全性確認：
   - callback 來源驗證
   - 金額防竄改
   - 敏感資訊不進前端
   - env 存放正確

6. 最後輸出：
   - 串接流程圖文字版
   - Edge Function 架構建議
   - 資料表設計
   - 測試案例清單
   - 上線前安全檢查
