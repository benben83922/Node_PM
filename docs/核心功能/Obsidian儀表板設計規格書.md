---
project: Node_PM
doc_type: FeatureSpec
status: draft
phase: planning
priority: high
owner: PM
updated: 2026-05-06
tags: [obsidian, dashboard, dataview]
---

# Obsidian 儀表板｜設計規格書

**版本**：v1.1
**文件類型**：核心功能規格
**前置依賴**：文件規範_YAML設計規格書.md（Frontmatter 必須先建立）

---

## 一、功能定位

### 1.1 定位說明

Obsidian 定位為 PM 的**個人知識庫**，提供本地 `.md` 文件的閱讀、Mermaid 渲染與知識連結功能。團隊共用的進度儀表板與風險看板由 **Web App** 負責。

| 工具 | 定位 | 對象 |
| :--- | :--- | :--- |
| **Obsidian** | 個人知識庫（開發文件、知識文件、Mermaid 渲染） | PM 個人 |
| **Web App** | 團隊共用進度儀表板 | PM、工程師、客戶 |

### 1.2 Obsidian 保留的核心價值

```
.md 文件（含 YAML Frontmatter）
        ↓
Obsidian 讀取本地 Vault（透過 Obsidian Git 每 1 分鐘 pull）
        ↓
Mermaid  解析圖表 → 直接渲染架構圖/ERD
Graph View         → 文件關聯節點圖
文件全文閱讀       → 含 Frontmatter + 正文的完整知識庫
```

---

## 二、Vault 目錄結構

### 2.1 目錄設計

```
~/ObsidianVault/
  ├── .git/                        ← 父儲存庫
  ├── .gitmodules
  ├── ProjectA/                    ← submodule（對應 GitHub repo，僅含 .md）
  │   ├── PRD.md
  │   ├── ERD.md
  │   ├── Architecture.md
  │   ├── WBS.md
  │   └── ...
  ├── ProjectAlpha/                ← submodule
  │   └── ...
  └── ProjectBeta/                 ← submodule
      └── ...
```

### 2.2 目錄與 GitHub 的對應關係

| Vault 目錄 | 對應 GitHub repo | 同步方式 |
| :--- | :--- | :--- |
| `ProjectA/` | `github.com/user/project-a` | git submodule + Obsidian Git auto pull |
| `ProjectAlpha/` | `github.com/user/project-alpha` | git submodule + Obsidian Git auto pull |

每個 submodule 子目錄直接位於 Vault 根目錄下，稀疏檢出設定確保只同步 `.md` 文件。

---

## 三、各專案個別儀表板（選配）

當單一專案文件數量超過 10 份時，建議為每個專案建立獨立的儀表板 `ProjectA/_Dashboard.md`：

````markdown
# ProjectA 專案儀表板

## 文件清單
```dataview
TABLE doc_type, status, phase, owner, updated
FROM "ProjectA"
WHERE file.name != "_Dashboard"
SORT doc_type ASC
```

## WBS 任務進度總覽
```dataview
TABLE
  total_tasks AS "總任務數",
  module_count AS "模組數",
  status AS "文件狀態",
  phase AS "階段"
FROM "ProjectA"
WHERE doc_type = "WBS"
```
````

> 全專案進度追蹤（多角色、S-Curve、CFD、Overdue 清單）由 Web App 負責；此儀表板僅供 PM 個人本地查閱文件狀態。

---

## 四、Plugin 設定清單

### 4.1 必裝 Plugin

| Plugin | 用途 | 安裝來源 |
| :--- | :--- | :--- |
| **Dataview** | SQL-like 查詢 frontmatter，渲染各專案個別儀表板 | Community Plugins |
| **Templater** | 新文件自動帶入 YAML frontmatter 模板 | Community Plugins |
| **Kanban** | 任務看板（拖拉式管理 WBS 任務） | Community Plugins |
| **Obsidian Git** | 每 1 分鐘自動 pull GitHub 最新文件，支援全體成員同步 | Community Plugins |

### 4.2 選裝 Plugin

| Plugin | 用途 | 必要性 |
| :--- | :--- | :--- |
| **Calendar** | 時間軸視角，按日期瀏覽 | 低 |
| **Tag Wrangler** | 管理 frontmatter tags | 低 |

### 4.3 內建功能（無需額外安裝）

| 功能 | 說明 |
| :--- | :--- |
| **Mermaid 渲染** | 自動渲染 `.md` 中的 Mermaid 圖表（ERD、架構圖、流程圖） |
| **Graph View** | 文件間的連結關係節點圖 |
| **Backlinks** | 反向連結，查看哪些文件引用了當前文件 |

---

## 五、圖表呈現方式

### 5.1 Mermaid 圖表（原生渲染）

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

### 5.2 Graph View 設定

在 Obsidian Graph View 中，建議設定：

1. **Filter**：只顯示含 `project` frontmatter 的文件（Filter: `frontmatter.project`）
2. **Groups**：
   - 按 `project` tag 分群（不同顏色代表不同專案）
   - `priority = critical` 的文件顯示較大節點

### 5.3 Kanban 看板

為 WBS 中的任務建立 Kanban 視圖，在 `ProjectX/Kanban.md` 建立：

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

## 六、使用流程

### 6.1 每日 PM 工作流程

```
早上開機
  ↓
打開 Web App → 查看 PM L1 專案組合總覽（全局風險與進度）
  ↓
打開 Obsidian → 透過 Graph View 或各專案 _Dashboard.md 查閱文件細節
  ↓
處理待辦事項，更新對應文件的 frontmatter
  ↓
git push（自動觸發工程師端同步 + GitHub Actions 更新 Supabase）
```

### 6.2 接到利害關係人問詢時

```
利害關係人：「A 專案現在到哪裡了？」
  ↓
打開 Web App → 查看 A 專案診斷頁（L2）
  或
在 Discord 向 NemoClaw 輸入：「A 專案目前進度？」
  ↓
30 秒內回答
```

---

**文件版本**：v1.1
**最後更新**：2026-05-06
**狀態**：草稿（Draft）
