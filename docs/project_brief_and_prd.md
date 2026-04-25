# 專案簡報與產品需求文件 (Project Brief & PRD) - 本地端個人 PM 系統

---

**文件版本 (Document Version):** `v1.0`
**最後更新 (Last Updated):** `2026-04-25`
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

**目的**: 本文件定義「本地端個人 PM 系統」的核心目標與交付範圍，作為 Obsidian 儀表板、GitHub 同步機制、OpenClaw 查詢層、WBS 進度控管四個模組的唯一需求事實來源。

---

## 第 1 部分：專案總覽 (Project Overview)

| 區塊 | 內容 |
| :--- | :--- |
| **專案名稱** | 本地端個人 PM 系統（Local PM System） |
| **狀態** | 規劃中 |
| **目標發布日期** | 2026-05-02（Phase 4 完成） |
| **核心團隊** | PM: benben83922 |

---

## 第 2 部分：商業目標 (Business Objectives) - 「為何做？」

| 區塊 | 內容 |
| :--- | :--- |
| **1. 背景與痛點** | PM 同時管理多個並行軟體專案，文件由 Claude Code 產出並透過 GitHub 傳遞，但 PM 端缺乏自動化的接收與整理機制。每次確認進度需要在 Notion、GitHub、Claude Code 之間手動切換，且文件缺乏統一的機器可讀 metadata，導致：（1）每次確認進度都需手動翻找文件；（2）多專案並行時全局視角只存在於腦袋中；（3）無法快速回應利害關係人的臨時詢問。 |
| **2. 策略契合度** | 本系統直接服務 PM 的日常工作效率，以「零重複輸入」為核心策略——文件是唯一資料源，工具只負責渲染與查詢。目標是讓 PM 掌握全局所需的工具數從 3+ 降至 2（Obsidian + OpenClaw）。 |
| **3. 成功指標 (Success Metrics)** | - **主要指標**：PM 掌握全局所需工具切換次數 ≤ 2<br>- **次要指標**：git push 後 Obsidian 反映延遲 ≤ 1 分鐘<br>- **次要指標**：OpenClaw 回答準確率 ≥ 90%（10 題標準測試集） |

---

## 第 3 部分：使用者故事與允收標準 (User Stories & UAT) - 「做什麼？」

### 核心史詩 1：文件自動同步

| 使用者故事 ID | 描述 (As a, I want to, so that) | 核心允收標準 (UAT) |
| :--- | :--- | :--- |
| **US-001** | **As a** PM,<br>**I want to** 在工程師 git push 後，Obsidian 自動更新文件內容，<br>**so that** 我不需要手動執行任何同步指令。 | 1. git push 後 1 分鐘內，Obsidian Vault 反映最新文件內容。<br>2. 同步腳本失敗時，log 檔有記錄。<br>3. 多個 GitHub repo 均能被同步涵蓋。 |
| **US-002** | **As a** PM,<br>**I want to** 所有 Claude Code 產出的 `.md` 文件都帶有統一的 YAML Frontmatter，<br>**so that** Dataview 與 OpenClaw 能正確解析文件狀態。 | 1. 新產出文件自動帶入 8 個核心 frontmatter 欄位。<br>2. WBS 文件額外帶入 `total_tasks`、`module_count`、`team` 欄位。<br>3. `doc_type` 值域限定為 `PRD / ERD / Architecture / WBS / API`。 |

### 核心史詩 2：可視化儀表板

| 使用者故事 ID | 描述 (As a, I want to, so that) | 核心允收標準 (UAT) |
| :--- | :--- | :--- |
| **US-003** | **As a** PM,<br>**I want to** 打開 `_Index.md` 就能看到所有專案的文件狀態總覽，<br>**so that** 我在 30 秒內掌握多專案全局。 | 1. Dataview TABLE 正確渲染所有專案文件的 project / doc_type / status / phase。<br>2. `priority = critical` 或 `high` 的文件顯示在「需要關注」區塊。<br>3. 最近 7 天更新的文件顯示在「最近更新」區塊。 |
| **US-004** | **As a** PM,<br>**I want to** 在 `_Risk_Board.md` 查看所有 critical 事項與 overdue WBS 任務，<br>**so that** 我能立即回應利害關係人的風險詢問。 | 1. Critical 文件按最後更新日期升冪排列。<br>2. Overdue 任務（deadline < 今天且未完成）正確顯示。<br>3. 各專案文件完成率（approved / in-review / draft 比例）正確渲染。 |
| **US-005** | **As a** PM,<br>**I want to** 透過 Kanban 看板拖拉管理 WBS 子任務狀態，<br>**so that** 我有一個直覺的操作介面更新任務進度。 | 1. Kanban Plugin 正確渲染「待開始 / 進行中 / 審核中 / 完成」四個欄位。<br>2. 拖拉任務後，手動同步更新 WBS.md 對應的 `- [ ]` / `- [x]`。 |

### 核心史詩 3：自然語言查詢

| 使用者故事 ID | 描述 (As a, I want to, so that) | 核心允收標準 (UAT) |
| :--- | :--- | :--- |
| **US-006** | **As a** PM,<br>**I want to** 用中文口語向 OpenClaw 提問專案進度，<br>**so that** 我不需要打開任何文件就能回答利害關係人。 | 1. 「X 專案目前到哪個 phase？」能正確回答。<br>2. 「哪些文件還在草稿狀態？」能條列回答。<br>3. 「目前最高風險是什麼？」能從 PRD/WBS 風險章節回答。<br>4. 10 題標準測試集答對 9 題以上。 |
| **US-007** | **As a** PM,<br>**I want to** 詢問 WBS 任務層級的進度，<br>**so that** 我能掌握到子任務的執行狀況。 | 1. 「X 模組還剩幾個任務？」能回答數量並列出未完成任務。<br>2. 「張後端負責的任務有哪些？」能跨文件查找 `@BE:張後端`。<br>3. 「這週有哪些 deadline 到期的任務？」能正確過濾日期範圍。 |

---

## 第 4 部分：範圍與限制 (Scope & Constraints)

| 區塊 | 內容 |
| :--- | :--- |
| **功能性需求 (In Scope)** | - **模組 A**：YAML Frontmatter 規範（8 核心欄位 + WBS 專用欄位）<br>- **模組 B**：GitHub → Obsidian 自動同步（Cron Pull，每 1 分鐘）<br>- **模組 C**：Obsidian 儀表板（`_Index.md`、`_Risk_Board.md`、Kanban）<br>- **模組 D**：OpenClaw 自然語言查詢層<br>- **模組 E**：WBS 模組進度控管（`- [ ]` 任務格式 + Dataview TASK 查詢） |
| **非功能性需求 (NFRs)** | - **同步延遲**：git push 後 ≤ 1 分鐘 Obsidian 反映<br>- **本地優先**：所有資料存於本地，不依賴雲端訂閱服務特定功能<br>- **零重複輸入**：文件為唯一資料源，所有視圖由渲染產生，不需手動在工具內輸入 |
| **不做什麼 (Out of Scope)** | - 不建立新的後端服務或資料庫<br>- 不支援多人即時協作（個人使用場景）<br>- 不取代 GitHub 的版控功能，也不取代 Claude Code 的文件產出功能<br>- WBS 完成率不自動計算寫回 frontmatter（由 Dataview 動態計算）<br>- 不處理 Kanban 與 WBS.md 的自動雙向同步（人工維護） |
| **假設與依賴** | - **假設**：工程師持續使用 GitHub 作為版控，且 PM 有本地執行 Cron 的環境<br>- **假設**：Claude Code 能穩定帶入指定格式的 YAML Frontmatter<br>- **依賴**：Obsidian（Dataview、Kanban、Templater Plugins）<br>- **依賴**：OpenClaw 支援讀取本地目錄 `.md` 文件作為知識庫<br>- **待驗證**：OpenClaw 對中文 `.md` 的解析品質 |

---

## 第 5 部分：待辦問題與決策 (Open Questions & Decisions)

| 問題/決策 ID | 描述 | 狀態 | 負責人 |
| :--- | :--- | :--- | :--- |
| **D-001** | 採用 Obsidian + Dataview Plugin 作為可視化儀表板層。 | 已決定 | PM |
| **D-002** | 採用 Cron Pull（每 1 分鐘）作為同步策略，優先於 GitHub Webhook。 | 已決定 | PM |
| **D-003** | YAML Frontmatter 採用 7 個核心欄位 + `tags` 選填欄位；`milestone` 不放入 frontmatter，屬於 WBS 內容。 | 已決定 | PM |
| **D-004** | WBS 子任務使用 `@角色:姓名` 格式標記負責人，角色-姓名對照表定義於 frontmatter `team` 欄位。 | 已決定 | PM |
| **Q-001** | 模組層 deadline 是放在模組標題行（`## M3｜金流整合 #2026-05-20`）還是集中於 frontmatter `module_deadlines` 欄位？ | 待討論 | PM |
| **Q-002** | OpenClaw 對中文 `.md` 的解析品質與大量文件時的查詢延遲，需實際測試後評估。 | 待驗證 | PM |
| **Q-003** | Dataview 按 owner 姓名分組查詢，`@角色:姓名` inline 格式是否能被穩定解析？若不穩定，是否改用 `[owner:: BE:張後端]` inline metadata 格式？ | 待驗證 | PM |

---

**文件版本**：v1.0
**最後更新**：2026-04-25
**狀態**：草稿（Draft）
