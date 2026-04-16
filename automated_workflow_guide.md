# 🧩 `jiahao-booking-system-pro` 自動化 Agent 工作流程指南

本文件旨在說明如何為 `jiahao-booking-system-pro` 專案建構與運用基於 **Cursor + Claude Code CLI** 的自動化 Agent 工作流程。此架構旨在將「短時間 IDE 互動」與「長時間 CLI 執行」分離，以提升開發效率並支援複雜的、跨多個技術棧（React, Supabase, n8n, LINE Bot）的專案開發。

## 1. 架構概述

此自動化工作流程的核心是 **Orchestrator Agent** 協調多個 **子 Agent** 共同完成任務。Orchestrator 負責任務的拆解、分配、進度追蹤與結果整合，而子 Agent 則專注於特定技術領域的開發工作。

### 1.1 角色定位

| **工具/角色** | **角色定位** | **說明** |
|---|---|---|
| **Cursor IDE** | 視覺化編輯器 + 短任務 Agent | 用於初始規劃、To-do 清單確認、以及最終的程式碼審查 (Review diff)。 |
| **Claude Code CLI** | 長時間執行引擎 + 多 Agent 協調器 | 在背景執行長時間任務，Orchestrator Agent 在此環境下協調各子 Agent 工作。 |
| **Orchestrator Agent** | 任務總管與協調者 | 負責接收高層次任務，拆解為子任務，並分配給對應的子 Agent 執行。 |
| **子 Agent** | 專業領域執行者 | 專注於特定技術棧的開發，例如前端、後端、n8n 工作流、LINE Bot。 |

## 2. Agent 設定檔

所有 Agent 的設定檔都位於專案根目錄下的 `.claude/agents/` 目錄中。每個 `.md` 檔案定義了一個子 Agent 的行為。

### 2.1 子 Agent 列表與職責

本專案已配置以下子 Agent：

| **Agent 名稱** | **職責描述** | **模型** | **允許工具** | **權限模式** |
|---|---|---|---|---|
| `frontend-agent` | 負責 React 前端使用者介面 (UI) 的開發、優化與維護。 | `gemini-2.5-flash` | `file.read`, `file.write`, `file.edit`, `shell.exec` | `auto` |
| `backend-agent` | 負責 Express/Drizzle/Supabase 後端 API 的開發、資料庫互動、業務邏輯實作與安全性維護。 | `gemini-2.5-flash` | `file.read`, `file.write`, `file.edit`, `shell.exec` | `auto` |
| `n8n-agent` | 負責 n8n 自動化工作流程的設計、實作與維護，包含與外部服務的整合（如 LINE Messaging API、Supabase 等）。 | `gemini-2.5-flash` | `file.read`, `file.write`, `file.edit`, `shell.exec` | `auto` |
| `line-bot-agent` | 負責 LINE Bot 的開發、訊息處理、Flex Message 設計與 Messaging API 整合。 | `gemini-2.5-flash` | `file.read`, `file.write`, `file.edit`, `shell.exec` | `auto` |

### 2.2 權限控制

每個子 Agent 的 `permissionMode` 預設為 `auto`，表示 Agent 可以自動執行 `allowedTools` 中列出的操作。對於敏感操作（例如 `git commit`, `git push`, 安裝套件），建議將 `permissionMode` 設定為 `manual`，以要求人工確認。

## 3. Orchestrator Prompt 範本

Orchestrator Agent 的指令範本位於 `.claude/orchestrator_prompt.md`。此範本定義了 Orchestrator 的角色、子 Agent 列表、執行流程和重要原則。

以下是 Orchestrator Prompt 的內容：

```markdown
你是 Orchestrator，負責協調以下子 Agent 完成 `jiahao-booking-system-pro` 專案的開發與維護任務。你的目標是確保專案的各個部分（前端、後端、n8n 工作流、LINE Bot）能夠協同運作，並達成指定的開發目標。

**子 Agent 列表：**
- `frontend-agent`: 負責 React 前端開發。
- `backend-agent`: 負責 Express/Drizzle/Supabase 後端開發。
- `n8n-agent`: 負責 n8n 自動化工作流程開發。
- `line-bot-agent`: 負責 LINE Bot 相關功能開發。

**執行流程：**
1. **任務分析與規劃：** 仔細分析收到的任務需求，並將其拆解為可執行的子任務清單 (To-do list)。
2. **子任務分配：** 根據子任務的性質，將其分配給最適合的子 Agent 執行。允許並行處理。
3. **進度追蹤與協調：** 持續追蹤各子 Agent 的執行進度，並在必要時進行協調，解決依賴關係或衝突。
4. **測試與驗證：** 在每個主要階段或功能開發完成後，協調 `backend-agent` 或 `frontend-agent` 執行相關測試，確保功能正確性與穩定性。
5. **結果整合與報告：** 整合各子 Agent 的工作成果，並準備最終的成果報告或提交建議。

**重要原則：**
- **清晰溝通：** 與子 Agent 溝通時，請提供清晰、具體的指令和預期結果。
- **權限管理：** 嚴格遵守各子 Agent 的 `allowedTools` 和 `permissionMode` 設定。
- **迭代開發：** 鼓勵小步快跑，逐步完成複雜任務。
- **問題解決：** 當遇到問題時，嘗試診斷問題根源，並協調相關 Agent 共同解決。

**範例任務指令：**
```
目標：為 `jiahao-booking-system-pro` 專案實作一個新的「商家公開預約流程」功能，包括前端介面、後端 API、n8n 預約通知工作流，以及 LINE Bot 的預約確認訊息。

請依序：
1. 掃描專案 codebase，輸出高層次設計與 To-do 清單。
2. 將 To-do 分配給對應子 Agent（允許並行）。
3. 每個子 Agent 完成後，協調進行整合測試。
4. 重複直到所有 To-do 完成，並確保所有測試通過。
5. 最終提交一個包含所有修改的 Pull Request。
```
```

## 4. 如何使用此自動化工作流程

1. **啟動 Claude Code CLI：** 在您的開發環境中，使用 Claude Code CLI 啟動 Orchestrator Agent，並將 `.claude/orchestrator_prompt.md` 作為其主要指令。
2. **提供任務指令：** 向 Orchestrator Agent 提供高層次的任務指令，例如上述範例中的「實作商家公開預約流程」。
3. **監控與介入：** 監控 Agent 的執行進度。雖然 Agent 會自動執行，但在關鍵決策點或遇到複雜問題時，您可能需要介入提供指導或確認。
4. **程式碼審查：** Agent 完成任務後，使用 Cursor IDE 審查其生成的程式碼變更，確保品質並進行必要的調整。

## 5. 結論

這套自動化 Agent 工作流程旨在將重複性高、耗時長的開發任務交由 AI 處理，讓開發者能更專注於高層次的設計與決策。透過清晰的角色定義、模組化的 Agent 設定與明確的 Orchestrator 指令，您可以有效地利用 AI 提升 `jiahao-booking-system-pro` 專案的開發效率與品質。
