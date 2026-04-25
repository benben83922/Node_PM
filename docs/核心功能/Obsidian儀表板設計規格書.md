# Obsidian 儀表板｜設計規格書

**版本**：v1.0
**文件類型**：核心功能規格
**前置依賴**：文件規範_YAML設計規格書.md（Frontmatter 必須先建立）

---

## 一、功能定位

### 1.1 核心問題

PM 面對多個並行專案時，需要一個「打開就能看懂全局」的可視化介面，而不是每次都要手動翻找文件。現有工具（Notion、Jira）都要求手動在工具內輸入資料，與 Claude Code 產出的 `.md` 文件之間存在不可彌合的落差。

### 1.2 解決方案

**Obsidian** 原生讀取 `.md` 文件，搭配 **Dataview Plugin** 的動態查詢能力，讓所有儀表板視圖從文件的 YAML Frontmatter **自動渲染**，無需任何重複輸入。

```
.md 文件（含 YAML Frontmatter）
        ↓
Obsidian 讀取本地 Vault
        ↓
Dataview 執行查詢 → 動態渲染表格/清單
Mermaid  解析圖表 → 直接渲染架構圖/ERD
Graph View         → 文件關聯節點圖
Kanban             → 任務看板
```

---

## 二、Vault 目錄結構

### 2.1 目錄設計

```
~/ObsidianVault/
  │
  ├── _Index.md                    ← 主儀表板（每日入口）
  ├── _Risk_Board.md               ← 風險與待決看板
  │
  └── _Projects/                   ← 所有專案文件目錄
        ├── _Projects/ProjectA/             ← 對應 GitHub repo
        │   ├── PRD.md
        │   ├── ERD.md
        │   ├── Architecture.md
        │   ├── WBS.md
        │   └── ...
        ├── ProjectAlpha/
        │   └── ...
        └── ProjectBeta/
            └── ...
```

### 2.2 目錄與 GitHub 的對應關係

| Vault 目錄 | 對應 GitHub repo | 同步方式 |
| :--- | :--- | :--- |
| `_Projects/ProjectA/` | `github.com/user/project-a` | git clone + cron pull |
| `_Projects/ProjectAlpha/` | `github.com/user/project-alpha` | git clone + cron pull |

每個 `_Projects/` 底下的子目錄，就是對應 GitHub repo 的本地 clone 路徑。

---

## 三、主儀表板（`_Index.md`）

### 3.1 設計目標

打開 `_Index.md`，PM 在 30 秒內看到：
- 所有專案的文件狀態分布
- 目前有哪些文件是 `draft` 或 `blocked`
- 最近 7 天有哪些文件更新了
- 目前最高風險/優先度的事項

### 3.2 完整內容

````markdown
# 專案管理儀表板

> 最後更新：{{date}}

---

## 📊 多專案文件總覽

```dataview
TABLE
  project AS "專案",
  doc_type AS "文件類型",
  status AS "狀態",
  phase AS "階段",
  priority AS "優先度",
  owner AS "負責人",
  updated AS "更新日期"
FROM "_Projects"
WHERE file.name != "_Index" AND file.name != "_Risk_Board"
SORT project ASC, doc_type ASC
```

---

## 🔴 需要關注（Critical & High）

```dataview
TABLE
  project AS "專案",
  doc_type AS "文件",
  phase AS "階段",
  owner AS "負責人"
FROM "_Projects"
WHERE priority = "critical" OR priority = "high"
WHERE status != "approved" AND status != "deprecated"
SORT priority DESC, updated DESC
```

---

## ⏸ Blocked 事項

```dataview
LIST file.link + "（" + project + " / " + doc_type + "）"
FROM "_Projects"
WHERE phase = "blocked"
SORT updated DESC
```

---

## 📝 草稿待審（Draft）

```dataview
TABLE
  project AS "專案",
  doc_type AS "文件",
  owner AS "負責人",
  updated AS "最後更新"
FROM "_Projects"
WHERE status = "draft"
SORT updated DESC
```

---

## 🕐 最近 7 天更新

```dataview
TABLE
  project AS "專案",
  doc_type AS "文件",
  status AS "狀態",
  updated AS "更新日期"
FROM "_Projects"
WHERE date(updated) >= date(today) - dur(7 days)
SORT updated DESC
```

---

## ✅ 已核准文件

```dataview
LIST file.link + "（" + doc_type + "）"
FROM "_Projects"
WHERE status = "approved"
GROUP BY project
```
````

---

## 四、風險看板（`_Risk_Board.md`）

### 4.1 設計目標

提供一個永遠「置頂顯示風險」的專用頁面，讓 PM 在面對利害關係人問詢時能立即找到：高風險文件、blocked 事項、未決問題。

### 4.2 完整內容

````markdown
# 風險與待決看板

> 更新時間：{{date}}

---

## 🔴 Critical 事項

```dataview
TABLE
  project AS "專案",
  doc_type AS "文件",
  phase AS "目前階段",
  owner AS "負責人",
  updated AS "最後更新"
FROM "_Projects"
WHERE priority = "critical"
WHERE status != "deprecated"
SORT updated ASC
```

---

## ⏸ Blocked 文件

```dataview
TABLE
  project AS "專案",
  doc_type AS "文件",
  priority AS "優先度",
  owner AS "負責人"
FROM "_Projects"
WHERE phase = "blocked"
SORT priority DESC
```

---

## 📋 各專案進度快覽

```dataview
TABLE
  length(filter(rows, (r) => r.status = "approved")) AS "已核准",
  length(filter(rows, (r) => r.status = "in-review")) AS "審核中",
  length(filter(rows, (r) => r.status = "draft")) AS "草稿"
FROM "_Projects"
WHERE file.name != "_Index" AND file.name != "_Risk_Board"
GROUP BY project
```

---

## 🕒 超過 30 天未更新的文件

```dataview
TABLE
  project AS "專案",
  doc_type AS "文件",
  status AS "狀態",
  updated AS "最後更新"
FROM "_Projects"
WHERE date(updated) < date(today) - dur(30 days)
WHERE status != "approved" AND status != "deprecated"
SORT updated ASC
```
````

---

## 五、各專案個別儀表板（選配）

當單一專案文件數量超過 10 份時，建議為每個專案建立獨立的儀表板 `_Projects/ProjectA/_Dashboard.md`：

````markdown
# ProjectA 專案儀表板

## 文件清單
```dataview
TABLE doc_type, status, phase, owner, updated
FROM "_Projects/ProjectA"
WHERE file.name != "_Dashboard"
SORT doc_type ASC
```

## 里程碑進度

> 從 WBS.md 手動摘錄關鍵里程碑，此區域不自動渲染

| 里程碑 | 目標日期 | 狀態 |
|--------|----------|------|
| M1：基礎架構 | Week 2 | ⏳ |
| M2：Iteration 1 | Week 4 | ⏳ |
```
````

---

## 六、Plugin 設定清單

### 6.1 必裝 Plugin

| Plugin | 用途 | 安裝來源 |
| :--- | :--- | :--- |
| **Dataview** | SQL-like 查詢 frontmatter，渲染動態視圖 | Community Plugins |
| **Templater** | 新文件自動帶入 YAML frontmatter 模板 | Community Plugins |
| **Kanban** | 任務看板（拖拉式管理 WBS 任務） | Community Plugins |

### 6.2 選裝 Plugin

| Plugin | 用途 | 必要性 |
| :--- | :--- | :--- |
| **Git** | 在 Obsidian 內觸發 push/pull | 低（cron 腳本已處理） |
| **Calendar** | 時間軸視角，按日期瀏覽 | 低 |
| **Tag Wrangler** | 管理 frontmatter tags | 低 |

### 6.3 內建功能（無需額外安裝）

| 功能 | 說明 |
| :--- | :--- |
| **Mermaid 渲染** | 自動渲染 `.md` 中的 Mermaid 圖表（ERD、架構圖、流程圖） |
| **Graph View** | 文件間的連結關係節點圖 |
| **Backlinks** | 反向連結，查看哪些文件引用了當前文件 |

---

## 七、圖表呈現方式

### 7.1 Mermaid 圖表（原生渲染）

文件中的 Mermaid 程式碼塊在 Obsidian 閱讀模式下自動渲染：

| 圖表類型 | Mermaid 語法 | 典型用途 |
| :--- | :--- | :--- |
| ERD | `erDiagram` | 資料庫實體關係 |
| 系統架構圖 | `graph TB` | C4 系統情境圖 |
| 狀態機 | `stateDiagram-v2` | 里程碑狀態轉換 |
| 流程圖 | `flowchart LR` | 業務流程 |
| 時序圖 | `sequenceDiagram` | API 呼叫順序 |
| 甘特圖 | `gantt` | 專案時程 |

**使用方式**：文件中的 Mermaid 無需任何修改，切換到閱讀模式（Ctrl+E）即可看到渲染結果。

### 7.2 Graph View 設定

在 Obsidian Graph View 中，建議設定：

1. **Filter**：只顯示 `_Projects` 路徑的文件
2. **Groups**：
   - 按 `project` tag 分群（不同顏色代表不同專案）
   - `priority = critical` 的文件顯示較大節點

### 7.3 Kanban 看板

為 WBS 中的任務建立 Kanban 視圖，在 `_Projects/ProjectX/Kanban.md` 建立：

```markdown
---
kanban-plugin: basic
---

## 待開始

- [ ] 1.1.1 專案章程制定

## 進行中

- [ ] 3.2.1 User 資料模型實作

## 審核中

- [ ] 2.2.1 ER 圖設計

## 完成

- [x] 1.2.1 PRD 文件審核與確認
```

---

## 八、使用流程

### 8.1 每日 PM 工作流程

```
早上開機
  ↓
打開 Obsidian → _Index.md
  ↓
查看「需要關注」區塊（Critical & High）
  ↓
查看「最近 7 天更新」（確認文件有同步）
  ↓
處理待辦事項，更新對應文件的 frontmatter
  ↓
git push（自動觸發工程師端同步）
```

### 8.2 接到利害關係人問詢時

```
利害關係人：「A 專案現在到哪裡了？」
  ↓
打開 _Risk_Board.md → 查看 A 專案的文件狀態
  或
在 OpenClaw 輸入：「A 專案目前進度？」
  ↓
30 秒內回答
```

---

**文件版本**：v1.0
**最後更新**：2026-04-25
**狀態**：草稿（Draft）
