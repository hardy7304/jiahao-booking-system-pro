---
name: line-flow
description: 規劃 LINE webhook、通知訊息、事件流與錯誤處理
---

# /line-flow

當使用者輸入 /line-flow 時，請依序執行：

1. 先確認目標：
   - 這個 LINE 流程是做什麼用
   - 使用者是誰
   - 觸發來源是 webhook、排程、按鈕、表單，還是 n8n

2. 蒐集必要資訊：
   - 輸入資料來源
   - 需要發送的訊息類型
   - 是否需要回覆訊息或主動推播
   - 是否要寫回 Supabase 或 Google Sheets

3. 將需求拆成流程節點：
   - Trigger
   - Validation
   - Business logic
   - Message generation
   - Delivery
   - Logging

4. 指出需要的服務與元件：
   - LINE webhook
   - n8n
   - Supabase Edge Function
   - Database table
   - Scheduler
   - Retry 機制

5. 列出可能風險：
   - 重複通知
   - webhook 驗證失敗
   - token 過期
   - 訊息格式錯誤
   - 用戶狀態不同步

6. 最後輸出：
   - 流程摘要
   - 事件流程圖文字版
   - 需要建立的 API / function / table
   - 測試清單
   - 建議實作順序

如果資訊不足，先提問再規劃，不要直接假設。
這個 workflow 最適合你目前的 LINE 通知、提醒、Webhook 整合工作。
