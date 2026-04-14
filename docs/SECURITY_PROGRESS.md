# 安全相關進度

## 已完成

- [x] 前端移除 `DEFAULT_ADMIN_PASSWORD` hardcode
- [x] `adminPasswordFromDb` 改用 `null` 防呆（`maybeSingle()`、`isAdminPasswordReady`）
- [x] Edge Function 移除 `"bulaosong2024"` fallback（無設定時回傳 401）

## 延後處理

- [ ] `sessionStorage` 改存後端 session token（需先建立 session 機制）
- [ ] `api-admin` rate limiting（獨立 PR）

## 未來 Roadmap

- [ ] 後端核發 JWT session token
- [ ] 前端只存 token，不存任何密碼相關資訊
