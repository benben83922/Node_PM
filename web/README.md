# Node PM — Web App

React SPA + Supabase BaaS 三角色專案進度儀表板。

## 架構

```
WBS.md → GitHub Actions (Python) → Supabase PostgreSQL ← React SPA (Vercel)
```

- **前端**: React 18 + Vite + TailwindCSS + TanStack Query + Recharts
- **後端**: Supabase (PostgreSQL + Auth + Row Level Security)
- **CI/CD**: GitHub Actions → Vercel

## 本地開發

```bash
cp .env.local.example .env.local   # 填入 Supabase URL 和 anon key
npm install
npm run dev        # http://localhost:5173
npm run test       # vitest unit tests
npm run build      # production build check
```

### 環境變數

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

> **.env.local 不會 commit 到 git。** service_role key 僅存放在 GitHub Repository Secrets。

## 三角色權限

| 角色 | 路由 | 功能 |
|------|------|------|
| admin (PM) | `/pm` | 全覽 + S 曲線 + 卡關清單 |
| developer (工程師) | `/engineer` | 個人看板 + 燃盡圖 |
| viewer (客戶) | `/client` | 里程碑時間軸 + 完成率圓餅 |

## 資料同步

推送包含 `WBS.md` 的 commit 到 `main` 分支，GitHub Actions 自動執行：

```bash
python scripts/sync_wbs_to_supabase.py
```

所需 Secrets：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`

## 部署

連結 Vercel 專案並設定環境變數：

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Vercel 會在每次 push 時自動部署。
