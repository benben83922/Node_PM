---
project: Node_PM
doc_type: Architecture
status: draft
phase: planning
priority: high
owner: PM
updated: 2026-06-05
tags: [web-app, adr, architecture, react, supabase]
---

# 架構決策記錄 (ADR) - Node_PM Web App 團隊進度儀表板

**對應 PRD:** `Web_App_PRD.md`
**對應 BDD:** `Web_App_BDD.md`

---

## 目錄

- [ADR-G001: 前端框架選型 — React + Recharts](#adr-g001-前端框架選型--react--recharts)
- [ADR-G002: 認證方案 — Supabase Auth（Google OAuth + Email）](#adr-g002-認證方案--supabase-authgoogle-oauth--email)
- [ADR-G003: 進度計算策略 — 前端動態計算，不存靜態欄位](#adr-g003-進度計算策略--前端動態計算不存靜態欄位)
- [ADR-G004: RBAC 實作 — Supabase RLS + project_access 表](#adr-g004-rbac-實作--supabase-rls--project_access-表)
- [ADR-G005: 部署平台 — Vercel](#adr-g005-部署平台--vercel)
- [ADR-G006: S-Curve 計劃完成率計算 — 里程碑線性插值](#adr-g006-s-curve-計劃完成率計算--里程碑線性插值)

---

## ADR-G001: 前端框架選型 — React + Recharts

**狀態 (Status):** `已接受 (Accepted)`
**決策者 (Deciders):** `PM`
**日期 (Date):** `2026-06-05`
**受影響團隊 (Informed):** `前端工程師`

---

### 1. 背景與問題陳述

- **上下文：** Node_PM Web App 需要一個多角色進度儀表板，服務 PM（L1/L2/L3 鑽取式）、工程師（Kanban、待辦）、客戶（里程碑時間軸、完成率圓環）三種角色，資料來源為 Supabase。
- **問題陳述：** 需要選定一個前端框架與圖表庫，既能靈活實現三角色差異化視圖，又能在小團隊維護下保持低成本。選型不當會導致開發速度過慢、後續難以客製化，或訂閱費用過高。
- **驅動因素/約束條件：**
  - 需支援 S-Curve（折線圖）、CFD（區域折線）、完成率圓環等多種圖表類型
  - Supabase JavaScript SDK 原生支援的框架優先
  - 團隊規模小（1–2 名工程師），需降低學習曲線
  - 部署成本需控制在免費或低成本方案內

### 2. 考量的選項

#### 選項一：React + Recharts（採用）

- **描述：** 以 React 建立 SPA，圖表使用 Recharts（基於 SVG 的 React 圖表庫）。
- **優點：**
  - 生態系最成熟，Supabase JS SDK 有完整的 React 範例
  - Recharts 原生支援 LineChart、AreaChart、PieChart，可直接對應 S-Curve / CFD / 完成率圓環
  - 社群資源豐富，LLM 生成程式碼品質穩定
  - 與 Vercel 部署無縫整合
- **缺點：**
  - 純 SPA 無 SSR，初次載入速度較 Next.js 慢（但儀表板場景不需 SEO，可接受）
  - 相較 Low-code 工具（Metabase/Retool），客製化需要更多開發工作
- **成本/複雜度評估：** 中

#### 選項二：Next.js + Recharts

- **描述：** 使用 Next.js（React 框架）提供 SSR/ISR，搭配 Recharts。
- **優點：** SSR 可加速初始載入；App Router 提供更好的路由與 Layout 管理
- **缺點：** 儀表板主要場景為登入後查看，SEO 無意義；增加 Server Components 概念的學習成本；Vercel 免費方案的 Function 執行時間限制可能觸發
- **成本/複雜度評估：** 高

#### 選項三：Metabase（Self-hosted 或 Cloud）

- **描述：** 使用 Metabase 連接 Supabase，以 No-code 方式建立儀表板。
- **優點：** 零前端開發工作；SQL 查詢即得圖表
- **缺點：** 三角色差異化視圖的客製化程度不足（Metabase 無法自訂登入後依角色渲染不同 Layout）；Self-hosted 需自建 Server；Cloud 方案訂閱費高
- **成本/複雜度評估：** 基礎設施高，客製化低

#### 選項四：Retool

- **描述：** 低程式碼工具，視覺化配置 UI 元件，連接 Supabase。
- **優點：** 開發速度快；RBAC 有內建支援
- **缺點：** 訂閱費用高（非開源）；難以實現 S-Curve 等複雜圖表；外觀難以高度客製化
- **成本/複雜度評估：** 低複雜度但高訂閱成本

---

### 3. 決策

**最終選擇的方案：** 選項一 — React + Recharts

**選擇理由：**
- Supabase SDK 對 React 的整合最為完整，可直接使用 `@supabase/auth-helpers-react` 處理認證狀態
- Recharts 的 `LineChart`（S-Curve）、`AreaChart`（CFD）、`PieChart`（完成率圓環）均可直接使用，無需客製化圖表引擎
- 相較 Metabase/Retool，React 給予三角色 Layout 完整的客製化彈性，且無訂閱費
- LLM（Claude Code）對 React + Supabase 的程式碼生成品質穩定，可加速 Phase 5 開發

---

### 4. 決策的後果與影響

- **正面影響：** 前端彈性最高；零訂閱成本；LLM 輔助開發效率高
- **負面影響：** 需要前端開發工作（估計 7 天，Phase 5）；相較 Metabase 的即時上線，啟動成本較高
- **對其他組件的影響：** 前端需設定 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 環境變數；Vercel 部署需連接 GitHub repo
- **未來重新評估觸發條件：** 若專案規模擴大需要 SSR（SEO）或 API Routes，可遷移至 Next.js

---

### 5. 執行計畫概要

1. 初始化 React 專案（`create-react-app` 或 `vite`）
2. 安裝 `@supabase/supabase-js`、`recharts`、`react-router-dom`
3. 實作 Supabase Auth（Google OAuth + Email）
4. 實作三角色路由守衛（PrivateRoute + role check）
5. 實作 PM / 工程師 / 客戶各層 Dashboard 元件
6. 部署至 Vercel，設定環境變數

---

**ADR 審核記錄:**

| 日期       | 審核人 | 角色  | 備註               |
| :--------- | :----- | :---- | :----------------- |
| 2026-06-05 | PM     | PM    | 初稿，待技術確認    |

---

---

## ADR-G002: 認證方案 — Supabase Auth（Google OAuth + Email）

**狀態 (Status):** `已接受 (Accepted)`
**決策者 (Deciders):** `PM`
**日期 (Date):** `2026-06-05`
**受影響團隊 (Informed):** `前端工程師、客戶`

---

### 1. 背景與問題陳述

- **上下文：** Web App 有三種角色用戶（PM / 工程師 / 客戶），各自需要安全認證後才能存取被授權的資料。客戶群體為外部利害關係人，需要低摩擦的登入體驗。
- **問題陳述：** 需要一套認證方案，在不自建 Auth Server 的前提下，支援 Google OAuth（對內部成員）與簡易外部登入（對客戶），且能與 Supabase RLS 無縫整合。
- **驅動因素/約束條件：**
  - 認證身份必須能對應至 Supabase `auth.uid()`，以支援 RLS 政策
  - 客戶（外部）可能沒有公司帳號，需支援 Google 個人帳號登入
  - 不自建 Auth Server（零基礎設施維護）

### 2. 考量的選項

#### 選項一：Supabase Auth — Google OAuth + Email Magic Link（採用）

- **描述：** 使用 Supabase 內建 Auth 服務，提供 Google OAuth 與 Email Magic Link 兩種登入方式。
- **優點：**
  - `auth.uid()` 直接用於 RLS Policy，零額外橋接程式碼
  - Google OAuth 對工程師/PM 友善；Email Magic Link 對客戶友善（無需記憶密碼）
  - `@supabase/auth-helpers-react` 提供 `useSession` Hook，認證狀態管理簡單
  - Supabase 免費方案包含 Auth，無額外費用
- **缺點：**
  - 依賴 Supabase Auth 服務，若 Supabase 發生問題則無法登入
  - Email Magic Link 需要用戶收信，網路不穩時體驗較差
- **成本/複雜度評估：** 低

#### 選項二：Auth0 + Supabase JWT 橋接

- **描述：** 使用 Auth0 處理認證，透過 Custom JWT 橋接至 Supabase RLS。
- **優點：** Auth0 功能完整（MFA、SSO、審計日誌）
- **缺點：** 需要額外橋接設定（JWT Claims 對應）；Auth0 免費方案有 7,500 月活躍用戶上限，超過收費；對小規模專案過於複雜
- **成本/複雜度評估：** 高

#### 選項三：Firebase Authentication + Supabase

- **描述：** 使用 Firebase Auth，透過 Service Account 建立 Supabase 用戶。
- **優點：** Firebase 生態豐富
- **缺點：** 跨平台橋接複雜；需維護兩套認證系統；與 Supabase RLS 整合需自訂 Webhook
- **成本/複雜度評估：** 高

---

### 3. 決策

**最終選擇的方案：** 選項一 — Supabase Auth（Google OAuth + Email Magic Link）

**選擇理由：**
- `auth.uid()` 天然對應 RLS Policy，無需額外橋接，是 Supabase 技術棧內最低阻力的選擇
- Email Magic Link 解決了客戶（外部 Viewer）需記憶密碼的問題（對應 PRD Q-004 的待討論問題）
- 對小規模專案（< 100 用戶），Supabase Auth 免費方案完全足夠

---

### 4. 決策的後果與影響

- **正面影響：** 零額外基礎設施；RLS 整合零成本；客戶登入體驗友善
- **負面影響：** Email Magic Link 依賴 Supabase 的郵件發送服務（免費方案每小時限制）；若需要 MFA 需另行評估
- **對其他組件的影響：** 登入後需觸發 `profiles` 表 INSERT（透過 Supabase Trigger 或前端初始化邏輯）
- **未來重新評估觸發條件：** 若客戶要求 SSO 或 MFA，需評估升級 Auth0 或 Supabase Pro

---

**ADR 審核記錄:**

| 日期       | 審核人 | 角色  | 備註               |
| :--------- | :----- | :---- | :----------------- |
| 2026-06-05 | PM     | PM    | 初稿，待技術確認    |

---

---

## ADR-G003: 進度計算策略 — 前端動態計算，不存靜態欄位

**狀態 (Status):** `已接受 (Accepted)`
**決策者 (Deciders):** `PM`
**日期 (Date):** `2026-06-05`
**受影響團隊 (Informed):** `前端工程師、GitHub Actions 維護者`

---

### 1. 背景與問題陳述

- **上下文：** Web App 需要顯示每個專案的任務完成率（%），資料來源為 Supabase `tasks_sync` 表。GitHub Actions 在每次 git push 後將 WBS.md 的 `- [ ]` / `- [x]` 解析並 upsert 至 `tasks_sync`。
- **問題陳述：** 進度百分比有兩種設計策略：（1）由 GitHub Actions 計算後存入靜態 `progress` 欄位；（2）由前端每次從 `tasks_sync` 動態計算。選錯會導致資料不一致或效能問題。
- **驅動因素/約束條件：**
  - 核心原則「單一寫入源」：`.md` 文件是唯一資料源，Supabase 是衍生資料
  - `tasks_sync` 表的資料由 Actions upsert，不由前端或用戶直接修改
  - 任務數量預期每個專案 < 200 筆（個人 PM 使用場景）

### 2. 考量的選項

#### 選項一：前端動態計算，不存靜態 `progress` 欄位（採用）

- **描述：** 前端查詢 `tasks_sync` 全部任務後，即時計算 `COUNT(Done) / COUNT(*)` 得出百分比。
- **優點：**
  - 資料永遠一致（不存在「靜態值未更新」的 stale 問題）
  - Schema 更簡潔，單一職責
  - 符合「前端唯讀 Supabase」的架構原則，Actions 只負責 upsert 任務本體
- **缺點：**
  - 每次載入需查詢全部任務（但 < 200 筆場景下效能可接受）
  - 若未來任務數量大幅增長，需考慮 Database Function 或 Materialized View
- **成本/複雜度評估：** 低

#### 選項二：GitHub Actions 計算後寫入靜態 `progress` 欄位

- **描述：** Python 腳本在 upsert 任務後，計算完成率並存入 `projects.progress` 欄位。
- **優點：** 查詢 L1 總覽時只需讀 `projects` 表，查詢效率高
- **缺點：**
  - 靜態值有時效性問題（若 Actions 中途失敗，`progress` 可能與 `tasks_sync` 不同步）
  - 違背「前端動態計算」原則，新增 schema 欄位增加維護負擔
  - 對 < 200 筆任務的場景，效能優勢可忽略不計
- **成本/複雜度評估：** 中（多一個 schema 欄位 + 腳本邏輯）

#### 選項三：Supabase Database Function（RPC）

- **描述：** 在 Supabase 建立 PostgreSQL Function，前端呼叫 RPC 取得預計算進度。
- **優點：** 計算在資料庫端，減少前端 JS 邏輯
- **缺點：** 對當前規模過度設計；Function 維護需要 SQL 知識；比前端計算複雜
- **成本/複雜度評估：** 中高

---

### 3. 決策

**最終選擇的方案：** 選項一 — 前端動態計算，不存靜態 `progress` 欄位

**選擇理由：**
- 對個人 PM 系統（每個專案 < 200 筆任務），前端計算的效能影響可忽略不計
- 靜態欄位帶來的資料不一致風險遠大於其效能收益（若 Actions 中斷，進度顯示將錯誤）
- 與「單一寫入源」設計原則一致：`tasks_sync` 只存任務本體，進度是「派生概念」，不應物化儲存
- 未來擴展路徑清晰：若任務數成長至千筆，可直接引入 Materialized View，不需修改前端邏輯

---

### 4. 決策的後果與影響

- **正面影響：** Schema 簡潔；資料永遠一致；零 stale 問題
- **負面影響：** 若未來任務數成長（> 1,000 筆），L1 總覽頁需引入 Materialized View 或 Server-side 聚合
- **對其他組件的影響：** GitHub Actions 腳本不需計算進度，腳本邏輯更單純；`projects` 表不新增 `progress` 欄位
- **未來重新評估觸發條件：** 單一專案任務數超過 500 筆，或 L1 頁面載入時間超過 3 秒

---

**ADR 審核記錄:**

| 日期       | 審核人 | 角色  | 備註               |
| :--------- | :----- | :---- | :----------------- |
| 2026-06-05 | PM     | PM    | 初稿，待技術確認    |

---

---

## ADR-G004: RBAC 實作 — Supabase RLS + project_access 表

**狀態 (Status):** `已接受 (Accepted)`
**決策者 (Deciders):** `PM`
**日期 (Date):** `2026-06-05`
**受影響團隊 (Informed):** `前端工程師、資料庫管理者`

---

### 1. 背景與問題陳述

- **上下文：** Web App 有三種角色（Admin/Developer/Viewer），每種角色對「可存取的專案」與「可存取的頁面層級」有不同限制。需要一套機制確保 Developer 不能看到未被分配的專案資料，Viewer 不能存取 L3 任務明細。
- **問題陳述：** 如果僅在前端實作角色控管（純 JS 邏輯），則惡意用戶可繞過前端直接呼叫 Supabase API 取得未授權資料。需要一套後端強制執行的存取控制機制。
- **驅動因素/約束條件：**
  - 不引入額外的 API Server（使用 Supabase 直連前端架構）
  - 角色關係為「用戶 ↔ 專案 ↔ 角色」三元關係，非簡單的全局角色
  - Admin 可動態新增/移除成員，不能硬編碼

### 2. 考量的選項

#### 選項一：Supabase RLS + `project_access` 表（採用）

- **描述：** 建立 `project_access(user_id, project_id, role)` 表，為每張業務資料表（`tasks_sync`、`milestones`、`projects`）啟用 Row Level Security，Policy 使用 `auth.uid()` 查詢 `project_access` 確認存取權限。前端路由守衛再加一層 UI 保護（防止 Viewer 存取 L3 頁面）。
- **優點：**
  - 資料庫層強制執行，前端無法繞過
  - `project_access` 表靈活支援「用戶-專案-角色」三元關係
  - `anon` key 受 RLS 保護，`service_role` key 僅 Actions 使用（後端環境）
  - Supabase 原生支援，零額外基礎設施
- **缺點：**
  - RLS Policy 撰寫錯誤會導致資料洩漏（需嚴格測試）
  - L3 層級限制需前端路由守衛配合（RLS 不能控制「頁面路由」，只能控制「資料存取」）
- **成本/複雜度評估：** 中

#### 選項二：純前端角色控管（JWT Claims）

- **描述：** 在 Supabase JWT 的 `user_metadata` 中存入角色，前端根據角色決定渲染內容。
- **優點：** 實作簡單，無需 RLS Policy
- **缺點：** 前端控管可被繞過（直接呼叫 Supabase API）；JWT 修改後需重新登入才生效；不支援「用戶-專案-角色」三元關係（JWT 只能存全局角色）
- **成本/複雜度評估：** 低（但安全性不足）

#### 選項三：自建 API Server 作為資料閘道

- **描述：** 前端不直連 Supabase，所有請求透過自建 API Server（如 Express.js）中轉，Server 端驗證角色後再查詢 Supabase。
- **優點：** 最彈性的存取控制；可記錄詳細 Audit Log
- **缺點：** 引入額外基礎設施（Server 部署、維護）；違背「零基礎設施」原則；對小規模專案過度設計
- **成本/複雜度評估：** 高

---

### 3. 決策

**最終選擇的方案：** 選項一 — Supabase RLS + `project_access` 表 + 前端路由守衛雙層保護

**選擇理由：**
- RLS 在資料庫層強制執行，即使攻擊者取得 `anon` key 也無法存取未授權專案的資料
- `project_access` 的三元關係（user_id + project_id + role）完整支援 PRD 中「Admin 可動態分配成員至特定專案」的需求
- 前端路由守衛作為第二層保護，防止 Viewer 透過 URL 直接存取 L3 頁面（即使 API 回傳空資料，也不讓 Viewer 看到 L3 UI）
- 無需額外基礎設施，符合「最小自建後端」原則

---

### 4. 決策的後果與影響

- **正面影響：** 資料存取安全性高；零額外基礎設施；Admin 可動態管理成員
- **負面影響：** RLS Policy 需要嚴格測試（Phase 4 驗收項目）；Policy 撰寫錯誤的風險需透過三角色驗收測試覆蓋
- **對其他組件的影響：** GitHub Actions 使用 `service_role` key 繞過 RLS 寫入，需確保 `service_role` key 只存於 GitHub Secrets，不暴露於前端
- **未來重新評估觸發條件：** 若需要欄位級別的存取控制（Column-level Security）或詳細 Audit Log，評估升級至自建 API Server

---

### 5. 執行計畫概要

1. 建立 `project_access` 表並設定 RLS Policy（見 Supabase_Schema設計規格書.md）
2. 以三角色（Admin/Developer/Viewer）手動測試 RLS Policy 正確性
3. 前端實作 `PrivateRoute` 元件，登入後根據 `project_access` 的 role 決定路由
4. Viewer 路由守衛：攔截所有 `/dashboard/client/*/tasks/*` 路由，重導向至 `/dashboard/client`

---

**ADR 審核記錄:**

| 日期       | 審核人 | 角色  | 備註               |
| :--------- | :----- | :---- | :----------------- |
| 2026-06-05 | PM     | PM    | 初稿，待技術確認    |

---

---

## ADR-G005: 部署平台 — Vercel

**狀態 (Status):** `已接受 (Accepted)`
**決策者 (Deciders):** `PM`
**日期 (Date):** `2026-06-05`
**受影響團隊 (Informed):** `前端工程師`

---

### 1. 背景與問題陳述

- **上下文：** Web App（React SPA）需要一個前端部署平台，要求與 GitHub 整合（push 後自動部署）、低維護成本、免費方案足以支撐個人/小團隊使用量。
- **問題陳述：** 需要選定一個前端部署平台，在零維護成本下支援 HTTPS、環境變數管理、自動 Preview Deploy（每個 PR 一個預覽環境）。
- **驅動因素/約束條件：**
  - 不自建 Web Server 或 Nginx
  - 需支援 SPA 的 Client-side Routing（所有 404 重導向至 `index.html`）
  - 需能在部署時注入 `REACT_APP_SUPABASE_URL` 等環境變數

### 2. 考量的選項

#### 選項一：Vercel（採用）

- **描述：** Vercel 是 Next.js 的原創公司，對 React/Next.js 部署有原生支援，與 GitHub 整合後每次 push 自動部署。
- **優點：**
  - 免費方案包含：無限靜態部署、Preview Deployments、自訂域名、HTTPS
  - SPA 的 Client-side Routing 零設定（自動重寫為 `index.html`）
  - 環境變數管理介面完善（區分 Production/Preview/Development）
  - GitHub 整合：每個 PR 自動生成 Preview URL，方便 Review
- **缺點：**
  - 免費方案有商業用途限制（個人/開源專案免費，商業用途需付費）
  - 若未來需要 Server-side 功能（API Routes），免費方案的 Function 執行有時間限制
- **成本/複雜度評估：** 低

#### 選項二：Netlify

- **描述：** 類似 Vercel 的靜態網站/Jamstack 部署平台。
- **優點：** 功能與 Vercel 相近；SPA Redirect 支援（需在 `_redirects` 加一行設定）
- **缺點：** 對 React（非 Next.js）的支援與 Vercel 相同；相較 Vercel，團隊對 Netlify 的熟悉度較低；Preview Deploy 功能相似但設定稍繁
- **成本/複雜度評估：** 低

#### 選項三：GitHub Pages

- **描述：** 直接使用 GitHub Pages 部署靜態 React Build。
- **優點：** 完全免費；與 GitHub repo 整合
- **缺點：** 不支援 SPA Client-side Routing（需要 HashRouter 或特殊 404.html 技巧）；環境變數需透過 GitHub Actions 注入，設定較繁瑣；無 Preview Deploy 功能
- **成本/複雜度評估：** 低但限制多

---

### 3. 決策

**最終選擇的方案：** 選項一 — Vercel

**選擇理由：**
- Vercel 的 SPA 路由支援是零設定的，無需特殊 `_redirects` 或 HashRouter hack
- Preview Deploy 功能讓 PM 可以在合併前先預覽 UI 變更
- 環境變數管理介面直觀，`REACT_APP_SUPABASE_URL` / `REACT_APP_SUPABASE_ANON_KEY` 可在 Dashboard 直接設定
- 對個人/小團隊的免費方案完全足夠

---

### 4. 決策的後果與影響

- **正面影響：** 零維護成本；Preview Deploy 加速 Review；HTTPS 自動處理
- **負面影響：** 若未來商業化使用，需升級至付費方案
- **對其他組件的影響：** 需在 Vercel 專案設定中加入以下環境變數：`REACT_APP_SUPABASE_URL`、`REACT_APP_SUPABASE_ANON_KEY`
- **未來重新評估觸發條件：** 若需要 Server-side Rendering 或 API Routes（超出免費方案），評估 Vercel Pro 或遷移至 Netlify

---

**ADR 審核記錄:**

| 日期       | 審核人 | 角色  | 備註               |
| :--------- | :----- | :---- | :----------------- |
| 2026-06-05 | PM     | PM    | 初稿，待技術確認    |

---

---

## ADR-G006: S-Curve 計劃完成率計算 — 里程碑線性插值

**狀態 (Status):** `已接受 (Accepted)`
**決策者 (Deciders):** `PM`
**日期 (Date):** `2026-06-05`
**受影響團隊 (Informed):** `前端工程師`

---

### 1. 背景與問題陳述

- **上下文：** PM L2 診斷頁需要顯示 S-Curve：X 軸為時間，Y 軸為完成率（%），包含「計劃完成率」（理想線）與「實際完成率」（當前線）兩條曲線，讓 PM 一眼看出進度偏差。
- **問題陳述：** 「實際完成率」可直接從 `tasks_sync` 計算（`Done / total`），但「計劃完成率」（計劃中每個時間點應完成多少百分比）需要額外的資料來源。有兩種設計：（1）從里程碑時間點線性插值估算；（2）在 WBS.md 中另外記錄每個時間點的計劃完成率，由 Actions 解析後存入獨立欄位。
- **驅動因素/約束條件：**
  - 核心原則「零重複輸入」：不希望 PM 在文件外再手動輸入計劃數字
  - `milestones` 表已記錄每個里程碑的 `planned_date` 與 `is_completed`
  - S-Curve 的精確度在此場景（個人 PM）為「趨勢參考」，不需到小數點精度

### 2. 考量的選項

#### 選項一：里程碑線性插值估算計劃完成率（採用）

- **描述：** 以最早里程碑的 `planned_date` 為起點（0%），最晚里程碑的 `planned_date` 為終點（100%），中間依各里程碑日期線性插值得出計劃完成率曲線。
- **優點：**
  - 完全基於現有 `milestones` 表資料，不需新增欄位或文件格式
  - PM 只需維護 WBS.md 的里程碑表格，計劃線自動產生
  - 對「趨勢監控」場景精確度已足夠
- **缺點：**
  - 線性插值假設每個里程碑間的任務工作量均勻分布，實際情況可能不符
  - 若某段里程碑間任務特別密集，計劃線與實際偏差的解讀需配合 PM 經驗
- **成本/複雜度評估：** 低

#### 選項二：WBS.md 中另記計劃完成率，由 Actions 解析

- **描述：** 在 WBS.md 的里程碑表格新增「計劃完成率」欄位，由 Actions 解析後存入 Supabase，前端直接讀取。
- **優點：** 計劃線更精確
- **缺點：**
  - 增加 WBS.md 格式複雜度（PM 需額外維護數字）
  - 違背「零重複輸入」原則（計劃完成率是可從任務數量推算的資訊）
  - Actions 解析新格式增加維護風險
- **成本/複雜度評估：** 中

#### 選項三：不顯示 S-Curve，只顯示當前完成率

- **描述：** 捨棄 S-Curve，只以數字或進度條顯示當前完成率。
- **優點：** 最簡單的實作
- **缺點：** 失去「計劃 vs 實際偏差」的視覺診斷能力，降低 L2 診斷頁的核心價值
- **成本/複雜度評估：** 最低，但功能受損

---

### 3. 決策

**最終選擇的方案：** 選項一 — 里程碑線性插值估算計劃完成率

**選擇理由：**
- 對個人 PM 的進度監控場景，S-Curve 的功能是「趨勢提示」而非「精確預測」，線性插值已足夠
- 完全基於現有 `milestones` 表，不需修改 WBS.md 格式或 Actions 腳本
- 符合「零重複輸入」：PM 不需輸入額外數字

**計算邏輯說明：**

```
設：里程碑按 planned_date 排序後共 N 個
    第 i 個里程碑的 planned_date 為 D_i
    計劃完成率在 D_i 時為 (i / N) × 100%

在 D_i 與 D_{i+1} 之間的任意日期 T，計劃完成率線性插值：
    planned_pct(T) = ((i / N) + (T - D_i) / (D_{i+1} - D_i) × (1/N)) × 100%
```

---

### 4. 決策的後果與影響

- **正面影響：** S-Curve 計劃線自動從里程碑資料生成，PM 零額外輸入；`milestones` 表無需新欄位
- **負面影響：** 線性插值假設里程碑間工作均勻分布；若里程碑設計不均勻（如前密後疏），計劃線會有系統性偏差，需 PM 理解此限制
- **對其他組件的影響：** 前端需實作線性插值函數（純 JS 計算）；不影響 Actions 腳本或 Supabase Schema
- **未來重新評估觸發條件：** 若 PM 反映 S-Curve 計劃線嚴重不準，評估在 WBS.md 中加入明確的計劃完成率欄位

---

**ADR 審核記錄:**

| 日期       | 審核人 | 角色  | 備註               |
| :--------- | :----- | :---- | :----------------- |
| 2026-06-05 | PM     | PM    | 初稿，待技術確認    |

---

**文件版本**：v1.0
**最後更新**：2026-06-05
**狀態**：草稿（Draft）
