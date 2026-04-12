# 討論稿歷程備份（Gemini／Monica 等與第四版對照）

> **用途**：保留「多版討論 → Cursor 對照 repo 修正」的脈絡。  
> **正式文件**請以 [`WEBSITE_FEATURES_FOR_LLM_REVIEW.md`](./WEBSITE_FEATURES_FOR_LLM_REVIEW.md)（第四版起）為準。

## 版本演進（摘要）

1. **初版～第三版**：功能總覽、安全優先級、LIFF／OTP 建議、外部自動化（n8n／Notion）、待確認表。
2. **第四版（repo 對照）**：新增 §0「與本 repo 現況對照」，將 **建議** 與 **已實作** 分開，避免 LLM 誤判（例如 LIFF、`bookings.line_user_id` 尚未落地）。

## 討論稿 vs Repo 核對（事實摘要）

| 項目 | 討論稿常見寫法 | Repo 現況 |
|------|----------------|-----------|
| LIFF | 易讀成已整合 | 未安裝 `@line/liff` |
| `line_user_id` | 建議入 `bookings` | `bookings` 目前無此欄 |
| OTP | 建議 | 未實作 |
| React Query | 曾標待確認 | **v5** |
| 預約寫入 | 曾標待確認 | **僅 POST `api-booking`**，無前端 insert |

## 後續開發優先級（共識參考，非承諾排期）

1. 後台密碼與 `api-admin` 強化（rate limit 等）  
2. LIFF 整合與 `bookings` 欄位 migration（連動）  
3. `/my-bookings`：LIFF 用 userId；非 LIFF 則 OTP 等  
4. `api-booking` 併發鎖定  
5. 後台中期改 Supabase Auth  

---

*此檔可隨專案迭代增補，不必與正式審查文件同步篇幅。*
