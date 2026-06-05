---
project: Node_PM
doc_type: SecurityChecklist
status: draft
phase: planning
priority: high
owner: PM
updated: 2026-06-05
tags: [web-app, security, checklist, production-readiness, supabase]
---

# 綜合品質檢查清單 (Unified Quality Checklist) - Node_PM Web App

---

**文件版本 (Document Version):** `v1.0`
**最後更新 (Last Updated):** `2026-06-05`
**主要作者 (Lead Author):** `技術負責人`
**狀態 (Status):** `使用中 (In Use)`

---

## 目錄 (Table of Contents)

- [審查資訊](#審查資訊)
- [A. 核心安全原則](#a-核心安全原則)
- [B. 資料生命週期安全與隱私](#b-資料生命週期安全與隱私)
- [C. 應用程式安全](#c-應用程式安全)
- [D. 基礎設施與運維安全](#d-基礎設施與運維安全)
- [E. 合規性](#e-合規性)
- [F. 審查結論與行動項](#f-審查結論與行動項)
- [G. 生產準備就緒](#g-生產準備就緒)

---

## 審查資訊

**審查對象:** `Node_PM Web App v1.0 (Phase 5 MVP)`
**審查日期:** `2026-06-05`
**審查人員:** `技術負責人、PM`

**相關文件:**
- 架構文件: `Web_App_Architecture.md`
- API 規範: `Web_App_API_Specification.md`
- 前端架構規範: `Web_App_Frontend_Architecture_Spec.md`
- ADR: `Web_App_ADR.md`

---

> **適配說明：** Node_PM Web App 為 React SPA + Supabase BaaS 架構，無自建後端伺服器。本文件將傳統後端安全檢查項目調整為 Supabase 托管服務的等效驗證，並新增 **API Key 安全邊界**（`anon key` vs `service_role key` 分離）與 **RLS 驗證**（資料庫層存取控制）等 Supabase 特有安全要點。

---

## A. 核心安全原則

| # | 原則 | 評估說明（Node_PM Web App 的具體實踐） | 狀態 |
| :- | :--- | :--- | :--- |
| A.1 | **最小權限 (Least Privilege)** | 前端使用 `anon key`（受 RLS 過濾）；`service_role` key 只存於 GitHub Secrets，僅 GitHub Actions 使用；Viewer 角色只能讀取 L1/L2 摘要，不能存取 `tasks_sync` L3 明細 | `[ ]` |
| A.2 | **縱深防禦 (Defense in Depth)** | 雙層防護：① Supabase RLS（資料庫層）自動依 `auth.uid()` 過濾資料；② React `RoleGuard`（UI 層）依角色阻止渲染 | `[ ]` |
| A.3 | **預設安全 (Secure by Default)** | Supabase 表格預設關閉匿名讀寫（需明確 RLS Policy 才能存取）；`anon key` 在無 RLS Policy 時無法讀寫任何資料 | `[ ]` |
| A.4 | **攻擊面最小化 (Minimize Attack Surface)** | 無自建後端伺服器（BaaS 架構）；前端只曝露 `anon key` + Supabase Project URL；GitHub Actions 是唯一寫入 Supabase 的外部入口 | `[ ]` |
| A.5 | **職責分離 (Separation of Duties)** | 前端（讀取）、GitHub Actions（寫入）使用不同的 key 與不同的權限；PM 透過 Supabase Dashboard 手動管理成員（MVP 階段），不透過前端直接寫入 `project_access` | `[ ]` |

**A 節評估備注：**

> ⚠️ **最高優先安全邊界：** `service_role` key 是唯一可繞過 RLS 的憑證，一旦洩露等同於資料庫完全開放。需在 F 節確認其儲存位置的完整性。

---

## B. 資料生命週期安全與隱私

### B.1 資料分類

**Node_PM Web App 資料分類矩陣：**

| 資料類型 | 欄位範例 | 分類 | 儲存位置 | 存取限制 |
| :--- | :--- | :--- | :--- | :--- |
| 任務資訊 | `title`, `external_id`, `status`, `deadline` | 內部（Internal） | Supabase `tasks_sync` | 依 `project_access` 角色；Viewer 不可存取 L3 明細 |
| 里程碑資訊 | `milestone_name`, `planned_date`, `is_completed` | 內部（Internal） | Supabase `milestones` | 所有角色可讀（受專案歸屬 RLS 過濾） |
| 專案資訊 | `name`, `repo_full_name`, `status` | 內部（Internal） | Supabase `projects` | 依 `project_access` 角色 |
| 用戶個人資料 | `email`, `full_name`, `avatar_url` | **PII（個人識別資訊）** | Supabase `profiles` | 僅本人可讀寫（`id = auth.uid()` RLS） |
| 角色分配 | `user_id`, `project_id`, `role` | 機密（Confidential） | Supabase `project_access` | 僅本人可讀；寫入由 Admin 透過 Dashboard 操作 |
| WBS 原始資料 | `yaml_data` JSONB | 內部（Internal） | Supabase `tasks_sync.yaml_data` | 同任務資訊 |
| **service_role key** | — | **最高機密（Secret）** | GitHub Repository Secrets | 只有 GitHub Actions `wbs_sync.yml` 使用 |
| **anon key** | `VITE_SUPABASE_ANON_KEY` | 半公開（Semi-Public） | `.env.local` + Vercel 環境變數 | 受 RLS 保護，可安全暴露於瀏覽器 |

```
[ ] 上表中所有資料類型已識別並分類完畢
[ ] 沒有未識別的 PII 資料被收集或儲存
[ ] yaml_data JSONB 欄位已確認不含密碼、信用卡號等高度敏感資訊
```

### B.2 資料最小化

```
[ ] 前端所有 Supabase 查詢使用 .select('欄位清單') 指定欄位，不使用 SELECT *
[ ] profiles 表只儲存 email、full_name、avatar_url（來自 Google OAuth/Magic Link），不收集額外資訊
[ ] tasks_sync 表只儲存 WBS 解析後的任務屬性，不儲存完整 markdown 原始碼
```

### B.3 資料傳輸安全

```
[ ] 所有前端 → Supabase 通訊透過 HTTPS（TLS 1.3）：Supabase 強制，無法繞過
[ ] Vercel CDN → 瀏覽器：HTTPS 強制（Vercel 自動重導向 HTTP → HTTPS）
[ ] GitHub Actions → Supabase：HTTPS（Supabase REST API 端點）
[ ] 沒有任何通訊使用明文 HTTP
```

**TLS 憑證管理：** 由 Supabase 和 Vercel 托管服務自動管理，自動更新，無需手動操作。

```
[ ] 已確認 Supabase 專案 URL（VITE_SUPABASE_URL）使用 HTTPS
[ ] 已確認 Vercel 部署 URL 使用 HTTPS
```

### B.4 資料靜態加密（At Rest）

**Supabase 托管加密：**
- Supabase 使用 AES-256 加密靜態資料（PostgreSQL 資料庫層）
- 加密金鑰由 Supabase 管理（AWS KMS），無需前端或 PM 操作

```
[ ] 已確認 Supabase 專案啟用了 Database Encryption（Supabase Dashboard → Settings → Database）
[ ] 沒有敏感資料儲存在前端 localStorage（除 Supabase Auth 自動管理的 session token）
[ ] Supabase Auth session 存儲在 localStorage 是預期行為（JWT 有 1 小時 TTL，60 天 refresh）
```

### B.5 資料使用與處理

```
[ ] 系統日誌（前端 console.error）不記錄 PII（email、full_name）
[ ] Supabase Logs（Dashboard）自動記錄查詢，包含 user_id 但不暴露資料內容
[ ] 前端錯誤訊息不向用戶顯示資料庫內部錯誤（只顯示通用錯誤提示）
[ ] WBS yaml_data JSONB 欄位顯示於 L3 頁面時，只渲染純文字，不執行 HTML
```

### B.6 資料保留與銷毀

| 資料類型 | 保留策略 | 銷毀機制 |
| :--- | :--- | :--- |
| `tasks_sync` | 長期保留（專案進行中） | 專案結束後由 PM 透過 Dashboard 刪除 |
| `profiles` | 用戶存在期間保留 | 用戶請求刪除時，由 Admin 透過 Dashboard 刪除 |
| `project_access` | 角色分配有效期間 | Admin 解除成員時刪除（Dashboard 操作） |
| Supabase Auth `auth.users` | 帳戶存在期間 | 用戶帳戶刪除時自動清理 |
| Supabase 自動備份 | Free 方案：7 天 PITR | 超過保留期自動清除 |

```
[ ] 已告知用戶資料保留政策（隱私聲明或登入頁說明）
[ ] 已確認 Supabase 備份設定（Dashboard → Database → Backups）
```

---

## C. 應用程式安全

### C.1 身份驗證（Authentication）

```
[ ] Google OAuth 登入：由 Supabase Auth 管理，依 OAuth 2.0 標準實作
[ ] Email Magic Link 登入：Supabase Auth 發送，無密碼（客戶使用，避免密碼洩露風險）
[ ] JWT access_token：1 小時 TTL，SDK 自動 refresh；refresh_token：60 天 TTL
[ ] 沒有自建密碼驗證邏輯（完全委託 Supabase Auth）
[ ] 登入後 session 由 Supabase SDK 自動管理（onAuthStateChange）
[ ] 登出時 supabase.auth.signOut() 清除本地 session 與 refresh_token
```

**暴力破解防護（Supabase Auth 內建）：**
```
[ ] Email Magic Link 速率限制：每小時 3 封（Supabase Free tier 內建）
[ ] Google OAuth 速率限制：由 Google 管理
[ ] 已告知客戶 Magic Link 速率限制（「每小時最多請求 3 次」提示）
```

### C.2 授權與存取控制（Authorization & Access Control）

**物件層級授權（Supabase RLS）— 最關鍵的安全驗證：**

```
[ ] projects 表：RLS Policy 已啟用
    驗證：只有 project_access 中有對應記錄的用戶才能讀取
    測試：以 Viewer A 的 JWT 查詢 Viewer A 無權限的專案 → 應回傳 []

[ ] tasks_sync 表：RLS Policy 已啟用
    驗證：tasks_sync.project_id 必須在 project_access 中
    測試：以 Viewer JWT 呼叫 GET /rest/v1/tasks_sync?id=eq.{任意任務ID} → 應回傳 []（非 403）

[ ] milestones 表：RLS Policy 已啟用
    驗證：同 tasks_sync 的 project_id 過濾邏輯
    測試：同上

[ ] profiles 表：RLS Policy 已啟用
    驗證：只能讀取自己的 profile（id = auth.uid()）
    測試：以用戶 A JWT 查詢用戶 B 的 profile → 應回傳 []

[ ] project_access 表：RLS Policy 已啟用
    驗證：只能讀取自己的角色記錄（user_id = auth.uid()）
    測試：以用戶 A JWT 查詢所有 project_access 記錄 → 只回傳自己的記錄
```

**功能層級授權（React RoleGuard）：**

```
[ ] /pm/* 路由：RoleGuard allowedRoles={['admin']}
    測試：以 developer JWT 直接訪問 /pm → 重導向 /forbidden

[ ] /engineer/* 路由：RoleGuard allowedRoles={['admin','developer']}
    測試：以 viewer JWT 訪問 /engineer → 重導向 /forbidden

[ ] /client/:id/tasks/* 路由：不存在（Viewer 無 L3 路由）
    驗證：路由定義中沒有 viewer 可存取的 tasks/:taskId 路由
    測試：Viewer 手動輸入 /client/tasks/{taskId} → 404 或 /forbidden
```

### C.3 輸入驗證與輸出編碼

**SQL 注入防護：**
```
[ ] 所有資料庫查詢透過 Supabase JS SDK 的參數化介面（PostgREST）
[ ] 沒有任何動態拼接 SQL 字串的程式碼
[ ] Supabase SDK .eq(), .lt(), .neq() 等過濾方法自動防止 SQL 注入
```

**XSS 防護：**
```
[ ] React 預設對所有 {value} 表達式進行 HTML 轉義（自動防護）
[ ] 沒有使用 dangerouslySetInnerHTML 的元件
[ ] yaml_data JSONB 欄位的值在 L3 頁面以純文字渲染（不解析 HTML）
[ ] Vercel CSP headers 已設定（Web_App_Frontend_Architecture_Spec.md#9.3）
```

**CSRF 防護：**
```
[ ] Supabase Auth 使用 SameSite Cookie（Lax）+ Bearer Token 組合
[ ] 前端狀態變更操作（唯一的：Admin 成員管理，MVP 為 Dashboard 手動操作）不透過前端 API
[ ] 所有 POST 請求附帶 Authorization: Bearer {JWT} header（Supabase SDK 自動處理）
```

**輸出資料最小化（避免過度暴露）：**
```
[ ] 所有 hooks 的 .select() 只指定需要的欄位
[ ] L1 頁面不回傳 yaml_data 欄位（只有 L3 才需要）
[ ] profiles 表的查詢不回傳 auth.users 的 raw 資料（只回傳 profiles 表欄位）
```

### C.4 API 安全（Supabase REST API 端點）

```
[ ] 所有 Supabase REST API 呼叫必須附帶有效 JWT（anon key + auth session）
[ ] Supabase 內建速率限制：Auth API 3 req/hr（Magic Link）；REST API 500 req/s（共享）
[ ] RLS 在資料庫層執行，即使繞過前端也無法取得未授權資料（服務端過濾）
[ ] GitHub Actions 使用 service_role key：只在 wbs_sync.yml 中使用，不曝露給其他系統
```

**潛在風險評估：**

| 風險 | 可能性 | 影響 | 緩解措施 |
| :--- | :--- | :--- | :--- |
| anon key 被濫用（大量查詢） | 低（需有效 JWT）| 低（RLS 限制資料範圍）| Supabase 速率限制 |
| service_role key 洩露 | 極低（只在 GitHub Secrets）| **極高（完全繞過 RLS）**| 嚴格儲存限制 + GitHub audit log |
| RLS Policy 設定錯誤 | 中 | 高（資料跨越角色暴露）| 驗收測試（見 C.2 測試項目） |
| JWT 被攔截 | 極低（HTTPS 加密）| 中（60 分鐘內有效）| HTTPS 強制；1 小時 TTL |

### C.5 依賴庫安全

```
[ ] 執行 npm audit：確認無 high / critical 漏洞
[ ] GitHub Dependabot 已設定（.github/dependabot.yml）自動掃描 npm 依賴
[ ] 主要依賴版本鎖定（package-lock.json 提交至 Git）
[ ] @supabase/supabase-js：使用最新穩定版 v2.x
[ ] recharts：使用最新穩定版 v2.x（注意 v3 breaking changes）
```

---

## D. 基礎設施與運維安全

### D.1 網路安全

**Vercel 部署（前端）：**
```
[ ] Vercel 預設啟用 DDoS 防護（Anycast CDN 節點）
[ ] HTTPS 強制重導向（Vercel 設定）
[ ] 沒有暴露自建後端伺服器端口（無後端，BaaS 架構）
```

**Supabase 托管（資料庫）：**
```
[ ] Supabase 資料庫只允許 Supabase API 層存取（不直接暴露 PostgreSQL 端口給前端）
[ ] GitHub Actions → Supabase：透過 REST API 端點（HTTPS），不直接連接 PostgreSQL
[ ] Supabase 提供 IP 白名單功能（Post-MVP 可設定 GitHub Actions IP 範圍）
```

### D.2 機密管理（最關鍵章節）

**service_role key（最高機密）：**

```
[ ] 只存在於：GitHub Repository Secrets（SUPABASE_SERVICE_ROLE_KEY）
[ ] 只被：.github/workflows/wbs_sync.yml 使用，且只在 env 區塊注入
[ ] 不存在於：任何 .env 檔案、任何 src/ 程式碼、任何 README、任何 log
```

**驗證指令（Pre-deploy 必做）：**
```bash
# 確認 service_role key 沒有出現在 repo 中
git grep -r "service_role" --include="*.js" --include="*.jsx" --include="*.env" .
# 預期輸出：無任何結果（除了文件說明）

# 確認 .env.local 未被追蹤
git status --porcelain | grep .env
# 預期輸出：無結果（.env.local 在 .gitignore 中）
```

```
[ ] git grep 確認：service_role 字樣不出現在 src/ 下任何 .js / .jsx 檔案
[ ] git grep 確認：SUPABASE_SERVICE_ROLE_KEY 不出現在任何非 .github/ 目錄
[ ] .env.local 已在 .gitignore 中（驗證：git status 不顯示 .env.local）
[ ] Vercel 環境變數：只有 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY（無 service_role）
```

**anon key（半公開，受 RLS 保護）：**
```
[ ] anon key 存放於 .env.local（本機）和 Vercel 環境變數（Production）
[ ] 前端 bundle 中包含 anon key 是預期行為（Vite VITE_ 前綴設計）
[ ] 已確認 Supabase 的所有表格都有 RLS Policy 保護，anon key 無法繞過
```

### D.3 容器安全

**Node_PM Web App 為純靜態前端，部署至 Vercel CDN，無 Docker 容器。**

```
[ ] N/A：前端為靜態資源（HTML/CSS/JS），無自建容器
[ ] Vercel 平台本身的基礎設施安全由 Vercel 負責維護
```

### D.4 日誌與監控

```
[ ] Vercel Analytics：Web Vitals（LCP/CLS/INP）自動採集，可於 Dashboard 查看
[ ] Supabase Dashboard → Logs：查詢日誌、Auth 事件日誌（7 天保留，Free tier）
[ ] 前端 console.error：用於開發除錯（生產環境無法集中收集）
[ ] Post-MVP：引入 Sentry.io（Free tier：5,000 errors/month）進行 JS 錯誤追蹤
```

**安全事件日誌需求：**

| 事件 | 日誌來源 | 可查詢？ |
| :--- | :--- | :--- |
| 用戶登入成功/失敗 | Supabase Dashboard → Auth → Logs | ✅ |
| Magic Link 發送 | Supabase Dashboard → Auth → Logs | ✅ |
| 資料庫查詢（含 RLS 過濾）| Supabase Dashboard → Database → Logs | ✅（7 天）|
| GitHub Actions 執行記錄 | GitHub Actions → Run History | ✅ |
| Vercel 部署記錄 | Vercel Dashboard → Deployments | ✅ |

---

## E. 合規性

### E.1 法規識別

| 法規 | 適用性 | 說明 |
| :--- | :--- | :--- |
| **GDPR（歐盟個資法）** | ⚠️ 部分適用 | 若用戶位於 EU，儲存 email/full_name 屬 PII，需提供刪除權 |
| **台灣個人資料保護法** | ✅ 適用 | 儲存用戶 email、full_name；需有隱私政策告知 |
| **CCPA（加州消費者隱私法）** | 低（取決於用戶地區）| MVP 階段用戶為固定小團隊，暫不需處理 |
| **HIPAA** | ❌ 不適用 | 無醫療資料 |
| **SOC 2** | ❌ 不適用（MVP 階段）| Supabase 本身為 SOC 2 Type II 認證 |

### E.2 合規性措施

**PII 資料（profiles 表：email, full_name）：**
```
[ ] 已告知用戶收集其 email 和 full_name 的用途（登入頁說明或隱私聲明）
[ ] 提供用戶資料刪除機制（MVP：Admin 透過 Supabase Dashboard 手動刪除；Post-MVP：自助刪除功能）
[ ] profiles 表的 RLS 確保用戶只能讀取自己的資料
```

**Supabase 合規認證（代替部分自有合規需求）：**
- Supabase 持有 SOC 2 Type II 認證
- Supabase 資料儲存於 AWS us-east-1（可選擇區域，影響 GDPR 資料主權）

```
[ ] 已確認 Supabase 專案所在區域（Dashboard → Settings → General → Region）
[ ] 若用戶在 EU：考慮選擇 EU 區域（Frankfurt: eu-central-1）
```

---

## F. 審查結論與行動項

### F.1 主要風險識別

| 風險 | 評級 | 說明 |
| :--- | :--- | :--- |
| **service_role key 洩露** | 🔴 **極高** | 若洩露可完全繞過 RLS；需嚴格驗證 GitHub Secrets 設定 |
| **RLS Policy 錯誤設定** | 🔴 **高** | 任一資料表缺少 RLS → 資料跨角色暴露；需 5 張表全部驗收測試 |
| **Viewer 能存取 L3 任務明細** | 🟡 **中** | 前端 RoleGuard 可能有 bug；但 RLS 作為第二道防線 |
| **yaml_data XSS** | 🟡 **中** | 若 yaml_data 含 `<script>`，React 預設轉義可防護，但需確認無 dangerouslySetInnerHTML |
| **Magic Link 速率限制影響客戶體驗** | 🟢 **低** | Supabase Free tier 每小時 3 封，需在 UI 提示 |
| **anon key 濫用** | 🟢 **低** | 受 RLS 保護；即使取得 key 也只能查詢授權資料 |

### F.2 行動項

| # | 行動項描述 | 負責人 | 優先級 | 預計完成 | 狀態 |
| :- | :--- | :--- | :--- | :--- | :--- |
| 1 | 執行 RLS 驗收測試（C.2 節全部 5 個 RLS Policy × 3 角色）| 技術負責人 | 🔴 高 | 上線前 | `[ ] 待辦` |
| 2 | 執行 `git grep` 確認 service_role key 不存在於 repo 任何檔案 | 技術負責人 | 🔴 高 | 上線前 | `[ ] 待辦` |
| 3 | 驗證 Vercel 環境變數：只有 VITE_ 前綴變數，無 service_role | 技術負責人 | 🔴 高 | 上線前 | `[ ] 待辦` |
| 4 | 執行 `npm audit`，確認無 high/critical 漏洞 | 技術負責人 | 🟡 中 | 上線前 | `[ ] 待辦` |
| 5 | 確認 vercel.json CSP headers 已設定並測試（X-Frame-Options, CSP）| 技術負責人 | 🟡 中 | 上線前 | `[ ] 待辦` |
| 6 | 測試 Viewer 角色：手動輸入 /pm、/engineer 路由 → 確認被重導向 | PM | 🟡 中 | 上線前 | `[ ] 待辦` |
| 7 | 確認所有 5 張 Supabase 表格在 Dashboard 中 RLS 為「Enabled」| 技術負責人 | 🔴 高 | 上線前 | `[ ] 待辦` |
| 8 | 撰寫隱私告知說明並加入登入頁（告知收集 email/full_name）| PM | 🟡 中 | 上線後 30 天內 | `[ ] 待辦` |
| 9 | 設定 Dependabot（.github/dependabot.yml）自動掃描依賴漏洞 | 技術負責人 | 🟢 低 | 上線後 | `[ ] 待辦` |
| 10 | Post-MVP：引入 Sentry.io 錯誤追蹤（MVP 暫用 console.error）| 技術負責人 | 🟢 低 | Post-MVP | `[ ] 待辦` |

### F.3 整體評估

**上線前必須完成（阻塞性）：** 行動項 #1、#2、#3、#7（RLS 驗收 + service_role key 安全確認）

**上線後 30 天內完成：** 行動項 #8（隱私告知）

**現有安全強項：**
- Supabase BaaS 架構消除了大部分傳統後端安全風險（無自建伺服器、無密碼管理、無 SQL 注入風險）
- React 預設 XSS 防護 + 無 `dangerouslySetInnerHTML`
- HTTPS 全程強制
- Vercel + Supabase 兩個平台均持有業界認可的安全認證

---

**簽署:**

- **技術審查負責人：** _______________（日期：________）
- **專案 PM：** _______________（日期：________）

---

## G. 生產準備就緒

### G.1 可觀測性（Observability）

**監控工具對應：**

| 監控需求 | 工具 | 設定方式 | 狀態 |
| :--- | :--- | :--- | :--- |
| Core Web Vitals（LCP/CLS/INP）| Vercel Speed Insights | Vercel Dashboard → Analytics | `[ ] 確認已啟用` |
| 頁面訪客 / 使用情況 | Vercel Analytics | Vercel Dashboard → Analytics | `[ ] 確認已啟用` |
| Supabase 查詢延遲 / 錯誤率 | Supabase Dashboard → Logs | 自動記錄 7 天 | `[ ] 知悉並可查閱` |
| Auth 事件（登入/失敗）| Supabase Dashboard → Auth | 自動記錄 | `[ ] 知悉並可查閱` |
| GitHub Actions 執行狀況 | GitHub Actions → Runs | 每次 push 自動記錄 | `[ ] 確認 wbs_sync.yml 存在` |
| JS 運行時錯誤 | 前端 `console.error`（MVP） | 開發者 DevTools（無集中收集）| `[ ] 接受（Post-MVP 再引入 Sentry）` |

```
[ ] Vercel Analytics 已在 Vercel Dashboard 啟用
[ ] 已知悉如何查看 Supabase Dashboard → Logs（資料庫查詢、Auth 事件）
[ ] GitHub Actions wbs_sync.yml 的執行記錄可在 GitHub → Actions 查看
```

**SLI 定義（服務等級指標）：**

| 指標 | 目標值 | 查看方式 |
| :--- | :--- | :--- |
| Supabase 查詢 P95 延遲 | < 500ms | Supabase Dashboard → Logs |
| 前端 FCP | < 2.0s | Vercel Speed Insights |
| 前端 LCP | < 2.5s | Vercel Speed Insights |
| GitHub Actions WBS 同步成功率 | ≥ 99% | GitHub Actions Run History |
| Supabase Auth 可用性 | ≥ 99.9%（Supabase SLA） | Supabase Status Page |

### G.2 可靠性與彈性（Reliability & Resilience）

**健康檢查：**
```
[ ] N/A：前端 SPA 無 /health 端點（靜態資源 CDN 分發）
[ ] Supabase 服務健康：status.supabase.com（建議加入書籤）
[ ] Vercel 服務健康：vercel-status.com
```

**重試與超時（TanStack Query 設定）：**
```
[ ] 所有 useQuery 設定 retry: 2（失敗自動重試 2 次，指數退避）
[ ] Supabase SDK 預設連線超時：30 秒
[ ] 重試 2 次後仍失敗 → error 狀態 → 頁面顯示「服務暫時不可用」
```

```javascript
// 驗證設定是否正確
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,                        // ✅ 重試 2 次
      retryDelay: (attemptIndex) =>
        Math.min(1000 * 2 ** attemptIndex, 30000),  // ✅ 指數退避，上限 30s
      staleTime: 5 * 60 * 1000,        // ✅ 5 分鐘快取
    }
  }
})
```

```
[ ] QueryClient 設定已包含 retry: 2 和指數退避
```

**備份與恢復：**

| 備份類型 | 機制 | 保留期 | 恢復方式 |
| :--- | :--- | :--- | :--- |
| Supabase 自動備份（PITR） | Supabase 托管自動 | 7 天（Free tier）| Dashboard → Database → Backups → Restore |
| GitHub Actions 源碼 | Git 版本控制 | 永久 | Git clone / branch |
| Vercel 部署歷史 | Vercel 自動保存 | 前 100 次部署 | Dashboard → Deployments → Rollback |

```
[ ] 已確認 Supabase 備份設定（Dashboard → Database → Backups）
[ ] 已熟悉 Vercel 回滾流程（Dashboard → Deployments → 選擇舊版本 → Promote to Production）
[ ] 緊急回滾計劃：前端（Vercel 一鍵回滾，< 30 秒）；資料庫（Supabase PITR，需聯繫 Supabase）
```

**故障轉移：**
```
[ ] 前端：Vercel CDN 多節點冗余，單節點故障自動轉移（Vercel 平台管理）
[ ] 資料庫：Supabase 管理的 PostgreSQL 高可用（Supabase 平台管理）
[ ] 前端無法控制 Supabase 故障：在 UI 顯示清晰的錯誤訊息即可
```

### G.3 效能與可擴展性（Performance & Scalability）

**負載特性分析：**

| 指標 | 預估值 | 說明 |
| :--- | :--- | :--- |
| 同時在線用戶 | < 20 人 | 小型 PM 團隊，非公開平台 |
| 任務數量 | < 1,000 筆/專案 | WBS 規模 |
| 里程碑數量 | < 50 筆/專案 | 正常專案規模 |
| GitHub Actions 觸發頻率 | ≤ 10 次/天 | WBS.md 更新頻率 |

**容量規劃：**

| 資源 | 當前方案 | 上限 | 預估用量 | 需升級？ |
| :--- | :--- | :--- | :--- | :--- |
| Supabase Free tier DB | 500MB | 500MB | < 10MB | ❌（充裕）|
| Supabase Free tier Auth | 50,000 MAU | 50,000 MAU | < 20 人 | ❌（充裕）|
| Vercel Free tier Bandwidth | 100GB/月 | 100GB/月 | < 1GB | ❌（充裕）|
| GitHub Actions（Free）| 2,000 min/月 | 2,000 min/月 | < 100 min/月 | ❌（充裕）|

```
[ ] 已確認 Supabase 用量在 Free tier 範圍內（Dashboard → Settings → Billing）
[ ] 已確認 Vercel 用量在 Hobby tier 範圍內（Dashboard → Settings → Billing）
```

**水平擴展：**
```
[ ] 前端為純靜態資源（SPA），Vercel CDN 自動水平擴展，無需配置
[ ] Supabase 資料庫可在需要時升級至 Pro tier（$25/月），提高連線數與儲存空間
[ ] 系統設計為無狀態前端（Server State 全由 TanStack Query 管理），可輕鬆擴展
```

### G.4 可維護性與文件（Maintainability & Documentation）

**部署 Runbook：**

```bash
# === 前端部署（自動）===
# 觸發：git push 到 main → Vercel 自動部署

# === 緊急回滾前端 ===
# 1. 進入 Vercel Dashboard → Deployments
# 2. 找到上一個穩定版本
# 3. 點擊「...」→ Promote to Production
# 預計時間：< 30 秒

# === 手動觸發 WBS 同步 ===
# 1. 進入 GitHub → Actions → WBS Sync
# 2. Run workflow → 選擇 branch → Run
# 或：修改任意 WBS.md 並 push 到 main

# === 緊急停用 GitHub Actions 同步 ===
# 1. GitHub → Settings → Actions → Disable Actions
# 或：修改 wbs_sync.yml 的 on.push.paths 加入不可能匹配的條件
```

**CI/CD 完整性確認：**
```
[ ] GitHub Actions wbs_sync.yml：存在且最後一次執行成功
[ ] GitHub Actions ci.yml（Vitest）：PR 時自動觸發，全部測試通過
[ ] Vercel 自動部署：push 到 main 後 < 2 分鐘完成部署
[ ] Vercel Preview Deploy：PR 開啟時自動建立預覽 URL
```

**設定管理確認：**
```
[ ] 所有環境相關配置透過環境變數（.env.local / Vercel 環境變數），不硬編碼
[ ] vite.config.js 不含環境特定值（只有 build 設定）
[ ] tailwind.config.js 中的設計令牌（顏色、字體）是唯一的樣式來源
[ ] package.json 版本鎖定（package-lock.json 已提交至 Git）
```

**文件完整性確認：**

| 文件 | 用途 | 狀態 |
| :--- | :--- | :--- |
| `Web_App_PRD.md` | 需求與 User Stories | `[ ] 完成` |
| `Web_App_BDD.md` | 驗收情境（Gherkin）| `[ ] 完成` |
| `Web_App_ADR.md` | 架構決策記錄 | `[ ] 完成` |
| `Web_App_Architecture.md` | 系統架構（C4 圖）| `[ ] 完成` |
| `Web_App_API_Specification.md` | Supabase SDK 查詢契約 | `[ ] 完成` |
| `Web_App_Module_Spec_and_Tests.md` | TDD 測試案例 | `[ ] 完成` |
| `Web_App_Project_Structure_Guide.md` | 目錄與命名規範 | `[ ] 完成` |
| `Web_App_File_Dependencies.md` | 模組依賴分析 | `[ ] 完成` |
| `Web_App_Class_Relationships.md` | 類別關係圖 | `[ ] 完成` |
| `Web_App_Frontend_Architecture_Spec.md` | 前端架構規範 | `[ ] 完成` |
| `Web_App_Security_and_Readiness_Checklists.md` | 本文件 | `[ ] 進行中` |
| `README.md`（Repo 根目錄） | 快速入門指南 | `[ ] 待完成` |

**功能開關（Feature Flags）：**
```
[ ] MVP 階段不使用 Feature Flags（規模不需要）
[ ] 高風險新功能（如 Admin 成員管理 Edge Function）上線時，考慮透過 .env.local 的環境變數控制是否啟用
```

---

**文件審核記錄:**

| 日期       | 審核人 | 版本 | 變更摘要 |
| :--------- | :----- | :--- | :------- |
| 2026-06-05 | PM     | v1.0 | 初稿提交 |
