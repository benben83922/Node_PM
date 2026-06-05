---
project: Node_PM
doc_type: API
status: draft
phase: planning
priority: high
owner: PM
updated: 2026-06-05
tags: [web-app, api, supabase, rest, postgrest]
---

# API 設計規範 (API Design Specification) - Node_PM Web App / Supabase REST API

---

**文件版本 (Document Version):** `v1.0`
**最後更新 (Last Updated):** `2026-06-05`
**主要作者 (Lead Author):** `PM`
**審核者 (Reviewers):** `技術負責人`
**狀態 (Status):** `草稿 (Draft)`
**對應架構文件:** `Web_App_Architecture.md`
**對應 Schema 文件:** `docs/核心功能/Supabase_Schema設計規格書.md`

---

## 目錄 (Table of Contents)

1. [引言](#1-引言-introduction)
2. [設計原則與約定](#2-設計原則與約定)
3. [認證與授權](#3-認證與授權)
4. [通用 API 行為](#4-通用-api-行為)
5. [錯誤處理](#5-錯誤處理)
6. [安全性考量](#6-安全性考量)
7. [API 端點詳述](#7-api-端點詳述)
   - [7.1 Auth — 認證端點](#71-auth--認證端點)
   - [7.2 Projects — 專案](#72-projects--專案)
   - [7.3 Tasks — 任務](#73-tasks--任務)
   - [7.4 Milestones — 里程碑](#74-milestones--里程碑)
   - [7.5 Project Access — 成員管理（Admin 專用）](#75-project-access--成員管理admin-專用)
   - [7.6 Profiles — 用戶資料](#76-profiles--用戶資料)
8. [資料模型 / Schema 定義](#8-資料模型--schema-定義)
9. [SDK 呼叫速查表](#9-sdk-呼叫速查表)
10. [附錄](#10-附錄)

---

## 1. 引言 (Introduction)

### 1.1 目的

本文件定義 Node_PM Web App 前端（React SPA）與 Supabase 後端之間的所有資料介面契約，包含：
- Supabase Auth API（認證）
- Supabase REST API / PostgREST（資料查詢，自動由 PostgreSQL schema 生成）

前端透過 `@supabase/supabase-js` SDK 呼叫上述 API，本文件以 SDK 語法為主，並附原始 HTTP 請求格式供參考。

### 1.2 目標讀者

- 前端工程師（React SPA 開發者）
- 測試工程師（驗收 BDD Scenarios）
- PM（確認 API 行為與業務需求一致）

### 1.3 快速入門

**環境變數設定（`.env.local`）：**

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**初始化 Supabase 客戶端：**

```javascript
// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

**驗證連線（取得 session）：**

```javascript
const { data: { session }, error } = await supabase.auth.getSession()
console.log(session) // null 表示未登入
```

---

## 2. 設計原則與約定

### 2.1 API 風格

- **風格：** Supabase PostgREST（自動從 PostgreSQL schema 生成 RESTful API）
- **底層協議：** REST over HTTPS；前端透過 `@supabase/supabase-js` SDK 封裝呼叫
- **授權模型：** Supabase Auth JWT + Row Level Security（RLS）在資料庫層強制執行

### 2.2 基本 URL

| 環境 | URL |
| :--- | :--- |
| **Production** | `https://<project-ref>.supabase.co` |
| **Local Dev** | `http://localhost:54321`（Supabase CLI 本機模擬） |

PostgREST 資料 API 路徑：`{BASE_URL}/rest/v1/{table_name}`
Auth API 路徑：`{BASE_URL}/auth/v1/{endpoint}`

### 2.3 請求與回應格式

- 格式：`application/json`（UTF-8 編碼）
- Supabase SDK 自動設定 `Content-Type` 與 `Authorization` Header

### 2.4 標準 HTTP Headers（Supabase 自動管理）

| Header | 說明 |
| :--- | :--- |
| `apikey` | Supabase `anon` key（SDK 自動帶入） |
| `Authorization: Bearer <JWT>` | 登入後由 Supabase Auth 發放的 JWT（SDK 自動帶入） |
| `Content-Type: application/json` | 請求格式 |
| `Prefer: return=representation` | 要求 Supabase 回傳 upsert 後的完整資料 |

### 2.5 命名約定

| 元素 | 約定 | 範例 |
| :--- | :--- | :--- |
| 資料表名稱 | `snake_case` 複數 | `tasks_sync`, `project_access` |
| 欄位名稱 | `snake_case` | `external_id`, `assignee_email` |
| 查詢參數 | `snake_case` | `project_id=eq.xxx` |
| SDK 方法 | camelCase | `.select()`, `.eq()`, `.order()` |

### 2.6 日期與時間格式

| 類型 | 格式 | 範例 |
| :--- | :--- | :--- |
| 日期（`DATE`） | `YYYY-MM-DD` | `"2026-05-10"` |
| 時間戳（`TIMESTAMPTZ`） | ISO 8601 UTC | `"2026-06-05T10:00:00Z"` |

---

## 3. 認證與授權

### 3.1 認證機制

**Supabase Auth 提供兩種登入方式：**

| 方式 | 適用對象 | 說明 |
| :--- | :--- | :--- |
| **Google OAuth** | PM / 工程師 | 點擊後跳轉 Google 授權頁，完成後回跳 App |
| **Email Magic Link** | 客戶（Viewer） | 輸入 Email → 收信點擊連結 → 自動登入，無需密碼 |

**JWT 生命週期：**

| 項目 | 說明 |
| :--- | :--- |
| `access_token` | 有效期 1 小時，SDK 自動 refresh |
| `refresh_token` | 有效期 60 天，存於 `localStorage` |
| `auth.uid()` | JWT 中的用戶 UUID，用於 RLS Policy |

### 3.2 授權模型

**三角色 RBAC（透過 `project_access` 表 + Supabase RLS 實現）：**

| 角色 | `project_access.role` | 可存取專案 | 可存取層級 | 寫入權限 |
| :--- | :--- | :--- | :--- | :--- |
| **Admin（PM）** | `admin` | 所有被分配專案 | L1 / L2 / L3（完整） | 可管理 `project_access` |
| **Developer（工程師）** | `developer` | 被分配的專案 | L1 / L2 / L3（技術視圖） | 無（唯讀） |
| **Viewer（客戶）** | `viewer` | 被分配的專案 | L1 / L2（摘要） | 無（唯讀） |

**RLS 工作機制：**

```
用戶登入 → 取得 JWT（含 auth.uid()）
    ↓
前端帶 JWT 查詢 Supabase API
    ↓
PostgreSQL RLS Policy 驗證：
  SELECT project_id FROM project_access WHERE user_id = auth.uid()
    ↓
只回傳用戶有權限的資料列
```

---

## 4. 通用 API 行為

### 4.1 分頁（Supabase Range Header）

Supabase PostgREST 使用 `Range` Header 實作分頁：

```javascript
// 取第 0–49 筆（50 筆）
const { data, count } = await supabase
  .from('tasks_sync')
  .select('*', { count: 'exact' })
  .range(0, 49)
```

**本系統預設不分頁（任務數 < 1,000 筆），如需分頁以上述方式實作。**

### 4.2 排序

```javascript
// 依 deadline 升冪（NULL 排最後）
.order('deadline', { ascending: true, nullsFirst: false })

// 依 updated_at 降冪
.order('updated_at', { ascending: false })
```

### 4.3 過濾

| 過濾條件 | SDK 語法 | 說明 |
| :--- | :--- | :--- |
| 等於 | `.eq('status', 'Todo')` | `status = 'Todo'` |
| 不等於 | `.neq('status', 'Done')` | `status != 'Done'` |
| 小於 | `.lt('deadline', today)` | `deadline < today` |
| IN 清單 | `.in('status', ['Todo','Doing'])` | `status IN (...)` |
| IS NULL | `.is('deadline', null)` | `deadline IS NULL` |
| IS NOT NULL | `.not('deadline', 'is', null)` | `deadline IS NOT NULL` |

### 4.4 欄位選取（部分回應）

```javascript
// 只選取需要的欄位，減少傳輸量
.select('id, external_id, title, status, deadline, assignee_email')
```

### 4.5 JOIN（關聯擴展）

```javascript
// 查詢 tasks_sync 同時帶入 projects.name
.select('*, projects(name)')
```

### 4.6 Upsert 冪等性（GitHub Actions 使用，非前端）

```javascript
// service_role key 寫入，on_conflict 保冪等
await supabase
  .from('tasks_sync')
  .upsert(tasks, { onConflict: 'project_id,external_id' })
```

---

## 5. 錯誤處理

### 5.1 Supabase 錯誤回應格式

```json
{
  "code": "PGRST301",
  "details": null,
  "hint": null,
  "message": "JWT expired"
}
```

### 5.2 HTTP 狀態碼對照

| 狀態碼 | 場景 | 前端處理建議 |
| :--- | :--- | :--- |
| `200 OK` | 查詢成功 | 渲染資料 |
| `201 Created` | 新增成功 | 更新本地狀態 |
| `204 No Content` | 刪除成功 | 移除本地項目 |
| `400 Bad Request` | 請求格式錯誤 | 顯示「請求格式錯誤」 |
| `401 Unauthorized` | JWT 無效或過期 | 導向 `/login` |
| `403 Forbidden` | RLS 拒絕存取 | 顯示「無存取權限」 |
| `404 Not Found` | 資源不存在 | 顯示空狀態 |
| `409 Conflict` | Unique constraint 衝突 | 顯示「資料已存在」 |
| `500 Internal Server Error` | Supabase 伺服器錯誤 | 顯示「服務暫時不可用，請稍後再試」 |

### 5.3 前端統一錯誤處理

```javascript
// hooks 層統一錯誤格式
async function safeQuery(queryFn) {
  const { data, error } = await queryFn()
  if (error) {
    if (error.status === 401) redirectToLogin()
    else if (error.status === 403) throw new Error('PERMISSION_DENIED')
    else throw new Error(error.message)
  }
  return data
}
```

### 5.4 錯誤碼字典

| Supabase `code` | HTTP 狀態碼 | 描述 | 前端處理 |
| :--- | :--- | :--- | :--- |
| `PGRST116` | 406 | 查詢結果為空（`.single()` 無資料） | 顯示空狀態 |
| `PGRST301` | 401 | JWT 過期 | 導向 `/login` |
| `42501` | 403 | RLS 拒絕（permission denied for table）| 顯示「無存取權限」 |
| `23505` | 409 | Unique constraint 違反（重複新增） | 顯示「成員已存在」 |
| `22P02` | 400 | 無效 UUID 格式 | 顯示「請求格式錯誤」 |

---

## 6. 安全性考量

### 6.1 傳輸層安全

- Supabase 強制 HTTPS（TLS 1.3），所有 API 呼叫加密傳輸
- Vercel CDN 同樣強制 HTTPS，HTTP 自動重導向

### 6.2 API Key 安全

| Key | 使用者 | 存放位置 | 說明 |
| :--- | :--- | :--- | :--- |
| `anon` key | 前端 React SPA | `.env.local` / Vercel 環境變數 | 受 RLS 限制，可安全暴露於瀏覽器 |
| `service_role` key | GitHub Actions（後端） | GitHub Secrets | **絕不放入前端**，繞過 RLS 寫入 |

**`.gitignore` 必須包含：**
```
.env.local
.env*.local
```

### 6.3 速率限制（Supabase 預設）

| 類型 | 限制 |
| :--- | :--- |
| Auth API（發送 Magic Link）| 每小時 3 封（Free 方案） |
| REST API | 每秒 500 請求（Free 方案共享） |
| **超出限制回應** | `429 Too Many Requests` |

### 6.4 OWASP API Security 考量

| 威脅 | 緩解策略 |
| :--- | :--- |
| **Broken Object Level Authorization（BOLA）** | Supabase RLS 在資料庫層強制，每個 `SELECT` 只回傳 `auth.uid()` 有權限的資料 |
| **Broken Authentication** | Supabase Auth 負責 JWT 發放與 refresh，前端不自行實作 Token 邏輯 |
| **Excessive Data Exposure** | 前端使用 `.select('欄位清單')` 只取需要的欄位，不 `SELECT *` |
| **Security Misconfiguration** | `service_role` key 僅限 GitHub Actions 使用，前端只使用 `anon` key |

---

## 7. API 端點詳述

---

### 7.1 Auth — 認證端點

#### `POST /auth/v1/token` — Google OAuth 登入

**SDK 呼叫：**
```javascript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
})
```

**行為：**
1. 重導向至 Google 授權頁
2. 授權完成後回跳至 `redirectTo` URL
3. Supabase 自動發放 `access_token` / `refresh_token`
4. 前端在 `/auth/callback` 路由呼叫 `supabase.auth.getSession()` 取得 session

**成功回應：** session 物件（含 `access_token`、`user`）

---

#### `POST /auth/v1/otp` — Email Magic Link 登入

**SDK 呼叫：**
```javascript
const { error } = await supabase.auth.signInWithOtp({
  email: 'client@example.com',
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`
  }
})
```

**行為：**
- Supabase 發送 Magic Link 至指定 Email
- 用戶點擊連結 → 重導向至 `/auth/callback` → 自動建立 session

**成功回應（SDK）：** `{ error: null }`（非同步，Email 已發送）

**錯誤情境：**
| 錯誤 | 原因 | 處理 |
| :--- | :--- | :--- |
| `rate_limit_exceeded` | 每小時超過 3 次發信 | 顯示「請稍後再試」|
| Email 未存在 | Supabase 仍回傳成功（防止用戶枚舉）| 顯示「請查看 Email」 |

---

#### `GET /auth/v1/user` — 取得當前登入用戶

**SDK 呼叫：**
```javascript
const { data: { user }, error } = await supabase.auth.getUser()
```

**成功回應（200 OK）：**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "user_metadata": {
    "full_name": "王小明",
    "avatar_url": "https://..."
  },
  "role": "authenticated"
}
```

---

#### `POST /auth/v1/logout` — 登出

**SDK 呼叫：**
```javascript
const { error } = await supabase.auth.signOut()
```

**成功行為：** 清除本地 session，`onAuthStateChange` 觸發 `SIGNED_OUT` 事件

---

### 7.2 Projects — 專案

**資源表：** `projects`
**RLS：** 只回傳 `id IN (SELECT project_id FROM project_access WHERE user_id = auth.uid())`

---

#### `GET /rest/v1/projects` — 列出可存取的所有專案

**授權角色：** Admin / Developer / Viewer（各自只見被分配的專案）

**SDK 呼叫：**
```javascript
const { data: projects, error } = await supabase
  .from('projects')
  .select('id, name, repo_full_name, status, current_phase, created_at')
  .order('name', { ascending: true })
```

**成功回應（200 OK）：**
```json
[
  {
    "id": "uuid",
    "name": "ProjectA",
    "repo_full_name": "user/project-a",
    "status": "active",
    "current_phase": "dev",
    "created_at": "2026-05-01T00:00:00Z"
  }
]
```

**空結果（無被分配專案）：** 回傳 `[]`

---

#### `GET /rest/v1/projects?id=eq.{project_id}` — 取得單一專案

**SDK 呼叫：**
```javascript
const { data: project, error } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .single()
```

**錯誤情境：**
| 情境 | 狀態碼 | 說明 |
| :--- | :--- | :--- |
| 專案不存在 | `406` (PGRST116) | 顯示「專案不存在」 |
| RLS 拒絕（無權限）| `403` | 顯示「無存取權限」 |

---

### 7.3 Tasks — 任務

**資源表：** `tasks_sync`
**RLS：** 只回傳屬於用戶可存取專案（`project_access`）的任務

---

#### `GET /rest/v1/tasks_sync` — 列出任務（多種過濾情境）

**授權角色：** Admin / Developer / Viewer

**情境 A：PM L1 — 所有可存取專案的任務（計算健康度）**
```javascript
const { data: tasks } = await supabase
  .from('tasks_sync')
  .select('project_id, status, deadline, updated_at')
```

**情境 B：PM L2 — 單一專案任務（S-Curve + Overdue + Blocked）**
```javascript
// 所有任務（S-Curve 計算用）
const { data: allTasks } = await supabase
  .from('tasks_sync')
  .select('id, external_id, title, status, deadline, assignee_email, updated_at')
  .eq('project_id', projectId)

// Overdue 任務（deadline < today AND status != Done）
const { data: overdueTasks } = await supabase
  .from('tasks_sync')
  .select('id, external_id, title, status, deadline, assignee_email')
  .eq('project_id', projectId)
  .lt('deadline', new Date().toISOString().split('T')[0])
  .neq('status', 'Done')
  .order('deadline', { ascending: true })

// Blocked 任務
const { data: blockedTasks } = await supabase
  .from('tasks_sync')
  .select('id, external_id, title, status, deadline, assignee_email, updated_at')
  .eq('project_id', projectId)
  .eq('status', 'Blocked')
  .order('updated_at', { ascending: false })
```

**情境 C：工程師 L1 — 個人跨專案待辦（依 deadline 升冪）**
```javascript
const { data: myTasks } = await supabase
  .from('tasks_sync')
  .select('id, external_id, title, status, deadline, project_id, projects(name)')
  .eq('assignee_email', currentUserEmail)
  .neq('status', 'Done')
  .order('deadline', { ascending: true, nullsFirst: false })
```

**情境 D：工程師 L2 Kanban — 單一專案全部任務（依狀態分欄）**
```javascript
const { data: kanbanTasks } = await supabase
  .from('tasks_sync')
  .select('id, external_id, title, status, assignee_email, deadline')
  .eq('project_id', projectId)
  .order('deadline', { ascending: true, nullsFirst: false })
```

**情境 E：客戶 L1 — 單一專案任務（計算完成率）**
```javascript
const { data: tasks } = await supabase
  .from('tasks_sync')
  .select('status')
  .eq('project_id', projectId)
```

**成功回應（200 OK）— 單筆任務結構：**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "external_id": "M3.1.3",
  "title": "實作付款 API 串接",
  "status": "Todo",
  "priority": "high",
  "assignee_email": "be@example.com",
  "deadline": "2026-05-10",
  "yaml_data": {
    "doc_type": "WBS",
    "phase": "dev",
    "owner": "BE"
  },
  "updated_at": "2026-06-04T10:00:00Z"
}
```

---

#### `GET /rest/v1/tasks_sync?id=eq.{task_id}` — 取得單一任務明細（L3）

**授權角色：** Admin / Developer（Viewer 被前端 RoleGuard 攔截）

**SDK 呼叫：**
```javascript
const { data: task } = await supabase
  .from('tasks_sync')
  .select('*')
  .eq('id', taskId)
  .single()
```

**成功回應（200 OK）：** 完整任務物件（含 `yaml_data` JSONB）

---

### 7.4 Milestones — 里程碑

**資源表：** `milestones`
**RLS：** 只回傳屬於用戶可存取專案的里程碑

---

#### `GET /rest/v1/milestones` — 列出里程碑

**授權角色：** Admin / Developer / Viewer

**情境 A：PM L2 S-Curve — 單一專案所有里程碑（依 planned_date 升冪）**
```javascript
const { data: milestones } = await supabase
  .from('milestones')
  .select('id, milestone_name, planned_date, actual_date, is_completed')
  .eq('project_id', projectId)
  .order('planned_date', { ascending: true })
```

**情境 B：PM L1 本週到期里程碑**
```javascript
const today = new Date().toISOString().split('T')[0]
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

const { data: upcomingMilestones } = await supabase
  .from('milestones')
  .select('id, milestone_name, planned_date, project_id, projects(name)')
  .eq('is_completed', false)
  .gte('planned_date', today)
  .lte('planned_date', nextWeek)
  .order('planned_date', { ascending: true })
```

**情境 C：客戶 L1 里程碑清單**
```javascript
const { data: milestones } = await supabase
  .from('milestones')
  .select('id, milestone_name, planned_date, actual_date, is_completed')
  .eq('project_id', projectId)
  .order('planned_date', { ascending: true })
```

**情境 D：客戶 L2 Roadmap（同情境 C，依 planned_date 升冪）**

**成功回應（200 OK）— 單筆里程碑結構：**
```json
{
  "id": 1,
  "project_id": "uuid",
  "milestone_name": "MVP 上線",
  "planned_date": "2026-06-20",
  "actual_date": null,
  "is_completed": false
}
```

---

### 7.5 Project Access — 成員管理（Admin 專用）

**資源表：** `project_access`
**RLS：** 用戶只能查看自己的 `project_access` 記錄（`user_id = auth.uid()`）
**Admin 操作：** 需繞過 RLS 或由 Supabase Edge Function 處理（詳見備註）

> ⚠️ **重要備註：** 由於 RLS Policy 的限制，Admin 直接使用 `anon` key 無法管理他人的 `project_access` 記錄。建議方案：
> 1. 使用 Supabase Edge Function（Server-side）以 `service_role` key 執行管理操作
> 2. 或暫時以 Supabase Dashboard 手動管理（MVP 階段可接受）
>
> MVP 階段採方案 2（Dashboard 手動管理），Post-MVP 實作 Edge Function。

---

#### `GET /rest/v1/project_access` — 查看自己的角色與專案列表

**授權角色：** Admin / Developer / Viewer

**SDK 呼叫：**
```javascript
const { data: accessList } = await supabase
  .from('project_access')
  .select('project_id, role, projects(name)')
  .eq('user_id', currentUserId)
```

**成功回應（200 OK）：**
```json
[
  {
    "project_id": "uuid",
    "role": "developer",
    "projects": { "name": "ProjectA" }
  }
]
```

---

#### [Post-MVP] Edge Function: `POST /functions/v1/manage-member` — Admin 新增成員

**授權角色：** Admin（Edge Function 內部驗證 role）

**請求體：**
```json
{
  "action": "add",
  "target_email": "newdev@example.com",
  "project_id": "uuid",
  "role": "developer"
}
```

**成功回應（201 Created）：**
```json
{
  "success": true,
  "message": "成員已新增"
}
```

**錯誤情境：**
| 情境 | 狀態碼 | `error.code` |
| :--- | :--- | :--- |
| 非 Admin 呼叫 | `403` | `permission_denied` |
| Email 未在 profiles 中 | `404` | `user_not_found` |
| 成員已存在（重複新增）| `409` | `member_already_exists` |

---

#### [Post-MVP] Edge Function: `POST /functions/v1/manage-member` — Admin 移除成員

**請求體：**
```json
{
  "action": "remove",
  "target_user_id": "uuid",
  "project_id": "uuid"
}
```

**成功回應（200 OK）：**
```json
{ "success": true, "message": "成員已移除" }
```

---

#### [Post-MVP] Edge Function: `POST /functions/v1/manage-member` — Admin 變更角色

**請求體：**
```json
{
  "action": "update_role",
  "target_user_id": "uuid",
  "project_id": "uuid",
  "role": "viewer"
}
```

**成功回應（200 OK）：**
```json
{ "success": true, "message": "角色已更新" }
```

---

### 7.6 Profiles — 用戶資料

**資源表：** `profiles`
**RLS：** 用戶只能查看與更新自己的記錄（`id = auth.uid()`）

---

#### `GET /rest/v1/profiles?id=eq.{user_id}` — 取得個人資料

**SDK 呼叫：**
```javascript
const { data: profile } = await supabase
  .from('profiles')
  .select('id, email, full_name, avatar_url')
  .eq('id', currentUser.id)
  .single()
```

**成功回應（200 OK）：**
```json
{
  "id": "uuid",
  "email": "pm@example.com",
  "full_name": "王小明",
  "avatar_url": "https://lh3.googleusercontent.com/..."
}
```

---

#### `POST /rest/v1/profiles` — 首次登入自動建立 Profile（Upsert）

**觸發時機：** 用戶首次登入後，前端呼叫（或透過 Supabase Database Trigger 自動建立）

**SDK 呼叫：**
```javascript
const { data, error } = await supabase
  .from('profiles')
  .upsert({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name,
    avatar_url: user.user_metadata?.avatar_url
  }, { onConflict: 'id' })
```

**成功回應（200 OK 或 201 Created）：** 完整 profile 物件

---

#### `PATCH /rest/v1/profiles?id=eq.{user_id}` — 更新個人資料

**SDK 呼叫：**
```javascript
const { error } = await supabase
  .from('profiles')
  .update({ full_name: '新姓名' })
  .eq('id', currentUser.id)
```

**成功回應（204 No Content）**

---

## 8. 資料模型 / Schema 定義

### 8.1 `Project`

```typescript
interface Project {
  id: string           // UUID (PK)
  name: string         // 專案名稱
  repo_full_name: string  // 'user/repo-name'（UNIQUE）
  status: 'active' | 'archived'
  current_phase: string | null  // 來自 WBS frontmatter.phase
  created_at: string   // ISO 8601
}
```

### 8.2 `Task`（`tasks_sync`）

```typescript
interface Task {
  id: string           // UUID (PK)
  project_id: string   // UUID (FK → projects)
  external_id: string  // WBS 任務 ID，如 'M3.1.3'
  title: string
  status: 'Todo' | 'Doing' | 'Done' | 'Blocked'
  priority: string | null   // 'low' | 'medium' | 'high' | 'critical'
  assignee_email: string | null
  deadline: string | null   // 'YYYY-MM-DD'
  yaml_data: Record<string, unknown> | null  // JSONB 原始 YAML 屬性
  updated_at: string   // ISO 8601（auto-update trigger）
}
```

### 8.3 `Milestone`

```typescript
interface Milestone {
  id: number           // SERIAL (PK)
  project_id: string   // UUID (FK → projects)
  milestone_name: string
  planned_date: string | null   // 'YYYY-MM-DD'
  actual_date: string | null    // 'YYYY-MM-DD'
  is_completed: boolean
}
```

### 8.4 `Profile`

```typescript
interface Profile {
  id: string           // UUID (FK → auth.users, PK)
  email: string | null
  full_name: string | null
  avatar_url: string | null
}
```

### 8.5 `ProjectAccess`

```typescript
interface ProjectAccess {
  id: number           // SERIAL (PK)
  user_id: string      // UUID (FK → profiles)
  project_id: string   // UUID (FK → projects)
  role: 'admin' | 'developer' | 'viewer'
}
```

### 8.6 前端計算型別（非 DB 欄位）

```typescript
type HealthStatus = 'normal' | 'warning' | 'critical'
// normal  → 🟢 無 Blocked、無 overdue
// warning → 🟡 有 overdue 任務或完成率落後 ≤10%
// critical → 🔴 有 Blocked 任務或落後 >10%

interface ProgressResult {
  done: number
  total: number
  pct: number    // Math.round(done / total * 100)，total=0 時為 0
}

interface SCurvePoint {
  date: string   // 'YYYY-MM-DD'
  planned: number   // 里程碑線性插值計算的計劃完成率（0–100）
  actual: number | null  // 實際完成率，未來日期為 null
}
```

---

## 9. SDK 呼叫速查表

| 功能 | SDK 呼叫片段 | 對應 BDD Feature |
| :--- | :--- | :--- |
| Google OAuth 登入 | `supabase.auth.signInWithOAuth({ provider: 'google' })` | F1 |
| Email Magic Link | `supabase.auth.signInWithOtp({ email })` | F1 |
| 取得 session | `supabase.auth.getSession()` | F1 |
| 登出 | `supabase.auth.signOut()` | F1 |
| 取得用戶角色 | `.from('project_access').select('role').eq('user_id', uid)` | F2 |
| PM L1：列出所有專案 | `.from('projects').select('*')` | F3 |
| PM L1：取得健康度資料 | `.from('tasks_sync').select('status,deadline').eq('project_id',id)` | F3 |
| PM L1：本週里程碑 | `.from('milestones').eq('is_completed',false).gte('planned_date',today).lte('planned_date',nextWeek)` | F3 |
| PM L2：Overdue 任務 | `.from('tasks_sync').lt('deadline',today).neq('status','Done').order('deadline')` | F4 |
| PM L2：Blocked 任務 | `.from('tasks_sync').eq('status','Blocked').order('updated_at',{ascending:false})` | F4 |
| PM L2：里程碑（S-Curve）| `.from('milestones').eq('project_id',id).order('planned_date')` | F4 |
| PM L3：任務明細 | `.from('tasks_sync').select('*').eq('id',taskId).single()` | F5 |
| 工程師 L1：個人待辦 | `.from('tasks_sync').eq('assignee_email',email).neq('status','Done').order('deadline',{nullsFirst:false})` | F6 |
| 工程師 L2：Kanban | `.from('tasks_sync').eq('project_id',id).order('deadline')` | F7 |
| 客戶 L1：完成率 | `.from('tasks_sync').select('status').eq('project_id',id)` | F8 |
| 客戶 L1：里程碑清單 | `.from('milestones').eq('project_id',id).order('planned_date')` | F8 |
| 客戶 L2：Roadmap | `.from('milestones').eq('project_id',id).order('planned_date')` | F9 |
| 建立 profile | `.from('profiles').upsert({id,email,full_name},{onConflict:'id'})` | F1 |

---

## 10. 附錄

### 10.1 完整請求/回應範例

#### 範例 A：工程師 L1 — 取得個人跨專案待辦

**SDK 呼叫：**
```javascript
const { data, error } = await supabase
  .from('tasks_sync')
  .select(`
    id,
    external_id,
    title,
    status,
    deadline,
    project_id,
    projects ( name )
  `)
  .eq('assignee_email', 'dev@example.com')
  .neq('status', 'Done')
  .order('deadline', { ascending: true, nullsFirst: false })
```

**等效 HTTP 請求：**
```
GET /rest/v1/tasks_sync
  ?select=id,external_id,title,status,deadline,project_id,projects(name)
  &assignee_email=eq.dev@example.com
  &status=neq.Done
  &order=deadline.asc.nullslast
Authorization: Bearer <JWT>
apikey: <anon_key>
```

**成功回應（200 OK）：**
```json
[
  {
    "id": "uuid-1",
    "external_id": "M2.1.1",
    "title": "設計訂單狀態轉換圖",
    "status": "Todo",
    "deadline": "2026-06-07",
    "project_id": "uuid-proj-b",
    "projects": { "name": "ProjectB" }
  },
  {
    "id": "uuid-2",
    "external_id": "M1.1.1",
    "title": "實作用戶登入 API",
    "status": "Todo",
    "deadline": "2026-06-10",
    "project_id": "uuid-proj-a",
    "projects": { "name": "ProjectA" }
  },
  {
    "id": "uuid-3",
    "external_id": "M3.2.1",
    "title": "撰寫單元測試",
    "status": "Doing",
    "deadline": null,
    "project_id": "uuid-proj-a",
    "projects": { "name": "ProjectA" }
  }
]
```

---

#### 範例 B：PM L2 — Overdue 任務查詢

**SDK 呼叫：**
```javascript
const today = new Date().toISOString().split('T')[0]  // '2026-06-05'

const { data: overdueTasks } = await supabase
  .from('tasks_sync')
  .select('id, external_id, title, status, deadline, assignee_email')
  .eq('project_id', 'uuid-proj-a')
  .lt('deadline', today)
  .neq('status', 'Done')
  .order('deadline', { ascending: true })
```

**成功回應（200 OK）：**
```json
[
  {
    "id": "uuid-4",
    "external_id": "M1.1.2",
    "title": "建立測試商戶帳號",
    "status": "Todo",
    "deadline": "2026-05-15",
    "assignee_email": "be@example.com"
  },
  {
    "id": "uuid-5",
    "external_id": "M1.1.1",
    "title": "評估金流服務商",
    "status": "Todo",
    "deadline": "2026-05-20",
    "assignee_email": "pm@example.com"
  }
]
```

---

#### 範例 C：客戶 L1 — 完成率圓環計算

**SDK 呼叫：**
```javascript
const { data: tasks } = await supabase
  .from('tasks_sync')
  .select('status')
  .eq('project_id', 'uuid-proj-a')

// 前端計算（lib/progressCalc.js）
const total = tasks.length          // 10
const done = tasks.filter(t => t.status === 'Done').length  // 4
const pct = total > 0 ? Math.round(done / total * 100) : 0  // 40
```

**回應（200 OK）：**
```json
[
  { "status": "Done" },
  { "status": "Done" },
  { "status": "Todo" },
  "..."
]
```

**前端計算結果：** `{ done: 4, total: 10, pct: 40 }`

---

### 10.2 API 生命週期與版本策略

本系統使用 Supabase 自動生成的 PostgREST API，版本由 Supabase 管理（當前版本 `v1`）。

| 變更類型 | 處理方式 |
| :--- | :--- |
| 新增欄位（非 nullable）| Supabase Migration + 更新 SDK 呼叫 |
| 刪除欄位 | 同上（破壞性變更，需前後端協調）|
| 新增資料表 | 新增 RLS Policy + 更新 SDK 呼叫 |
| Supabase 版本升級 | 按 Supabase 官方遷移指南執行 |

---

**文件審核記錄:**

| 日期       | 審核人 | 版本 | 變更摘要 |
| :--------- | :----- | :--- | :------- |
| 2026-06-05 | PM     | v1.0 | 初稿提交 |
