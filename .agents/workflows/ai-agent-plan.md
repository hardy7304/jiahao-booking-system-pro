---
name: ai-agent-plan
description: 規劃 AI agent 任務、MCP 工具串接、prompt 設計與 n8n 整合
---

# /ai-agent-plan

當使用者輸入 /ai-agent-plan 時，請依序執行：

1. 先確認 AI 任務目標：
   - 這個 agent 要做什麼
   - 輸入來源是什麼
   - 輸出結果要給誰用
   - 是單次任務還是持續運行

2. 決定架構：
   - 用 n8n AI Agent 節點
   - 還是 Supabase Edge Function 呼叫 Claude/Gemini API
   - 還是 Antigravity MCP 工具串接
   - 是否需要 subagent 或 multi-step chain

3. 設計 prompt：
   - system prompt 定義角色與限制
   - user prompt 格式
   - 輸出格式要求（JSON / Markdown / 純文字）
   - few-shot 範例

4. 規劃 MCP 工具：
   - 需要哪些 MCP tool（Supabase、Notion、Google Calendar、n8n）
   - tool 呼叫條件與參數
   - 錯誤處理

5. 規劃 n8n 整合：
   - 觸發來源
   - AI 節點設定
   - 輸出如何後處理
   - 結果如何回傳（LINE / Supabase / Notion）

6. 最後輸出：
   - agent 架構圖文字版
   - prompt 草稿
   - MCP tool 清單
   - n8n workflow 節點建議
   - 測試案例與風險評估
