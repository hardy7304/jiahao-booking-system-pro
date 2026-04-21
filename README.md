# Welcome to your Lovable project

## 文件與發行說明

- **`feature/saas-landing-dashboard` 詳細變更紀錄**（可複製到 Notion）：[`docs/RELEASE_NOTES_FEATURE_SAAS_LANDING_DASHBOARD.md`](./docs/RELEASE_NOTES_FEATURE_SAAS_LANDING_DASHBOARD.md)
- **全站功能總覽（給 LLM／審查用）**：[`docs/WEBSITE_FEATURES_FOR_LLM_REVIEW.md`](./docs/WEBSITE_FEATURES_FOR_LLM_REVIEW.md)（討論稿歷程備份：[`docs/WEBSITE_FEATURES_DISCUSSION_DRAFT.md`](./docs/WEBSITE_FEATURES_DISCUSSION_DRAFT.md)）
- 多租戶遷移計畫：[`docs/MULTI_TENANT_MIGRATION_PLAN.md`](./docs/MULTI_TENANT_MIGRATION_PLAN.md)
- **後台設定／LINE 與進階串接**（是否已有舊資料、可否暫時不填）：[`docs/ADMIN_SETTINGS.md`](./docs/ADMIN_SETTINGS.md)

## Supabase 免費版與 keepalive（GitHub Actions）

Supabase **免費專案**若長期沒有任何 API 流量，可能被標示為閒置並進入**休眠**；喚醒後通常可恢復，但會影響預約站與後台可用性。

本 repo 提供 **GitHub Actions** workflow（**不使用** Vercel cron、Next.js API routes）：定期以 **anon key** 呼叫 PostgREST，對專案發出最小讀取請求，作為 keepalive：

- Workflow 檔： [`.github/workflows/supabase-keepalive.yml`](./.github/workflows/supabase-keepalive.yml)
- 請求範例： `GET {SUPABASE_URL}/rest/v1/health_check?select=id&limit=1`
- Header：`apikey`、`Authorization: Bearer` 皆為 **同一個** anon key（與前端 `VITE_SUPABASE_ANON_KEY` 相同層級，僅能執行你已開放的 RLS／GRANT）。

### 1. 先建立 `health_check` 表

請在 Supabase 套用 migration（本機或 CI 依你慣例）：

- 檔案： [`supabase/migrations/20260416140000_health_check_keepalive.sql`](./supabase/migrations/20260416140000_health_check_keepalive.sql)

內容包含：`health_check` 表一筆資料、**RLS 啟用**、僅允許 **anon / authenticated 的 SELECT**（與 workflow 需求一致）。

### 2. 若你調整過 RLS

請維持 **anon 可對 `health_check` 做 SELECT**（migration 內 policy 名稱：`health_check_select_anon`）。若你自行重建 policy，請確認與 `GRANT SELECT` 一致，否則 workflow 會收到非 200。

### 3. GitHub Repository secrets

在 GitHub：**Settings → Secrets and variables → Actions → New repository secret**

| Secret 名稱 | 說明 |
|-------------|------|
| `SUPABASE_URL` | 專案 URL，例如 `https://xxxx.supabase.co`（**不要**尾隨斜線亦可；workflow 會去掉尾隨 `/`） |
| `SUPABASE_ANON_KEY` | Project **anon** `public` key（與 Dashboard → Settings → API 的 `anon` 一致） |

### 4. 手動測試 workflow

1. 推上含 workflow 的 branch 並合併到預設分支（若你只在預設分支跑 Actions）。
2. GitHub：**Actions** → **Supabase keepalive** → **Run workflow**（`workflow_dispatch`）。
3. 點進本次 run，展開 **Ping health_check (PostgREST)** 步驟，應看到 **`HTTP status: 200`** 與 JSON body；若非 200，該 job 會失敗。

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
