---
project: Node_PM
doc_type: PRD
status: draft
phase: planning
priority: high
owner: PM
updated: 2026-06-05
tags: [web-app, dashboard, prd, react, supabase]
---

# 專案簡報與產品需求文件 (Project Brief & PRD) - Node_PM Web App 團隊進度儀表板

---

**文件版本 (Document Version):** `v1.2`
**最後更新 (Last Updated):** `2026-06-08`
**主要作者 (Lead Author):** `PM`
**審核者 (Reviewers):** `技術負責人`
**狀態 (Status):** `草稿 (Draft)`

---

## 目錄 (Table of Contents)

1. [專案總覽 (Project Overview)](#第-1-部分專案總覽-project-overview)
2. [商業目標 (Business Objectives) - 「為何做？」](#第-2-部分商業目標-business-objectives---為何做)
3. [使用者故事與允收標準 (User Stories & UAT) - 「做什麼？」](#第-3-部分使用者故事與允收標準-user-stories--uat---做什麼)
4. [範圍與限制 (Scope & Constraints)](#第-4-部分範圍與限制-scope--constraints)
5. [待辦問題與決策 (Open Questions & Decisions)](#第-5-部分待辦問題與決策-open-questions--decisions)

---

**目的**：本文件定義 Node_PM 系統模組 G「Web App 團隊進度儀表板」的核心目標、使用者需求與交付範圍，作為後續架構設計、前端開發與驗收測試的唯一事實來源。資料來源依賴模組 E（WBS 進度控管）與模組 F（GitHub Actions 資料管道）所寫入的 Supabase 資料。

---

## 第 1 部分：專案總覽 (Project Overview)

| 區塊 | 內容 |
| :--- | :--- |
| **專案名稱** | Node_PM Web App — 三角色團隊進度儀表板 |
| **模組代號** | Module G |
| **狀態** | 規劃中 |
| **目標發布日期** | Phase 5（Day 8–14，相對於專案啟動日） |
| **核心團隊** | PM: benben83922<br>Lead Engineer: TBD<br>前置依賴：模組 F（GitHub Actions + Supabase）完成驗收 |

---

## 第 2 部分：商業目標 (Business Objectives) - 「為何做？」

| 區塊 | 內容 |
| :--- | :--- |
| **1. 背景與痛點** | PM 同時管理多個並行軟體專案，工程師更新文件後，PM 必須手動打開 Notion 更新進度報告，客戶須等待 PM 匯出才能查看里程碑狀態。三個角色（PM / 工程師 / 客戶）使用不同工具，資訊嚴重碎片化：<br>- PM 無法在 30 秒內掌握多專案全局健康度<br>- 工程師不知道今天跨專案最優先要做什麼<br>- 客戶必須依賴 PM 主動回報，無法自行查看交付進度 |
| **2. 策略契合度** | Web App 是 Node_PM 系統「雙路視覺化」策略的雲端分支：`.md` 文件經 GitHub Actions 解析寫入 Supabase 後，由 Web App 作為**唯一的多角色共用視圖**呈現。這實現了系統核心原則「零重複輸入」——PM 無需在任何工具內手動輸入進度數字，Web App 資料完全由文件派生。 |
| **3. 成功指標 (Success Metrics)** | - **主要指標**：PM 掌握全局所需工具切換次數 ≤ 2（Web App + OpenClaw）<br>- **次要指標**：git push 後 ≤ 2 分鐘 Web App 資料反映最新任務狀態<br>- **次要指標**：三角色（Admin / Developer / Viewer）RBAC 存取範圍 100% 正確，無越權存取 |

---

## 第 3 部分：使用者故事與允收標準 (User Stories & UAT) - 「做什麼？」

### 核心史詩 1：認證與角色控管

| 使用者故事 ID | 描述 (As a, I want to, so that) | 核心允收標準 (UAT) |
| :--- | :--- | :--- |
| **US-001** | **As a** 任意角色使用者,<br>**I want to** 透過 Google OAuth 或 Email 登入 Web App,<br>**so that** 我能安全地存取被授權的專案資料。 | 1. Google OAuth 登入成功後，`profiles` 表自動建立對應記錄。<br>2. Email 登入失敗時顯示明確錯誤訊息。<br>3. 登入後根據 `project_access.role` 自動導向對應角色的儀表板。 |
| **US-002** | **As a** Admin（PM）,<br>**I want to** 在 Web App 管理成員與角色，<br>**so that** 工程師只能看被分配的專案，客戶只看交付摘要。 | 1. Admin 可新增成員並指定角色（admin / developer / viewer）。<br>2. Admin 可移除成員或變更角色。<br>3. Developer 無法看到未被分配的專案列表。<br>4. Viewer 無法存取 L3 任務明細頁面（HTTP 403 或前端隱藏）。 |

---

### 核心史詩 2：PM 視圖（管理者視角）

| 使用者故事 ID | 描述 (As a, I want to, so that) | 核心允收標準 (UAT) |
| :--- | :--- | :--- |
| **US-003** | **As a** PM,<br>**I want to** 在 L1 總覽頁看到所有專案的健康度燈號與本週里程碑，<br>**so that** 我在 30 秒內掌握多專案全局風險。 | 1. 每個專案顯示健康度燈號：🟢 正常（無 Blocked、無 overdue）/ 🟡 注意（有 overdue 或完成率落後 ≤10%）/ 🔴 異常（有 Blocked 或落後 >10%）。<br>2. 本週到期里程碑顯示倒數天數。<br>3. 燈號計算邏輯基於 `tasks_sync` 即時資料，不存靜態欄位。 |
| **US-004** | **As a** PM,<br>**I want to** 點擊專案進入 L2 診斷頁，查看 S-Curve、CFD 與 Blockers 清單，<br>**so that** 我能立即回應利害關係人的風險詢問。 | 1. S-Curve 顯示計畫累積完成率 vs 實際累積完成率（以里程碑 `planned_date` 為基準計算）。<br>2. Overdue 任務清單：`deadline < today AND status != 'Done'`，依 deadline 升冪排序。<br>3. Blocked 任務清單：`status = 'Blocked'`，依 `updated_at` 降冪排序。<br>4. CFD 顯示各狀態任務數量的歷史趨勢（若資料不足則顯示「資料累積中」）。 |
| **US-005** | **As a** PM,<br>**I want to** 在 L3 查看單一任務的完整屬性，<br>**so that** 我能確認負責人、deadline 與原始 WBS 路徑。 | 1. 顯示欄位：任務 ID（external_id）、標題、狀態、負責人 email、deadline、優先度、yaml_data 原始內容。<br>2. 任務 ID 格式符合 WBS 規範（`M{模組}.{子模組}.{序號}`）。 |

---

### 核心史詩 3：工程師視圖（執行視角）

| 使用者故事 ID | 描述 (As a, I want to, so that) | 核心允收標準 (UAT) |
| :--- | :--- | :--- |
| **US-006** | **As a** 工程師,<br>**I want to** 在 L1 看到跨專案我的所有未完成任務，<br>**so that** 我知道今天最優先要做什麼，不需要問 PM。 | 1. 以 `assignee_email = 當前登入用戶 email` 過濾，聚合所有被分配給我的未完成任務。<br>2. 依 deadline 升冪排序，deadline 為空的任務排在最後。<br>3. 顯示每筆任務所屬的專案名稱（`projects.name`）。 |
| **US-007** | **As a** 工程師,<br>**I want to** 在 L2 查看特定專案的 Kanban 視圖，<br>**so that** 我了解專案整體任務分布與技術上下文。 | 1. Kanban 欄位：Todo / Doing / Done / Blocked（對應 `tasks_sync.status`）。<br>2. 每張任務卡顯示：任務 ID、標題、負責人、deadline。<br>3. 只顯示被分配給此 Developer 的專案（RLS 生效）。 |
| **US-008** | **As a** 工程師,<br>**I want to** 在 L3 查看單一任務詳情，<br>**so that** 我能掌握任務描述、deadline 與 WBS 路徑。 | 1. 顯示欄位與 US-005 相同。<br>2. Developer 無法看到其他工程師所屬任務的 L3 詳情（視 RLS 政策決定）。 |

---

### 核心史詩 4：客戶視圖（價值視角）

| 使用者故事 ID | 描述 (As a, I want to, so that) | 核心允收標準 (UAT) |
| :--- | :--- | :--- |
| **US-009** | **As a** 客戶（Viewer）,<br>**I want to** 在 L1 看到整體交付摘要與里程碑達成狀況，<br>**so that** 我能隨時了解專案進度，不需要等 PM 匯報。 | 1. 顯示整體功能完成率圓環（`Done / total` 百分比）。<br>2. 里程碑清單顯示：名稱、計畫完成日、實際完成日（若有）、是否完成。<br>3. Viewer 無法看到 L3 任務明細（前端路由守衛 + RLS 雙重保護）。 |
| **US-010** | **As a** 客戶（Viewer）,<br>**I want to** 在 L2 查看 Roadmap 時間軸，<br>**so that** 我能掌握各功能的預計 Demo 日期與交付順序。 | 1. 以橫軸時間軸呈現所有里程碑（`milestones` 表資料）。<br>2. 已完成里程碑以不同樣式標示（如打勾或灰色）。<br>3. 超過 `planned_date` 但 `is_completed = false` 的里程碑以紅色標示。 |

---

### 核心史詩 5：資料同步與進度計算

| 使用者故事 ID | 描述 (As a, I want to, so that) | 核心允收標準 (UAT) |
| :--- | :--- | :--- |
| **US-011** | **As a** PM,<br>**I want to** git push 後 Web App 在 2 分鐘內自動反映最新任務狀態，<br>**so that** 我不需要手動觸發任何同步動作。 | 1. GitHub Actions 完成 Supabase upsert 後，Web App 下次載入即顯示最新資料。<br>2. Actions 失敗時 GitHub 發送通知，Web App 不崩潰（顯示上次有效資料）。<br>3. 任務完成率由前端從 `COUNT(status='Done') / COUNT(*)` 動態計算，無靜態 `progress` 欄位。 |

---

### 核心史詩 6：可見度強化（v1.1 補強）

| 使用者故事 ID | 描述 (As a, I want to, so that) | 核心允收標準 (UAT) |
| :--- | :--- | :--- |
| **US-012** | **As a** PM,<br>**I want to** 在 PM L1 看到資料同步新鮮度指示器，<br>**so that** 我知道目前儀表板資料是否來自最新一次 GitHub Actions 同步，不會基於舊資料做決策。 | 1. L1 頁面頂部顯示「最後同步：YYYY/MM/DD HH:MM」時間戳。<br>2. 時間戳旁顯示彩色燈號：🟢 < 2 小時 / 🟡 2–24 小時 / 🔴 > 24 小時或無資料。<br>3. 燈號從 `tasks_sync.updated_at` 的 MAX 值動態計算，每分鐘 refetch。 |
| **US-013** | **As a** PM,<br>**I want to** 在 PM L1 頂部看到本週（7 天內）所有專案即將到期的里程碑匯總面板，<br>**so that** 我在進入任一專案詳情前，就能一眼掌握本週的關鍵交付節點。 | 1. 顯示所有 `planned_date` 在今日起 7 天內、`is_completed = false` 的里程碑。<br>2. 每筆顯示：里程碑名稱、所屬專案名稱、距到期天數（0 天 = 「今天到期」，以紅色標示）。<br>3. 點擊可導向對應專案的 L2 診斷頁。<br>4. 若本週無到期里程碑，面板不顯示（不佔空間）。 |
| **US-014** | **As a** 工程師或 PM,<br>**I want to** 在任務清單（PM L3、工程師 L1）及 Kanban 卡片上看到任務優先度，<br>**so that** 我能自行判斷執行順序，不需要再問 PM。 | 1. 任務清單新增「優先度」欄，從 `tasks_sync.yaml_data.priority` 讀取。<br>2. 顯示樣式：High = 紅色、Medium = 黃色、Low = 灰色；無值顯示「—」。<br>3. Kanban 卡片在有優先度時顯示對應色標。<br>4. 若 `yaml_data.priority` 為 null，正常顯示「—」，不報錯。 |
| **US-015** | **As a** 工程師,<br>**I want to** 在 L2 Kanban 頁面標題看到當前專案名稱，<br>**so that** 多 tab 瀏覽時我不會搞混目前操作的是哪個專案。 | 1. EngineerL2Page 標題格式為「{專案名稱} — Kanban」。<br>2. 專案名稱從 `projects` 表動態取得，載入中顯示「載入中…」。<br>3. 頁面提供「← 返回」連結導回工程師 L1。 |

---

### 核心史詩 7：工程師視圖強化（v1.2 補強）

| 使用者故事 ID | 描述 (As a, I want to, so that) | 核心允收標準 (UAT) |
| :--- | :--- | :--- |
| **US-016** | **As a** 工程師,<br>**I want to** 在 L1 看到依時間緊急度分組的任務清單（卡關→逾期→本週到期→之後），<br>**so that** 我一眼就知道今天最緊急要處理的是什麼，不需要手動掃描整個清單。 | 1. 任務清單分為四個獨立區塊，依序顯示：「卡關任務」→「逾期任務」→「本週到期」→「之後 / 未排程」。<br>2. 「本週到期」定義為截止日在今日起 7 天內（含今天）且未逾期的任務。<br>3. 每個區塊顯示任務數量徽章；若該區塊無任務則整個區塊隱藏不佔空間。 |
| **US-017** | **As a** 工程師,<br>**I want to** 卡關任務以醒目視覺效果獨立顯示，並在 L3 任務詳情看到卡關原因，<br>**so that** 我能立刻識別哪些任務需要 PM 介入，以及被卡在哪個環節。 | 1. 卡關區塊以紅色漸層標頭（🚨 圖示）及紅色外框顯示，視覺上明顯與其他區塊區分。<br>2. 每個卡關任務列有 `animate-ping` 動態信標指示燈及紅色左邊框（4px）。<br>3. 若 `yaml_data.reason` 有值，在任務標題下方顯示「🔒 {reason}」卡關原因。<br>4. 工程師 L3 任務詳情頁，若任務卡關且有 reason，獨立顯示「卡關原因」欄（紅色底色區塊）。 |
| **US-018** | **As a** 工程師,<br>**I want to** 在 L1 頂部統計卡看到「進行中（Doing）」任務數量，<br>**so that** 我能監控自己同時進行的任務數，避免過度分散注意力。 | 1. 統計區改為 4 張卡片：進行中（Doing）/ 待辦（Todo）/ 逾期 / 卡關。<br>2. 「進行中」只計算 `status = 'Doing'` 且非卡關的任務；「待辦」只計算 `status = 'Todo'` 且非卡關的任務。<br>3. 有進行中任務時，卡片顯示藍色；有卡關任務時，卡片顯示紅色並有 `animate-ping` 指示燈。 |
| **US-019** | **As a** 工程師,<br>**I want to** 任務清單的截止日欄顯示相對天數（如「逾期 3 天」/ 「今天到期！」/ 「5 天後」），<br>**so that** 我不需要自行計算距離截止日還有多久，降低認知負荷。 | 1. 截止日欄改顯示相對時間：負數→「逾期 N 天」（紅色）、0→「今天到期！」（紅色粗體）、1→「明天 (1d)」（橘色）、2-7→「N 天後」（黃色）、> 7→「N 天後」（灰色）。<br>2. 無截止日的任務顯示「—」。<br>3. 邏輯由 `DeadlineCell` 元件封裝，使用 `lib/formatters.daysUntil` 計算。 |

---

## 第 4 部分：範圍與限制 (Scope & Constraints)

| 區塊 | 內容 |
| :--- | :--- |
| **功能性需求 (In Scope)** | - **認證模組**：Supabase Auth（Google OAuth + Email），自動建立 `profiles` 記錄<br>- **RBAC 模組**：Admin / Developer / Viewer 三角色，基於 `project_access` + RLS<br>- **PM 視圖**：L1 專案組合總覽（健康度燈號、里程碑倒數）/ L2 診斷中心（S-Curve、CFD、Overdue、Blocked 清單）/ L3 任務執行明細<br>- **工程師視圖**：L1 跨專案個人待辦（按 deadline 排序）/ L2 專案 Kanban（Todo/Doing/Done/Blocked）/ L3 任務詳情<br>- **客戶視圖**：L1 交付摘要（完成率圓環、里程碑清單）/ L2 Roadmap 時間軸<br>- **進度計算**：前端從 `tasks_sync` 動態計算完成率，不依賴靜態欄位 |
| **非功能性需求 (NFRs)** | - **同步延遲**：git push 後 ≤ 2 分鐘 Supabase 資料更新，Web App 下次載入即反映<br>- **RBAC 正確性**：三角色存取範圍 100% 符合 RLS 政策，無越權存取<br>- **性能**：L1 頁面在 Supabase 資料量 < 1000 筆任務時，載入時間 ≤ 3 秒<br>- **安全性**：前端使用 `anon` key + RLS；`service_role` key 僅限 GitHub Actions 後端使用，不暴露於前端<br>- **部署**：Vercel 連接 GitHub repo，main branch push 後自動部署 |
| **不做什麼 (Out of Scope)** | - Web App 不提供文件編輯功能（文件唯一寫入路徑為 Claude Code → git push）<br>- 不處理 Kanban 拖拉狀態回寫至 WBS.md（人工維護，WBS.md 為唯一資料源）<br>- 不提供 GitHub repo 直接連結或文件預覽功能（由 Obsidian 負責）<br>- 不實作即時 WebSocket 推播（使用者手動重新整理或定時 refetch 即可）<br>- 不支援 Viewer 存取 L3 任務明細<br>- S-Curve 的「計畫完成率」以里程碑 `planned_date` 線性插值估算，不從 `.md` 解析獨立計畫值 |
| **假設與依賴** | - **假設**：模組 F（GitHub Actions Pipeline）已完成驗收，Supabase 有正確的 `tasks_sync`、`milestones`、`projects` 資料<br>- **假設**：`tasks_sync.status` 只有 `Todo` / `Done` 兩種值由 Actions 寫入；`Doing` / `Blocked` 保留值供未來使用<br>- **假設**：`tasks_sync.assignee_email` 已由 Actions 從 `team` frontmatter 正確解析<br>- **依賴**：Supabase（PostgreSQL + Auth + RLS）<br>- **依賴**：Vercel（前端部署，免費方案適用個人/小團隊）<br>- **依賴**：Recharts（React 生態圖表庫，用於 S-Curve / CFD / 圓環圖） |

---

## 第 5 部分：待辦問題與決策 (Open Questions & Decisions)

| 問題/決策 ID | 描述 | 狀態 | 負責人 |
| :--- | :--- | :--- | :--- |
| **D-001** | 技術棧採用 React + Recharts + Vercel，資料層使用 Supabase（PostgreSQL + RLS + Auth）。 | 已決定 | PM |
| **D-002** | 進度百分比由前端從 `tasks_sync` 動態計算（`Done / total`），Supabase 不存靜態 `progress` 欄位。 | 已決定 | PM |
| **D-003** | Viewer 角色僅能存取 L1 / L2 摘要視圖，L3 任務明細由前端路由守衛與 RLS 雙重保護。 | 已決定 | PM |
| **D-004** | S-Curve 的「計畫完成率」以里程碑 `planned_date` 線性插值估算，不需要額外的計畫任務數欄位。 | 已決定 | PM |
| **Q-001** | 工程師 L2 Kanban 中，`Doing` / `Blocked` 狀態由誰更新（PM 手動在 Supabase 或未來另建介面）？`Doing` 與 `Blocked` 目前為保留值，Actions 只寫入 `Todo` / `Done`。 | 待討論 | PM、Lead Engineer |
| **Q-002** | CFD 圖需要歷史快照資料（各狀態任務數量的時間序列），目前 `tasks_sync` 只存最新狀態，是否需要建立 `tasks_history` 快照表？ | 待討論 | PM、Lead Engineer |
| **Q-003** | Vercel 部署環境變數（`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`）的管理方式——是否使用 Vercel 的 Environment Variables 功能或搭配 `.env.local`？ | 待確認 | Lead Engineer |
| **Q-004** | 客戶（Viewer）登入方式：是否僅限 Google OAuth，或也支援 Email Magic Link 避免客戶需記憶密碼？ | 待討論 | PM |

---

**文件版本**：v1.2
**最後更新**：2026-06-08
**狀態**：草稿（Draft）
