---
project: Node_PM
doc_type: PRD
status: draft
phase: planning
priority: high
owner: PM
updated: 2026-05-07
tags: [prd]
---

# 專案簡報與產品需求文件 (Project Brief & PRD) - 本地端個人 PM 系統

---

**文件版本 (Document Version):** `v1.1`
**最後更新 (Last Updated):** `2026-05-07`
**主要作者 (Lead Author):** `PM`
**審核者 (Reviewers):** `技術負責人`
**狀態 (Status):** `草稿 (Draft)`

---

## 目錄 (Table of Contents)

1.  [專案總覽 (Project Overview)](#第-1-部分專案總覽-project-overview)
2.  [商業目標 (Business Objectives) - 「為何做？」](#第-2-部分商業目標-business-objectives---為何做)
3.  [使用者故事與允收標準 (User Stories & UAT) - 「做什麼？」](#第-3-部分使用者故事與允收標準-user-stories--uat---做什麼)
4.  [範圍與限制 (Scope & Constraints)](#第-4-部分範圍與限制-scope--constraints)
5.  [待辦問題與決策 (Open Questions & Decisions)](#第-5-部分待辦問題與決策-open-questions--decisions)

---

**目的**: 本文件定義「本地端個人 PM 系統」的核心目標與交付範圍，作為七個功能模組（A：YAML 規範、B：GitHub 同步、C：Obsidian 知識庫、D：NemoClaw 查詢、E：WBS 進度控管、F：GitHub Actions 管道、G：Web App 儀表板）的唯一需求事實來源。

---

## 第 1 部分：專案總覽 (Project Overview)

| 區塊 | 內容 |
| :--- | :--- |
| **專案名稱** | 本地端個人 PM 系統（Local PM System） |
| **狀態** | 規劃中 |
| **目標發布日期** | 進行中 |
| **核心團隊** | PM: benben83922 |

---

## 第 2 部分：商業目標 (Business Objectives) - 「為何做？」

| 區塊 | 內容 |
| :--- | :--- |
| **1. 背景與痛點** | PM 同時管理多個並行軟體專案，文件由 Claude Code 產出並透過 GitHub 傳遞，但 PM 端缺乏自動化的接收與整理機制。每次確認進度需要在 Notion、GitHub、Claude Code 之間手動切換，且文件缺乏統一的機器可讀 metadata，導致：（1）每次確認進度都需手動翻找文件；（2）多專案並行時全局視角只存在於腦袋中；（3）無法快速回應利害關係人的臨時詢問。 |
| **2. 策略契合度** | 本系統直接服務 PM 的日常工作效率，以「零重複輸入」為核心策略——文件是唯一資料源，工具只負責渲染與查詢。目標是讓 PM 掌握全局所需的工具數從 3+ 降至 2（Web App + NemoClaw）。 |
| **3. 成功指標 (Success Metrics)** | - **主要指標**：PM 掌握全局所需工具切換次數 ≤ 2<br>- **次要指標**：git push 後 Obsidian 反映延遲 ≤ 1 分鐘<br>- **次要指標**：NemoClaw 回答準確率 ≥ 90%（10 題標準測試集） |

---

## 第 3 部分：使用者故事與允收標準 (User Stories & UAT) - 「做什麼？」

### 核心史詩 1：文件自動同步

| 使用者故事 ID | 描述 (As a, I want to, so that) | 核心允收標準 (UAT) |
| :--- | :--- | :--- |
| **US-001** | **As a** PM,<br>**I want to** 在工程師 git push 後，Obsidian 自動更新文件內容，<br>**so that** 我不需要手動執行任何同步指令。 | 1. git push 後 1 分鐘內，Obsidian Vault 反映最新文件內容。<br>2. 同步腳本失敗時，log 檔有記錄。<br>3. 多個 GitHub repo 均能被同步涵蓋。 |
| **US-002** | **As a** PM,<br>**I want to** 所有 Claude Code 產出的 `.md` 文件都帶有統一的 YAML Frontmatter，<br>**so that** Dataview 與 NemoClaw 能正確解析文件狀態。 | 1. 新產出文件自動帶入 8 個核心 frontmatter 欄位。<br>2. WBS 文件額外帶入 `total_tasks`、`module_count`、`team` 欄位。<br>3. `doc_type` 值域限定為 `PRD / ERD / Architecture / WBS / API / BDD / ModuleSpec / Sitemap / ClassDiagram / ProjectStructure / Dependencies / Strategy / BusinessPlan / FeatureSpec / Other`（詳見文件規範_YAML設計規格書.md）。 |

### 核心史詩 2：可視化儀表板

| 使用者故事 ID | 描述 (As a, I want to, so that) | 核心允收標準 (UAT) |
| :--- | :--- | :--- |
| **US-003** | **As a** PM,<br>**I want to** 打開 Web App 就能看到所有專案的健康度與進度總覽，<br>**so that** 我在 30 秒內掌握多專案全局。 | 1. Web App L1 正確顯示各專案健康度燈號（正常/注意/異常）。<br>2. Blocked 任務或 overdue deadline 觸發異常燈號。<br>3. 本週到期里程碑在 L1 顯示倒數。 |
| **US-004** | **As a** PM,<br>**I want to** 在 Web App 診斷頁查看 S-Curve 偏差、Blocked 事項與 overdue WBS 任務，<br>**so that** 我能立即回應利害關係人的風險詢問。 | 1. S-Curve 顯示計畫完成率 vs 實際完成率偏差。<br>2. Overdue 任務（deadline < 今天且 status != Done）正確顯示。<br>3. Blocked 任務清單依最後更新時間排序。 |
| **US-005** | **As a** PM,<br>**I want to** 透過 Kanban 看板拖拉管理 WBS 子任務狀態，<br>**so that** 我有一個直覺的操作介面更新任務進度。 | 1. Kanban Plugin 正確渲染「待開始 / 進行中 / 審核中 / 完成」四個欄位。<br>2. 拖拉任務後，手動同步更新 WBS.md 對應的 `- [ ]` / `- [x]`。 |

### 核心史詩 3：自然語言查詢

| 使用者故事 ID | 描述 (As a, I want to, so that) | 核心允收標準 (UAT) |
| :--- | :--- | :--- |
| **US-006** | **As a** PM,<br>**I want to** 在 Discord 向 NemoClaw 提問專案進度，<br>**so that** 我不需要打開任何文件就能回答利害關係人。 | 1. 「X 專案目前到哪個 phase？」能正確回答。<br>2. 「哪些文件還在草稿狀態？」能條列回答。<br>3. 「目前最高風險是什麼？」能從 PRD/WBS 風險章節回答。<br>4. 10 題標準測試集答對 9 題以上。 |
| **US-007** | **As a** PM,<br>**I want to** 詢問 WBS 任務層級的進度，<br>**so that** 我能掌握到子任務的執行狀況。 | 1. 「X 模組還剩幾個任務？」能回答數量並列出未完成任務。<br>2. 「張後端負責的任務有哪些？」能跨文件查找 `[owner:: BE:張後端]`。<br>3. 「這週有哪些 deadline 到期的任務？」能正確過濾日期範圍。 |

### 核心史詩 4：資料管道與 Web App

| 使用者故事 ID | 描述 (As a, I want to, so that) | 核心允收標準 (UAT) |
| :--- | :--- | :--- |
| **US-008** | **As a** PM,<br>**I want to** git push 後 Supabase 自動更新任務資料，<br>**so that** Web App 的進度數字不需要我手動輸入。 | 1. push 後 ≤ 2 分鐘 Supabase `tasks_sync` 資料更新。<br>2. Actions 失敗時 GitHub 發送通知，可手動重觸發。<br>3. 任務 assignee_email 從 `team` frontmatter 正確解析。 |
| **US-009** | **As a** PM,<br>**I want to** 以 Admin 角色在 Web App 管理成員權限，<br>**so that** 工程師只能看自己負責的專案，客戶只看到交付摘要。 | 1. Admin 可新增/移除成員並指定角色（admin / developer / viewer）。<br>2. Developer 只能看到被分配的專案。<br>3. Viewer 只能看到 L1、L2 摘要，無法看到 L3 任務明細。 |
| **US-010** | **As a** 工程師,<br>**I want to** 在 Web App 查看我的跨專案個人待辦與專案 Kanban，<br>**so that** 我知道今天要做什麼，不需要問 PM。 | 1. L1 聚合顯示所有被分配給我的未完成任務。<br>2. L2 顯示該專案完整 Kanban 視圖（Todo / Doing / Done / Blocked）。<br>3. Supabase Realtime 即時反映任務狀態，無需手動重新整理。 |
| **US-011** | **As a** 客戶,<br>**I want to** 在 Web App 查看交付摘要與里程碑時間軸，<br>**so that** 我能隨時了解專案進度，不需要等 PM 匯出報告。 | 1. L1 顯示整體完成率圓環與里程碑達成狀態。<br>2. L2 顯示 Roadmap 時間軸與各功能預計 Demo 日期。<br>3. Viewer 無法存取 L3 任務明細。 |

---

## 第 4 部分：範圍與限制 (Scope & Constraints)

| 區塊 | 內容 |
| :--- | :--- |
| **功能性需求 (In Scope)** | - **模組 A**：YAML Frontmatter 規範（8 核心欄位 + WBS 專用欄位）<br>- **模組 B**：GitHub → Obsidian 自動同步（Obsidian Git 外掛，每 1 分鐘，支援全體成員）<br>- **模組 C**：Obsidian 作為 PM 個人知識庫（Mermaid 渲染、Graph View、文件閱讀）<br>- **模組 D**：NemoClaw + Discord Agent 自然語言查詢層（PM 個人使用）<br>- **模組 E**：WBS 模組進度控管（`- [ ]` 任務格式 + 里程碑結構化區塊）<br>- **模組 F**：GitHub Actions 資料同步管道（`.md` 文件變更 → Supabase）<br>- **模組 G**：Web App 團隊進度儀表板（PM / 工程師 / 客戶三角色，資料來源 Supabase） |
| **非功能性需求 (NFRs)** | - **同步延遲（Obsidian）**：git push 後 ≤ 1 分鐘 Obsidian 反映<br>- **同步延遲（Supabase）**：git push 後 GitHub Actions 完成寫入 ≤ 2 分鐘<br>- **本地優先（知識庫）**：Obsidian 所有資料存於本地<br>- **零重複輸入**：文件為唯一資料源，Supabase 與 Obsidian 均由文件派生，不需手動在工具內輸入<br>- **RBAC**：Web App 依角色（Admin / Developer / Viewer）控制可見專案與功能層級 |
| **不做什麼 (Out of Scope)** | - 不取代 GitHub 的版控功能，也不取代 Claude Code 的文件產出功能<br>- WBS 完成率不寫回 frontmatter（由 Web App 從 tasks_sync 動態計算）<br>- 不處理 Kanban 與 WBS.md 的自動雙向同步（人工維護）<br>- Web App 不提供文件編輯功能（文件由 Claude Code 產出，唯讀顯示） |
| **假設與依賴** | - **假設**：工程師持續使用 GitHub 作為版控，且所有成員的本地機器已安裝 Obsidian 與 Git<br>- **假設**：Claude Code 能穩定帶入指定格式的 YAML Frontmatter<br>- **依賴**：Obsidian（Obsidian Git、Templater Plugins）<br>- **依賴**：Supabase（PostgreSQL + Auth + Realtime + RLS）<br>- **依賴**：NemoClaw + Discord Agent（Docker 沙盒 + Discord Bot）讀取本地 Vault<br>- **待驗證**：NemoClaw 對中文 `.md` 的解析品質 |

---

## 第 5 部分：待辦問題與決策 (Open Questions & Decisions)

| 問題/決策 ID | 描述 | 狀態 | 負責人 |
| :--- | :--- | :--- | :--- |
| **D-001** | 採用 Obsidian + Dataview Plugin 作為可視化儀表板層（進度儀表板功能已由 D-007 更新為 Web App；Obsidian 保留為 PM 個人知識庫）。 | 已決定 | PM |
| **D-002** | 採用 Obsidian Git 外掛（每 1 分鐘 Auto pull）作為同步策略，支援全體成員免 Terminal 設定。 | 已決定 | PM |
| **D-003** | YAML Frontmatter 採用 8 個核心欄位（`project / doc_type / status / phase / priority / owner / updated / tags`）；`milestone` 不放入 frontmatter，屬於 WBS 內容。 | 已決定 | PM |
| **D-004** | WBS 子任務使用 `[owner:: 角色:姓名]` Dataview inline metadata 格式標記負責人（例：`[owner:: BE:張後端]`），`team` 欄位採 `{name, email}` 結構供 GitHub Actions 查找 email。 | 已決定 | PM |
| **D-005** | 採用 Supabase 作為 Web App 資料層，GitHub Actions 從 repo 內 `.md` 文件解析後寫入。 | 已決定 | PM |
| **D-006** | Web App 進度百分比由前端從 `tasks_sync` 動態計算，不在 Supabase 存靜態 `progress` 欄位。 | 已決定 | PM |
| **D-007** | Obsidian 定位為 PM 個人知識庫，移除 `_Index.md` / `_Risk_Board.md` 儀表板；團隊進度改由 Web App 呈現。 | 已決定 | PM |
| **Q-001** | 模組層 deadline 是放在模組標題行（`## M3｜金流整合 #2026-05-20`）還是集中於 frontmatter `module_deadlines` 欄位？ | 待討論 | PM |
| **Q-002** | NemoClaw 對中文 `.md` 的解析品質與大量文件時的查詢延遲，需實際測試後評估。 | 待驗證 | PM |
| **D-008** | WBS 負責人格式採用 `[owner:: 角色:姓名]` Dataview inline metadata 格式，廢棄 `@角色:姓名` 格式；Dataview `GROUP BY owner` 可直接解析。 | 已決定 | PM |

---

**文件版本**：v1.1
**最後更新**：2026-05-07
**狀態**：草稿（Draft）
