---
project: Node_PM
doc_type: FeatureSpec
status: draft
phase: planning
priority: high
owner: PM
updated: 2026-05-07
tags: [wbs, tasks, kanban]
---

# WBS 模組進度控管｜設計規格書

**版本**：v1.1
**文件類型**：核心功能規格
**前置依賴**：文件規範_YAML設計規格書.md、Obsidian儀表板設計規格書.md

---

## 一、功能定位

### 1.1 核心問題

現有系統以 YAML Frontmatter 追蹤的是**文件層級**的狀態（`phase`、`status`），但無法回答：

- 「這個模組有幾個子任務？完成了幾個？」
- 「誰負責的任務已經過期了？」
- 「整個專案的任務完成率是多少？」

PM 需要一個能從文件層級**向下展開到任務層級**的進度控管機制。

### 1.2 解決方案

以 **Markdown Task（`- [ ]`）格式**作為子任務的唯一記錄方式，搭配 Dataview 的 `TASK` 查詢能力，實現跨文件的任務進度聚合視圖。

```
WBS.md（各模組子任務 - [ ] / - [x]）
        ↓
Dataview TASK 查詢
        ↓
動態渲染：完成率、overdue 任務、負責人工作清單
        ↓
Kanban Plugin 提供拖拉式操作介面
```

### 1.3 與現有 Frontmatter 系統的關係

WBS 文件是現有 `phase` 追蹤的**向下展開層**，兩者分工明確：

| 層級 | 工具 | 追蹤粒度 | 典型問題 |
| :--- | :--- | :--- | :--- |
| 文件層 | Frontmatter + Dataview | 整份文件的狀態與階段 | 「ERD 現在是草稿還是審核中？」 |
| 任務層 | WBS `- [ ]` + Dataview TASK | 模組內各子任務的完成狀態 | 「金流模組還剩哪些任務沒完成？」 |

---

## 二、WBS 文件規範

### 2.1 命名與存放位置

| 項目 | 規則 | 範例 |
| :--- | :--- | :--- |
| **檔案名稱** | `WBS.md`（每個專案一份） | `TrustCase/WBS.md` |
| **存放位置** | 與其他文件同層，在專案目錄根目錄下 | `{ProjectName}/WBS.md` |
| **Kanban 看板** | 獨立一份 `Kanban.md`（從 WBS 手動同步任務） | `{ProjectName}/Kanban.md` |

### 2.2 YAML Frontmatter 欄位

WBS 文件使用現有 8 個核心欄位，加上 3 個 WBS 專用欄位：

```yaml
---
project: "ProjectName"
doc_type: WBS
status: in-review        # draft / in-review / approved
phase: dev               # planning / dev / testing / done
priority: high
owner: PM
updated: 2026-04-25
tags: [wbs]
# WBS 專用欄位
total_tasks: 24          # 子任務總數（手動填寫，用於快速索引）
module_count: 5          # 模組數量
team:                    # 角色 → {name, email}（email 供 GitHub Actions 查找）
  PM: {name: 王小明, email: pm@example.com}
  TL: {name: 李技術, email: tl@example.com}
  BE: {name: 張後端, email: be@example.com}
  FE: {name: 陳前端, email: fe@example.com}
---
```

> `total_tasks` 與 `module_count` 為人工維護的索引欄位（可能與實際任務行數不同步）；實際完成率由 Web App 從 `tasks_sync` 中的 `- [ ]` 任務行總數動態計算，不依賴此欄位。
>
> **`phase` 欄位說明**：WBS 的 `phase` 代表**整個專案目前所處的宏觀階段**（planning / dev / testing / done / blocked），由 PM 在專案推進時手動更新。詳細任務層級的進度從 WBS 內文的 `- [ ]` 清單讀取，透過 GitHub Actions 寫入 Supabase `tasks_sync`，並同步更新 `projects.current_phase`。

### 2.3 WBS 文件結構模板

```markdown
---
project: "ProjectName"
doc_type: WBS
status: draft
phase: planning
priority: high
owner: PM
updated: 2026-04-25
tags: [wbs]
total_tasks: 0
module_count: 0
team:
  PM: {name: 王小明, email: pm@example.com}
  TL: {name: 李技術, email: tl@example.com}
  BE: {name: 張後端, email: be@example.com}
  FE: {name: 陳前端, email: fe@example.com}
---

# {ProjectName} WBS

## 里程碑 (Milestones)

| ID | 里程碑名稱 | 計畫完成日 | 實際完成日 | 狀態 |
| :--- | :--- | :--- | :--- | :--- |
| M1 | 基礎架構建立 | 2026-05-10 | | 進行中 |
| M2 | MVP 上線 | 2026-05-24 | | 未開始 |

> 此表格由 GitHub Actions 解析並寫入 Supabase `milestones` 表。狀態值為「完成」時 `is_completed = true`，其餘皆為 `false`。

---

## M1｜{模組名稱}

### M1.1 {子模組名稱}

- [ ] M1.1.1 {任務描述} [owner:: PM:王小明] #2026-05-01
- [ ] M1.1.2 {任務描述} [owner:: BE:張後端] #2026-05-07
- [x] M1.1.3 {已完成任務} [owner:: TL:李技術]

### M1.2 {子模組名稱}

- [ ] M1.2.1 {任務描述} [owner:: FE:陳前端] #2026-05-10

---

## M2｜{模組名稱}

### M2.1 {子模組名稱}

- [ ] M2.1.1 {任務描述} [owner:: BE:張後端] #2026-05-14
- [ ] M2.1.2 {任務描述} [owner:: BE:張後端]
```

---

## 三、子任務格式規範

### 3.1 基本語法

```
- [ ] {任務 ID} {任務描述} [owner:: {角色}:{姓名}] #{deadline}
- [x] {任務 ID} {任務描述} [owner:: {角色}:{姓名}]    ← 已完成
```

### 3.2 欄位說明

| 欄位 | 格式 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| **任務 ID** | `M{模組}.{子模組}.{序號}` | 是 | 例：`M3.2.1`，便於追蹤與引用 |
| **任務描述** | 自然語言 | 是 | 一行描述，動詞開頭（設計、實作、測試、審核） |
| **owner** | `[owner:: {角色}:{姓名}]` | 是 | Dataview inline metadata 格式，例：`[owner:: BE:張後端]` |
| **deadline** | `#YYYY-MM-DD` | 建議填 | 截止日期，供 overdue 查詢使用 |

> 角色與姓名的完整對照表定義於 frontmatter 的 `team` 欄位，任務行的 `[owner:: 角色:姓名]` 須與之一致。採用 Dataview inline metadata 格式，Dataview 可直接解析並按負責人分組查詢。

### 3.3 完整範例

```markdown
## M3｜金流整合

### M3.1 第三方金流串接

- [x] M3.1.1 評估金流服務商（綠界 vs. 藍新） [owner:: PM:王小明] #2026-04-20
- [x] M3.1.2 建立測試商戶帳號 [owner:: BE:張後端] #2026-04-22
- [ ] M3.1.3 實作付款 API 串接 [owner:: BE:張後端] #2026-05-10
- [ ] M3.1.4 實作退款 API 串接 [owner:: BE:張後端] #2026-05-17
- [ ] M3.1.5 金流沙盒環境測試 [owner:: BE:張後端] #2026-05-20

### M3.2 訂單狀態機

- [ ] M3.2.1 設計訂單狀態轉換圖 [owner:: TL:李技術] #2026-04-30
- [ ] M3.2.2 實作狀態機邏輯 [owner:: BE:張後端] #2026-05-12
- [ ] M3.2.3 撰寫狀態轉換單元測試 [owner:: BE:張後端] #2026-05-14
```

---

## 四、Dataview 整合設計

### 4.1 WBS 儀表板查詢（個別專案儀表板）

在各專案個別儀表板（`_Dashboard.md`）可加入以下區塊，供 Obsidian 本地查看 WBS 文件狀態（全專案進度儀表板由 Web App 提供）：

````markdown
## 📋 WBS 任務進度總覽

```dataview
TABLE
  project AS "專案",
  total_tasks AS "總任務數",
  module_count AS "模組數",
  status AS "文件狀態",
  phase AS "階段"
FROM ""
WHERE doc_type = "WBS"
SORT project ASC
```
````

### 4.2 跨專案 Overdue 任務查詢

````markdown
## ⚠️ Overdue 任務

```dataview
TASK
FROM ""
WHERE !completed
AND due < date(today)
SORT due ASC
```
````

### 4.3 各負責人待辦清單

````markdown
## 👤 各負責人待辦

```dataview
TASK
FROM ""
WHERE !completed
GROUP BY owner
SORT due ASC
```
````

### 4.4 單一專案 WBS 進度視圖（放在專案個別儀表板）

````markdown
## ✅ {ProjectName} 任務完成狀況

```dataview
TASK
FROM "ProjectName/WBS"
SORT completed ASC, due ASC
```
````

### 4.5 Dataview 查詢限制說明

| 查詢需求 | Dataview 支援 | 說明 |
| :--- | :--- | :--- |
| 列出所有未完成任務 | ✅ 原生支援 | `TASK WHERE !completed` |
| 按 due date 過濾 | ✅ 支援 `due` 欄位 | 需用 `#YYYY-MM-DD` 格式，Dataview 可自動識別 |
| 計算完成率百分比 | ⚠️ 需用 DQL 計算 | `length(filter(tasks, (t) => t.completed)) / length(tasks)` |
| 按 owner 分組 | ✅ 原生支援 | 任務行採用 `[owner:: BE:張後端]` inline metadata，Dataview 直接以 `GROUP BY owner` 查詢 |

---

## 五、Kanban 整合設計

### 5.1 Kanban.md 結構

Kanban 看板與 WBS.md 分開存放，任務從 WBS 手動複製到 Kanban（避免雙重維護造成不一致）。

```markdown
---
kanban-plugin: basic
---

## 待開始

- [ ] M1.1.2 建立測試商戶帳號 [owner:: BE:張後端] #2026-04-22
- [ ] M3.2.1 設計訂單狀態轉換圖 [owner:: TL:李技術] #2026-04-30

## 進行中

- [ ] M3.1.3 實作付款 API 串接 [owner:: BE:張後端] #2026-05-10

## 審核中

- [ ] M2.1.1 PRD 文件審核 [owner:: PM:王小明] #2026-04-28

## 完成

- [x] M3.1.1 評估金流服務商 [owner:: PM:王小明]
- [x] M3.1.2 建立測試商戶帳號 [owner:: BE:張後端]
```

### 5.2 Kanban 與 WBS 的同步原則

| 情境 | 操作方式 |
| :--- | :--- |
| 新增任務 | 先在 WBS.md 新增，再複製到 Kanban |
| 任務完成 | 在 Kanban 拖到「完成」後，同步在 WBS.md 將 `- [ ]` 改為 `- [x]` |
| 任務刪除或拆分 | 以 WBS.md 為準，Kanban 同步調整 |

> **設計決策**：WBS.md 是任務的唯一資料源（Single Source of Truth），Kanban 是操作介面。兩者若不一致，以 WBS.md 為準。
>
> **Kanban 欄位與 Supabase 狀態對照說明**：Kanban 的四個欄位（待開始 / 進行中 / 審核中 / 完成）僅為 PM 本地視覺輔助，**不同步至 Supabase**。Supabase `tasks_sync.status` 只有兩種值：`Todo`（對應 WBS.md `- [ ]`）與 `Done`（對應 `- [x]`）。Web App 的完成率計算以 WBS.md checkbox 狀態為準，與 Kanban 欄位無關。

---

## 六、NemoClaw 查詢設計

### 6.1 WBS 相關標準問題集

新增以下測試問題，補充至 NemoClaw 驗收清單：

| 問題 | NemoClaw 查找目標 | 預期回答形式 |
| :--- | :--- | :--- |
| 「X 專案的 WBS 還剩幾個任務？」 | WBS.md 的 `- [ ]` 數量 | 數字 + 列出未完成任務 |
| 「金流模組哪些任務已完成？」 | WBS.md M{金流模組} 的 `- [x]` | 條列已完成任務 |
| 「有哪些任務是張後端負責的？」 | 所有 WBS.md 中含 `[owner:: BE:張後端]` 的任務行 | 按專案分組列出 |
| 「這週有哪些任務的 deadline 到期？」 | WBS.md 中 `#YYYY-MM-DD` 落在本週的任務 | 條列 + 負責人 |
| 「哪個模組的任務最多還沒完成？」 | WBS.md 各模組的 `- [ ]` 統計 | 排名 + 數量 |

### 6.2 NemoClaw System Prompt 補充

在現有 PM 專用 System Prompt 中加入以下說明：

```
WBS 任務格式：
- 未完成任務以 "- [ ]" 開頭
- 已完成任務以 "- [x]" 開頭
- 任務 ID 格式：M{模組}.{子模組}.{序號}（例：M3.1.2）
- 負責人以 [owner:: 角色:姓名] 格式標記（例：[owner:: BE:張後端] / [owner:: PM:王小明]）
- 截止日期以 #YYYY-MM-DD 標記

回答任務進度問題時，請同時提供：完成數/總數、最近到期的未完成任務。
```

---

## 七、與現有系統的整合點

### 7.1 對個別專案儀表板的修改

在各專案個別儀表板（`_Dashboard.md`）加入第四節「WBS 任務進度總覽」區塊（見 4.1 查詢）。全專案進度追蹤由 Web App 負責。

### 7.2 Web App Overdue 任務

Overdue 任務（`deadline < today AND status != 'Done'`）由 Web App 從 Supabase `tasks_sync` 查詢後在 PM 診斷頁面呈現，不再依賴 Obsidian 的 `_Risk_Board.md`。

### 7.3 對 YAML Frontmatter 規範的修改

`WBS` 已包含在 `doc_type` 合法值域中（詳見文件規範_YAML設計規格書.md）。確認 WBS 文件的三個專用欄位 `total_tasks`、`module_count`、`team` 已正確填入。

---

## 八、實作步驟

| 步驟 | 工作項目 | 驗收標準 |
| :--- | :--- | :--- |
| **Step 1** | 為現有專案建立 `WBS.md`，填入 frontmatter 與任務清單 | 至少一個專案有完整 WBS.md |
| **Step 2** | 在各專案 `_Dashboard.md` 加入 WBS 總覽 Dataview 查詢 | 查詢能正確渲染 WBS 文件清單 |
| **Step 3** | 確認 GitHub Actions 成功將 WBS 任務寫入 Supabase `tasks_sync` | push 後 ≤ 2 分鐘 Supabase 資料更新 |
| **Step 4** | 建立 `Kanban.md`，將高優先任務放入看板 | Kanban Plugin 正確渲染欄位 |
| **Step 5** | 更新 NemoClaw System Prompt，測試 WBS 問題集 | 5 題測試問題全數回答正確 |

---

**文件版本**：v1.1
**最後更新**：2026-05-07
**狀態**：草稿（Draft）
