# WBS 模組進度控管｜設計規格書

**版本**：v1.0
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
| **檔案名稱** | `WBS.md`（每個專案一份） | `_Projects/TrustCase/WBS.md` |
| **存放位置** | 與其他文件同層，在專案目錄根目錄下 | `_Projects/{ProjectName}/WBS.md` |
| **Kanban 看板** | 獨立一份 `Kanban.md`（從 WBS 手動同步任務） | `_Projects/{ProjectName}/Kanban.md` |

### 2.2 YAML Frontmatter 欄位

WBS 文件使用現有核心 7 欄位，加上 3 個 WBS 專用欄位：

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
team:                    # 角色 → 姓名對照表
  PM: 王小明
  TL: 李技術
  BE: 張後端
  FE: 陳前端
---
```

> `total_tasks` 與 `module_count` 為人工維護的索引欄位，供 Dataview 快速聚合用；實際完成率由 Dataview TASK 查詢動態計算。

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
  PM: 王小明
  TL: 李技術
  BE: 張後端
  FE: 陳前端
---

# {ProjectName} WBS

## M1｜{模組名稱}

### M1.1 {子模組名稱}

- [ ] M1.1.1 {任務描述} @PM:王小明 #2026-05-01
- [ ] M1.1.2 {任務描述} @BE:張後端 #2026-05-07
- [x] M1.1.3 {已完成任務} @TL:李技術

### M1.2 {子模組名稱}

- [ ] M1.2.1 {任務描述} @FE:陳前端 #2026-05-10

---

## M2｜{模組名稱}

### M2.1 {子模組名稱}

- [ ] M2.1.1 {任務描述} @BE:張後端 #2026-05-14
- [ ] M2.1.2 {任務描述} @BE:張後端
```

---

## 三、子任務格式規範

### 3.1 基本語法

```
- [ ] {任務 ID} {任務描述} @{角色}:{姓名} #{deadline}
- [x] {任務 ID} {任務描述} @{角色}:{姓名}    ← 已完成
```

### 3.2 欄位說明

| 欄位 | 格式 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| **任務 ID** | `M{模組}.{子模組}.{序號}` | 是 | 例：`M3.2.1`，便於追蹤與引用 |
| **任務描述** | 自然語言 | 是 | 一行描述，動詞開頭（設計、實作、測試、審核） |
| **owner** | `@{角色}:{姓名}` | 是 | 角色縮寫 + 冒號 + 真實姓名，例：`@BE:張後端` |
| **deadline** | `#YYYY-MM-DD` | 建議填 | 截止日期，供 overdue 查詢使用 |

> 角色與姓名的完整對照表定義於 frontmatter 的 `team` 欄位，任務行的 `@角色:姓名` 須與之一致。

### 3.3 完整範例

```markdown
## M3｜金流整合

### M3.1 第三方金流串接

- [x] M3.1.1 評估金流服務商（綠界 vs. 藍新） @PM:王小明 #2026-04-20
- [x] M3.1.2 建立測試商戶帳號 @BE:張後端 #2026-04-22
- [ ] M3.1.3 實作付款 API 串接 @BE:張後端 #2026-05-10
- [ ] M3.1.4 實作退款 API 串接 @BE:張後端 #2026-05-17
- [ ] M3.1.5 金流沙盒環境測試 @BE:張後端 #2026-05-20

### M3.2 訂單狀態機

- [ ] M3.2.1 設計訂單狀態轉換圖 @TL:李技術 #2026-04-30
- [ ] M3.2.2 實作狀態機邏輯 @BE:張後端 #2026-05-12
- [ ] M3.2.3 撰寫狀態轉換單元測試 @BE:張後端 #2026-05-14
```

---

## 四、Dataview 整合設計

### 4.1 WBS 儀表板查詢（加入 `_Index.md`）

在主儀表板 `_Index.md` 新增以下區塊：

````markdown
## 📋 WBS 任務進度總覽

```dataview
TABLE
  project AS "專案",
  total_tasks AS "總任務數",
  module_count AS "模組數",
  status AS "文件狀態",
  phase AS "階段"
FROM "_Projects"
WHERE doc_type = "WBS"
SORT project ASC
```
````

### 4.2 跨專案 Overdue 任務查詢

````markdown
## ⚠️ Overdue 任務

```dataview
TASK
FROM "_Projects"
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
FROM "_Projects"
WHERE !completed
GROUP BY text.split("@")[1].split(" ")[0]
SORT due ASC
```
````

### 4.4 單一專案 WBS 進度視圖（放在專案個別儀表板）

````markdown
## ✅ {ProjectName} 任務完成狀況

```dataview
TASK
FROM "_Projects/ProjectName/WBS"
SORT completed ASC, due ASC
```
````

### 4.5 Dataview 查詢限制說明

| 查詢需求 | Dataview 支援 | 說明 |
| :--- | :--- | :--- |
| 列出所有未完成任務 | ✅ 原生支援 | `TASK WHERE !completed` |
| 按 due date 過濾 | ✅ 支援 `due` 欄位 | 需用 `#YYYY-MM-DD` 格式，Dataview 可自動識別 |
| 計算完成率百分比 | ⚠️ 需用 DQL 計算 | `length(filter(tasks, (t) => t.completed)) / length(tasks)` |
| 按 owner 分組 | ⚠️ 需解析 `@` 文字 | Dataview 無法直接解析 inline `@owner`，需用正規表達式或改以 metadata 格式 |

> **說明**：若 owner 分組查詢不穩定，可改用 Dataview inline metadata 格式：`[owner:: BE]`，放在任務行尾，Dataview 可直接解析為欄位。

---

## 五、Kanban 整合設計

### 5.1 Kanban.md 結構

Kanban 看板與 WBS.md 分開存放，任務從 WBS 手動複製到 Kanban（避免雙重維護造成不一致）。

```markdown
---
kanban-plugin: basic
---

## 待開始

- [ ] M1.1.2 建立測試商戶帳號 @BE #2026-04-22
- [ ] M3.2.1 設計訂單狀態轉換圖 @TL #2026-04-30

## 進行中

- [ ] M3.1.3 實作付款 API 串接 @BE #2026-05-10

## 審核中

- [ ] M2.1.1 PRD 文件審核 @PM #2026-04-28

## 完成

- [x] M3.1.1 評估金流服務商 @PM
- [x] M3.1.2 建立測試商戶帳號 @BE
```

### 5.2 Kanban 與 WBS 的同步原則

| 情境 | 操作方式 |
| :--- | :--- |
| 新增任務 | 先在 WBS.md 新增，再複製到 Kanban |
| 任務完成 | 在 Kanban 拖到「完成」後，同步在 WBS.md 將 `- [ ]` 改為 `- [x]` |
| 任務刪除或拆分 | 以 WBS.md 為準，Kanban 同步調整 |

> **設計決策**：WBS.md 是任務的唯一資料源（Single Source of Truth），Kanban 是操作介面。兩者若不一致，以 WBS.md 為準。

---

## 六、OpenClaw 查詢設計

### 6.1 WBS 相關標準問題集

新增以下測試問題，補充至 OpenClaw 驗收清單：

| 問題 | OpenClaw 查找目標 | 預期回答形式 |
| :--- | :--- | :--- |
| 「X 專案的 WBS 還剩幾個任務？」 | WBS.md 的 `- [ ]` 數量 | 數字 + 列出未完成任務 |
| 「金流模組哪些任務已完成？」 | WBS.md M{金流模組} 的 `- [x]` | 條列已完成任務 |
| 「有哪些任務是張後端負責的？」 | 所有 WBS.md 中含 `@BE:張後端` 的任務行 | 按專案分組列出 |
| 「這週有哪些任務的 deadline 到期？」 | WBS.md 中 `#YYYY-MM-DD` 落在本週的任務 | 條列 + 負責人 |
| 「哪個模組的任務最多還沒完成？」 | WBS.md 各模組的 `- [ ]` 統計 | 排名 + 數量 |

### 6.2 OpenClaw System Prompt 補充

在現有 PM 專用 System Prompt 中加入以下說明：

```
WBS 任務格式：
- 未完成任務以 "- [ ]" 開頭
- 已完成任務以 "- [x]" 開頭
- 任務 ID 格式：M{模組}.{子模組}.{序號}（例：M3.1.2）
- 負責人以 @角色 標記（@PM / @BE / @FE / @TL）
- 截止日期以 #YYYY-MM-DD 標記

回答任務進度問題時，請同時提供：完成數/總數、最近到期的未完成任務。
```

---

## 七、與現有系統的整合點

### 7.1 對 `_Index.md` 的修改

在主儀表板加入第四節「WBS 任務進度總覽」區塊（見第四節查詢）。

### 7.2 對 `_Risk_Board.md` 的修改

加入 Overdue 任務區塊（見 4.2 查詢），使風險看板同時涵蓋文件層風險與任務層風險。

### 7.3 對 YAML Frontmatter 規範的修改

在 `doc_type` 值域新增 `WBS` 為合法值（原有：`PRD / ERD / Architecture / API`），並說明 WBS 文件的兩個新增欄位 `total_tasks` 與 `module_count`。

---

## 八、實作步驟

| 步驟 | 工作項目 | 驗收標準 |
| :--- | :--- | :--- |
| **Step 1** | 為現有專案建立 `WBS.md`，填入 frontmatter 與任務清單 | 至少一個專案有完整 WBS.md |
| **Step 2** | 在 `_Index.md` 加入 WBS 總覽 Dataview 查詢 | 查詢能正確渲染 WBS 文件清單 |
| **Step 3** | 在 `_Risk_Board.md` 加入 Overdue 任務查詢 | Overdue 任務能正確顯示 |
| **Step 4** | 建立 `Kanban.md`，將高優先任務放入看板 | Kanban Plugin 正確渲染欄位 |
| **Step 5** | 更新 OpenClaw System Prompt，測試 WBS 問題集 | 5 題測試問題全數回答正確 |

---

**文件版本**：v1.0
**最後更新**：2026-04-25
**狀態**：草稿（Draft）
