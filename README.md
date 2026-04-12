# Welcome to your Lovable project

## 文件與發行說明

- **`feature/saas-landing-dashboard` 詳細變更紀錄**（可複製到 Notion）：[`docs/RELEASE_NOTES_FEATURE_SAAS_LANDING_DASHBOARD.md`](./docs/RELEASE_NOTES_FEATURE_SAAS_LANDING_DASHBOARD.md)
- **全站功能總覽（給 LLM／審查用）**：[`docs/WEBSITE_FEATURES_FOR_LLM_REVIEW.md`](./docs/WEBSITE_FEATURES_FOR_LLM_REVIEW.md)（討論稿歷程備份：[`docs/WEBSITE_FEATURES_DISCUSSION_DRAFT.md`](./docs/WEBSITE_FEATURES_DISCUSSION_DRAFT.md)）
- 多租戶遷移計畫：[`docs/MULTI_TENANT_MIGRATION_PLAN.md`](./docs/MULTI_TENANT_MIGRATION_PLAN.md)
- **後台設定／LINE 與進階串接**（是否已有舊資料、可否暫時不填）：[`docs/ADMIN_SETTINGS.md`](./docs/ADMIN_SETTINGS.md)

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
