---
name: github-push
description: 規劃 Git commit、branch、PR 與合併流程
---

# /github-push

當使用者輸入 /github-push 時，請依序執行：

1. 先確認狀態：
   - 目前在哪個 branch
   - 哪些檔案有變更
   - 這次 commit 要做什麼事

2. 產出 commit message：
   - 格式：type(scope): 中文說明
   - type 選項：feat / fix / chore / refactor / docs / style / test
   - 範例：feat(booking): 新增候補名單通知功能

3. 確認是否需要開新 branch：
   - 如果是新功能 → feat/xxx
   - 如果是修 bug → fix/xxx
   - 如果是緊急修復 → hotfix/xxx

4. 說明推送步驟：
   - git add
   - git commit
   - git push origin branch-name

5. 確認是否需要開 PR：
   - PR 標題
   - PR 描述摘要
   - review 重點
   - merge 前確認項目

6. 最後輸出：
   - commit message 建議
   - branch 名稱建議
   - 推送指令
   - PR 描述草稿
