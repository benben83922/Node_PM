---
project: Node_PM
doc_type: ProjectStructure
status: draft
phase: planning
priority: high
owner: PM
updated: 2026-06-05
tags: [web-app, react, vite, project-structure, clean-architecture]
---

# 專案結構指南 (Project Structure Guide) - Node_PM Web App

---

**文件版本 (Document Version):** `v1.0`
**最後更新 (Last Updated):** `2026-06-05`
**主要作者 (Lead Author):** `技術負責人`
**狀態 (Status):** `活躍 (Active)`
**對應架構文件:** `Web_App_Architecture.md`
**對應模組規格:** `Web_App_Module_Spec_and_Tests.md`

---

## 目錄 (Table of Contents)

- [1. 指南目的](#1-指南目的)
- [2. 核心設計原則](#2-核心設計原則)
- [3. Repo 頂層結構](#3-repo-頂層結構)
- [4. 目錄詳解](#4-目錄詳解)
  - [4.1 `src/` — React 原始碼（Clean Architecture 分層）](#41-src--react-原始碼clean-architecture-分層)
  - [4.2 `src/lib/` — Domain Layer（純函式）](#42-srclib--domain-layer純函式)
  - [4.3 `src/hooks/` — Application Layer（React Hooks）](#43-srchooks--application-layerreact-hooks)
  - [4.4 `src/components/` — Presentation Layer（可複用元件）](#44-srccomponents--presentation-layer可複用元件)
  - [4.5 `src/pages/` — Presentation Layer（頁面元件）](#45-srcpages--presentation-layer頁面元件)
  - [4.6 `src/__tests__/` — 測試代碼](#46-src__tests__--測試代碼)
  - [4.7 `supabase/` — 資料庫 Schema 與 Migration](#47-supabase--資料庫-schema-與-migration)
  - [4.8 `.github/` — CI/CD 工作流程](#48-github--cicd-工作流程)
- [5. 檔案命名約定](#5-檔案命名約定)
- [6. 環境變數管理](#6-環境變數管理)
- [7. 關鍵路徑速查表](#7-關鍵路徑速查表)
- [8. 演進原則](#8-演進原則)

---

## 1. 指南目的

- 為 **Node_PM Web App**（React SPA + Supabase BaaS）提供標準化、可擴展的目錄與檔案結構
- 確保團隊成員能快速定位原始碼、設定檔、測試與文件，降低上手成本
- 將 Clean Architecture 的分層概念（Domain / Application / Infrastructure / Presentation）對應到 React + Vite 的實際目錄
- 明確 `service_role` key 與 `anon key` 的使用邊界，防止安全配置錯誤

---

## 2. 核心設計原則

| 原則 | 說明 | 本專案實踐 |
| :--- | :--- | :--- |
| **按角色分層 (Layer by Role)** | 依 Clean Architecture 四層組織 `src/`，而非按類型（controllers/models）分散 | `lib/` → `hooks/` → `components/` → `pages/` |
| **明確的職責 (Clear Responsibilities)** | 每個頂層目錄單一職責，邊界清楚 | `lib/` 只放純函式；`hooks/` 只放 React Hooks |
| **一致的命名 (Consistent Naming)** | 元件 PascalCase、工具函式 camelCase，目錄 kebab-case | 詳見第 5 節 |
| **配置外部化 (Externalized Config)** | 所有機密與環境相關值放 `.env.local`，絕不硬碼 | `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY` |
| **根目錄簡潔 (Clean Root)** | 根目錄只放專案級設定，原始碼在 `src/` | `vite.config.js`、`package.json` 等 |
| **安全邊界 (Security Boundary)** | `service_role` key 只在 GitHub Actions；前端只用 `anon key` | `.env.local` 在 `.gitignore` 中 |

---

## 3. Repo 頂層結構

```plaintext
node-pm-webapp/                 ← Repo 根目錄（建議獨立 repo）
│
├── .github/                    # GitHub Actions CI/CD 工作流程
│   └── workflows/
│       └── wbs_sync.yml        # WBS → Supabase 同步觸發（Python，見下方）
│
├── public/                     # Vite 靜態資源（直接複製到 dist/）
│   └── favicon.ico
│
├── src/                        # React 原始碼（Clean Architecture 分層）
│   ├── main.jsx                # React 應用進入點（ReactDOM.createRoot）
│   ├── App.jsx                 # 路由定義（React Router DOM v6）
│   ├── lib/                    # Domain Layer：純函式、SDK 客戶端
│   ├── hooks/                  # Application Layer：React Custom Hooks
│   ├── components/             # Presentation Layer：可複用 UI 元件
│   ├── pages/                  # Presentation Layer：頁面元件（對應路由）
│   ├── assets/                 # 圖示、字體等靜態資源（由 Vite 處理）
│   └── __tests__/              # 測試代碼（鏡像 src/ 目錄結構）
│
├── supabase/                   # Supabase 本地開發與 Schema 管理
│   ├── migrations/             # SQL Migration 檔案（版本控制）
│   └── seed.sql                # 開發用種子資料
│
├── docs/                       # 本專案設計文件（web_docs/）
│   └── web_docs/               # 六份 VibeCoding 設計文件
│
├── .env.example                # 環境變數範本（可提交，不含機密值）
├── .env.local                  # 本機實際環境變數（列入 .gitignore！）
├── .gitignore
├── index.html                  # Vite HTML 入口
├── vite.config.js              # Vite 設定（含 Vitest 測試設定）
├── tailwind.config.js          # Tailwind CSS 設定
├── package.json
└── README.md                   # 快速入門指南
```

> **注意：** `.env.local` 存放 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY`，**必須**列入 `.gitignore`。`service_role` key 只能存放於 GitHub Repository Secrets，任何情況下不得出現在此 repo 的任何檔案中。

---

## 4. 目錄詳解

### 4.1 `src/` — React 原始碼（Clean Architecture 分層）

```plaintext
src/
├── main.jsx                    # 進入點：StrictMode + AuthProvider + QueryClientProvider
├── App.jsx                     # 路由：React Router DOM v6 + RoleGuard 保護路由
│
├── lib/                        # ① Domain Layer
├── hooks/                      # ② Application Layer
├── components/                 # ③ Presentation Layer（可複用）
├── pages/                      # ③ Presentation Layer（頁面）
├── assets/
└── __tests__/
```

**Clean Architecture 依賴方向：**

```
pages/ → components/ → hooks/ → lib/supabaseClient.js
                    ↘ lib/progressCalc.js (Domain)
                    ↘ lib/healthCalc.js   (Domain)
```

規則：**下層不可 import 上層**。`lib/` 不 import `hooks/`；`hooks/` 不 import `pages/`。

---

### 4.2 `src/lib/` — Domain Layer（純函式）

**職責：** 零外部依賴的純函式，以及 Supabase SDK 客戶端初始化。此層可在 Node.js 環境（Vitest）直接測試，無需 DOM 或 mock。

```plaintext
src/lib/
├── supabaseClient.js           # Supabase 客戶端（唯一初始化點）
│                               #   import.meta.env.VITE_SUPABASE_URL
│                               #   import.meta.env.VITE_SUPABASE_ANON_KEY
│
├── progressCalc.js             # calcProgress(tasks) → number (0–100)
│                               #   BDD: Feature 10；TC: TC-PC-001 ~ TC-PC-006
│
├── healthCalc.js               # calcHealth(tasks, today?) → HealthStatus
│                               #   BDD: Feature 3；TC: TC-HC-001 ~ TC-HC-007
│
├── sCurveInterpolation.js      # interpolatePlannedRate(milestones, date) → number
│                               #   BDD: Feature 4；TC: TC-SC-001 ~ TC-SC-004
│
└── taskFilters.js              # filterOverdueTasks(tasks, today) → Task[]
                                # filterBlockedTasks(tasks) → Task[]
                                #   BDD: Feature 4；TC: TC-TF-001 ~ TC-TF-004
```

**範例（`supabaseClient.js`）：**
```javascript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

---

### 4.3 `src/hooks/` — Application Layer（React Hooks）

**職責：** 封裝 Supabase 查詢與認證邏輯，提供 React 元件使用的資料與狀態。使用 TanStack Query (`useQuery`) 管理快取與 loading 狀態。

```plaintext
src/hooks/
├── useAuth.js                  # 認證狀態：user、currentRole、loading
│                               #   signInWithGoogle()、signInWithEmail()、signOut()
│                               #   訂閱 supabase.auth.onAuthStateChange
│
├── useProjectList.js           # PM L1：所有可存取專案清單
│                               #   回傳：projects + 各自健康度（由 healthCalc 計算）
│
├── useProjectDiagnosis.js      # PM L2：單一專案診斷資料
│                               #   回傳：allTasks、overdueTasks、blockedTasks、milestones
│                               #   使用 filterOverdueTasks、filterBlockedTasks
│
├── useTaskDetail.js            # PM/Engineer L3：單一任務明細
│                               #   params: taskId
│
├── useMyTasks.js               # Engineer L1：個人跨專案待辦清單
│                               #   filter: assignee_email = currentUser.email
│                               #   order: deadline ASC NULLS LAST
│
├── useKanban.js                # Engineer L2：單一專案 Kanban 任務
│                               #   回傳：按 status 分組的任務（Todo/Doing/Done/Blocked）
│
├── useClientSummary.js         # Client L1：交付摘要（完成率 + 里程碑）
│                               #   使用 calcProgress()
│
└── useMilestones.js            # Client L2：里程碑 Roadmap 清單
                                #   order: planned_date ASC
```

**Hook 使用慣例：**
```javascript
// 所有 hooks 統一回傳格式（TanStack Query 風格）
const { data, isLoading, error } = useProjectList()
```

---

### 4.4 `src/components/` — Presentation Layer（可複用元件）

**職責：** 可跨頁面複用的 UI 元件，接收 props 渲染，不直接呼叫 Supabase SDK（資料由 hooks 傳入）。

```plaintext
src/components/
│
├── auth/
│   └── LoginForm.jsx           # Google OAuth / Email Magic Link 登入表單
│
├── common/                     # 通用 UI 元件
│   ├── RoleGuard.jsx           # RBAC 路由守衛（allowedRoles prop）
│   │                           #   BDD: Feature 2；TC: TC-RG-001 ~ TC-RG-004
│   ├── LoadingSpinner.jsx      # 全局 loading 狀態顯示
│   ├── ErrorBoundary.jsx       # 錯誤邊界（捕獲子元件 runtime error）
│   └── EmptyState.jsx          # 空資料狀態顯示元件
│
├── dashboard/                  # PM 儀表板專用元件
│   ├── HealthBadge.jsx         # 🟢🟡🔴 健康度燈號徽章
│   │                           #   props: status ('normal'|'warning'|'critical')
│   ├── SCurveChart.jsx         # S-Curve 折線圖（Recharts LineChart）
│   │                           #   props: milestones, tasks, today
│   └── BlockersList.jsx        # Blocked 任務清單（含 updated_at 排序）
│
├── progress/                   # 進度相關元件
│   ├── ProgressRing.jsx        # 圓環完成率（客戶 L1 核心元件）
│   │                           #   props: done, total
│   └── MilestoneCountdown.jsx  # 里程碑倒數計日（PM L1 使用）
│
├── kanban/                     # Kanban 看板元件
│   ├── KanbanBoard.jsx         # 四欄看板容器
│   └── TaskCard.jsx            # 單一任務卡片（含 status、assignee、deadline）
│
└── roadmap/                    # 客戶路線圖元件
    └── MilestoneTimeline.jsx   # 里程碑時間軸（含完成/逾期樣式）
```

---

### 4.5 `src/pages/` — Presentation Layer（頁面元件）

**職責：** 對應路由的頁面元件，負責呼叫 hooks 取得資料並組合元件。依三個角色分資料夾。

```plaintext
src/pages/
│
├── LoginPage.jsx               # 登入頁（Google OAuth + Email Magic Link）
├── ForbiddenPage.jsx           # 403 頁（RoleGuard 拒絕後的 fallback）
├── AuthCallbackPage.jsx        # OAuth 回跳處理（/auth/callback 路由）
│
├── pm/                         # PM 角色頁面
│   ├── PortfolioPage.jsx       # L1：專案組合總覽（健康度燈號 + 里程碑倒數）
│   ├── DiagnosisPage.jsx       # L2：專案診斷（S-Curve + Overdue + Blocked 清單）
│   └── TaskDetailPage.jsx      # L3：任務執行明細（完整屬性 + 原始 YAML）
│
├── engineer/                   # 工程師角色頁面
│   ├── TodoPage.jsx            # L1：今日戰場（跨專案個人待辦清單）
│   ├── KanbanPage.jsx          # L2：技術上下文（專案 Kanban 視圖）
│   └── TaskDetailPage.jsx      # L3：任務詳情（重用 pm/TaskDetailPage 或獨立）
│
└── client/                     # 客戶角色頁面
    ├── SummaryPage.jsx         # L1：交付摘要（完成率圓環 + 里程碑清單）
    └── RoadmapPage.jsx         # L2：功能路徑圖（里程碑時間軸）
```

**路由對應（`App.jsx` 定義）：**

```javascript
// 路由結構（React Router DOM v6）
<Routes>
  <Route path="/login"         element={<LoginPage />} />
  <Route path="/auth/callback" element={<AuthCallbackPage />} />
  <Route path="/forbidden"     element={<ForbiddenPage />} />

  {/* PM 路由 */}
  <Route path="/pm" element={<RoleGuard allowedRoles={['admin']}><Outlet /></RoleGuard>}>
    <Route index            element={<PortfolioPage />} />
    <Route path=":projectId" element={<DiagnosisPage />} />
    <Route path="tasks/:taskId" element={<TaskDetailPage />} />
  </Route>

  {/* 工程師路由 */}
  <Route path="/engineer" element={<RoleGuard allowedRoles={['admin','developer']}><Outlet /></RoleGuard>}>
    <Route index            element={<TodoPage />} />
    <Route path=":projectId/kanban" element={<KanbanPage />} />
    <Route path="tasks/:taskId"     element={<TaskDetailPage />} />
  </Route>

  {/* 客戶路由（Viewer 不可存取 tasks/:taskId）*/}
  <Route path="/client" element={<RoleGuard allowedRoles={['admin','developer','viewer']}><Outlet /></RoleGuard>}>
    <Route path=":projectId"         element={<SummaryPage />} />
    <Route path=":projectId/roadmap" element={<RoadmapPage />} />
  </Route>
</Routes>
```

---

### 4.6 `src/__tests__/` — 測試代碼

**職責：** 測試代碼鏡像 `src/` 目錄結構，使用 Vitest + React Testing Library。

```plaintext
src/__tests__/
│
├── setup.js                    # 全局測試 setup（import @testing-library/jest-dom）
│
├── lib/                        # Domain Layer 單元測試（無 DOM，最快）
│   ├── progressCalc.test.js    # TC-PC-001 ~ TC-PC-006（6 個測試）
│   ├── healthCalc.test.js      # TC-HC-001 ~ TC-HC-007（7 個測試）
│   ├── sCurveInterpolation.test.js  # TC-SC-001 ~ TC-SC-004（4 個測試）
│   └── taskFilters.test.js     # TC-TF-001 ~ TC-TF-004（4 個測試）
│
├── hooks/                      # Application Layer Hook 測試（mock Supabase SDK）
│   ├── useAuth.test.js         # TC-AU-001 ~ TC-AU-003（3 個測試）
│   ├── useProjectList.test.js
│   └── useMyTasks.test.js
│
└── components/                 # Presentation Layer 元件測試（jsdom 環境）
    ├── RoleGuard.test.jsx      # TC-RG-001 ~ TC-RG-004（4 個測試）
    ├── HealthBadge.test.jsx
    └── ProgressRing.test.jsx
```

**Vitest 設定（`vite.config.js` 整合）：**

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    globals: true,
    coverage: {
      include: ['src/lib/**', 'src/hooks/**', 'src/components/**'],
      reporter: ['text', 'html']
    }
  }
})
```

---

### 4.7 `supabase/` — 資料庫 Schema 與 Migration

**職責：** 版本控制 Supabase PostgreSQL Schema，供本機開發（Supabase CLI）與 Production（Supabase Dashboard）使用。

```plaintext
supabase/
│
├── migrations/
│   ├── 20260501000000_create_base_tables.sql   # 建立 projects、profiles、project_access、
│   │                                           # tasks_sync、milestones 五張資料表
│   └── 20260501000001_create_rls_policies.sql  # 所有 RLS Policy（依 project_access 角色過濾）
│
└── seed.sql                    # 開發用種子資料（測試專案、成員、任務）
```

**Supabase CLI 本機開發指令：**

```bash
# 啟動本機 Supabase（PostgreSQL + Auth + REST API）
npx supabase start

# 套用最新 Migration
npx supabase db push

# 建立新 Migration
npx supabase migration new add_new_column

# 停止本機 Supabase
npx supabase stop
```

**Migration 命名規則：** `{timestamp}_{snake_case_description}.sql`

---

### 4.8 `.github/` — CI/CD 工作流程

**職責：** GitHub Actions 工作流程設定，包含 WBS 同步（寫入 Supabase）與 Vercel 自動部署。

```plaintext
.github/
└── workflows/
    ├── wbs_sync.yml            # WBS → Supabase 同步工作流程
    │                           #   觸發：push 到 main，且 WBS.md 有變更
    │                           #   執行：Python 腳本解析 WBS.md → upsert tasks_sync、milestones
    │                           #   使用：SUPABASE_SERVICE_ROLE_KEY（GitHub Secret）
    │                           #   ⚠️ service_role key 只在此工作流程使用，絕不放入 src/
    │
    └── ci.yml                  # (選填) PR 自動執行 Vitest 測試
                                #   觸發：PR 開啟或更新
                                #   執行：npm ci && npx vitest run
```

**`wbs_sync.yml` 關鍵設定：**

```yaml
name: WBS → Supabase Sync
on:
  push:
    branches: [main]
    paths:
      - '**/WBS.md'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install supabase python-frontmatter
      - run: python scripts/wbs_sync.py
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

---

## 5. 檔案命名約定

| 檔案類型 | 命名規則 | 範例 |
| :--- | :--- | :--- |
| **React 元件** | `PascalCase.jsx` | `HealthBadge.jsx`, `RoleGuard.jsx` |
| **React 頁面** | `PascalCase.jsx`（加 `Page` 後綴） | `PortfolioPage.jsx`, `LoginPage.jsx` |
| **React Hooks** | `camelCase.js`（加 `use` 前綴） | `useAuth.js`, `useProjectList.js` |
| **純函式工具** | `camelCase.js` | `progressCalc.js`, `healthCalc.js` |
| **測試檔案** | 對應檔案加 `.test.js` / `.test.jsx` | `progressCalc.test.js`, `RoleGuard.test.jsx` |
| **目錄** | `kebab-case` 或 `camelCase`（小寫） | `components/`, `__tests__/`, `pm/` |
| **SQL Migration** | `{timestamp}_{snake_case}.sql` | `20260501000000_create_base_tables.sql` |
| **Markdown 文件** | `PascalCase_描述.md`（本專案慣例） | `Web_App_PRD.md`, `Web_App_BDD.md` |
| **環境變數** | `SCREAMING_SNAKE_CASE`，前綴 `VITE_`（Vite 曝光） | `VITE_SUPABASE_URL` |
| **GitHub Secret** | `SCREAMING_SNAKE_CASE`（無前綴，不曝光於前端） | `SUPABASE_SERVICE_ROLE_KEY` |

---

## 6. 環境變數管理

### 6.1 `.env.example`（可提交至 Git）

```bash
# .env.example — 範本，提交至 Git，不含機密值
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### 6.2 `.env.local`（禁止提交至 Git）

```bash
# .env.local — 本機實際值，列入 .gitignore
VITE_SUPABASE_URL=https://xyzxyzxyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6.3 GitHub Repository Secrets（CI/CD 使用）

| Secret 名稱 | 使用者 | 說明 |
| :--- | :--- | :--- |
| `SUPABASE_URL` | GitHub Actions (`wbs_sync.yml`) | Supabase 專案 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Actions (`wbs_sync.yml`) | **絕對機密**，繞過 RLS 寫入，前端永遠不可使用 |
| `VERCEL_TOKEN` | GitHub Actions（選填，若手動部署） | Vercel 部署 token |

### 6.4 Vercel 環境變數（Production 部署）

在 Vercel Dashboard → Settings → Environment Variables 設定：

| 變數名稱 | 值 | 環境 |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase 專案 URL | Production / Preview |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Production / Preview |

> **安全提醒：** `VITE_` 前綴的變數會被 Vite 打包進前端 bundle，在瀏覽器 DevTools 中可見。這是預期行為（`anon key` 受 RLS 保護），但 `service_role` key **絕不可**設定為 `VITE_` 前綴的變數。

---

## 7. 關鍵路徑速查表

| 我想找... | 去哪個檔案 |
| :--- | :--- |
| 完成率計算邏輯 | `src/lib/progressCalc.js` |
| 健康度燈號判斷邏輯 | `src/lib/healthCalc.js` |
| S-Curve 計畫線插值 | `src/lib/sCurveInterpolation.js` |
| Supabase 客戶端初始化 | `src/lib/supabaseClient.js` |
| 認證狀態（登入/登出/角色） | `src/hooks/useAuth.js` |
| PM L1 頁面的資料 | `src/hooks/useProjectList.js` |
| PM L2 頁面的資料（含 Overdue/Blocked） | `src/hooks/useProjectDiagnosis.js` |
| 工程師個人待辦 | `src/hooks/useMyTasks.js` |
| RBAC 角色守衛元件 | `src/components/common/RoleGuard.jsx` |
| 健康度燈號 UI 元件 | `src/components/dashboard/HealthBadge.jsx` |
| 完成率圓環 UI 元件 | `src/components/progress/ProgressRing.jsx` |
| PM L1 頁面 | `src/pages/pm/PortfolioPage.jsx` |
| PM L2 頁面 | `src/pages/pm/DiagnosisPage.jsx` |
| 工程師 Kanban 頁面 | `src/pages/engineer/KanbanPage.jsx` |
| 客戶摘要頁面 | `src/pages/client/SummaryPage.jsx` |
| 路由定義 | `src/App.jsx` |
| Supabase Schema SQL | `supabase/migrations/` |
| WBS 同步 GitHub Actions | `.github/workflows/wbs_sync.yml` |
| 所有 Domain 單元測試 | `src/__tests__/lib/` |
| RoleGuard 測試 | `src/__tests__/components/RoleGuard.test.jsx` |

---

## 8. 演進原則

- 本結構為 **Phase 5 MVP** 起點，應隨專案演進調整
- 任何頂層目錄的重大新增或移動，須在 `Web_App_ADR.md` 補充對應 ADR
- **新增元件時的決策樹：**

```
是否跨多個頁面複用？
  ├─ 是 → 放 src/components/
  └─ 否 → 可暫放於對應 page 檔案中，待複用需求出現再提取

是否含有副作用（API 呼叫、狀態管理）？
  ├─ 是 → 邏輯放 src/hooks/，UI 邏輯放 src/components/
  └─ 否（純計算）→ 放 src/lib/

是否為特定角色（PM/Engineer/Client）專用頁面？
  ├─ 是 → 放 src/pages/{role}/
  └─ 否（通用頁面如 Login/Forbidden）→ 放 src/pages/
```

- **何時需要更新本文件：**
  - 新增重要目錄（如 `src/stores/` for Zustand、`src/context/` for React Context）
  - 命名約定變更（需團隊共識）
  - 測試工具或框架替換

---

**文件審核記錄:**

| 日期       | 審核人 | 版本 | 變更摘要 |
| :--------- | :----- | :--- | :------- |
| 2026-06-05 | PM     | v1.0 | 初稿提交 |
