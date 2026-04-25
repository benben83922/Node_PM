# 文件規範｜YAML Frontmatter 設計規格書

**版本**：v1.0
**文件類型**：核心功能規格
**依賴模組**：所有其他模組的資料地基

---

## 一、功能定位

### 1.1 核心問題

Claude Code 產出的 `.md` 文件內容豐富，但對「機器」而言，它只是一堆無結構的文字。當 PM 需要回答「現在有哪些文件在 review？B 專案進入哪個 phase 了？」時，唯一的辦法是手動翻找。

**根本原因**：文件沒有統一的機器可讀 metadata，導致：
- Dataview 無法做跨文件查詢
- OpenClaw 無法快速定位相關文件
- 任何自動化流程都無從下手

### 1.2 解決方案

在每份 `.md` 文件頂部加入 **YAML Frontmatter**，讓文件同時具備：

```
人類可讀的正文內容
       +
機器可查詢的結構化 metadata（YAML Frontmatter）
       ↓
Dataview 用 frontmatter 渲染表格與清單
OpenClaw 用 frontmatter 快速定位相關文件
```

---

## 二、Frontmatter 完整規格

### 2.1 標準格式

```yaml
---
project: "專案名稱"
doc_type: PRD
status: draft
phase: planning
priority: medium
owner: PM
updated: 2026-04-25
tags: []
---
```

### 2.2 欄位詳細定義

#### `project`（必填）

| 項目 | 說明 |
| :--- | :--- |
| **類型** | String |
| **格式** | 與 GitHub repo 名稱保持一致 |
| **用途** | 跨文件分組，所有屬於同一專案的文件使用相同值 |
| **範例** | `"ProjectA"` / `"ProjectAlpha"` / `"ClientB-CRM"` |

---

#### `doc_type`（必填）

| 項目 | 說明 |
| :--- | :--- |
| **類型** | Enum |
| **用途** | 識別文件類型，用於 Dataview 過濾 |

| 值 | 說明 | 對應文件範例 |
| :--- | :--- | :--- |
| `PRD` | 產品需求文件 | ProjectA_PRD.md |
| `ERD` | 實體關係圖 | ProjectA_ERD.md |
| `Architecture` | 系統架構 | ProjectA_Architecture.md |
| `WBS` | 工作分解結構 | ProjectA_WBS.md |
| `API` | API 規格 | ProjectA_API_Specification.md |
| `BDD` | 行為驅動測試 | ProjectA_BDD.md |
| `ModuleSpec` | 模組規格 | ProjectA_Module_Specification.md |
| `Sitemap` | 頁面地圖 | sitemap.md |
| `ClassDiagram` | 類別關係圖 | ProjectA_Class_Relationships.md |
| `ProjectStructure` | 專案結構 | ProjectA_Project_Structure.md |
| `Dependencies` | 依賴清單 | ProjectA_Dependencies.md |
| `Strategy` | 策略分析 | ProjectA_策略分析.md |
| `BusinessPlan` | 商業計畫 | ProjectA_商業計畫總覽.md |
| `FeatureSpec` | 功能規格 | 核心功能/*.md |
| `Other` | 其他 | - |

---

#### `status`（必填）

| 值 | 說明 | 下一步 |
| :--- | :--- | :--- |
| `draft` | 草稿，尚未審核 | 送審 → `in-review` |
| `in-review` | 審核中 | 確認 → `approved` |
| `approved` | 已核准，可作為開發依據 | - |
| `deprecated` | 已棄用，保留作歷史記錄 | - |

---

#### `phase`（必填）

| 值 | 說明 |
| :--- | :--- |
| `planning` | 規劃階段（文件定義、設計討論） |
| `dev` | 開發進行中 |
| `testing` | 測試與 QA 階段 |
| `done` | 該文件對應的功能已完成上線 |
| `blocked` | 因外部依賴或風險被阻塞 |

---

#### `priority`（必填）

| 值 | 說明 | Dataview 顯示顏色（慣例） |
| :--- | :--- | :--- |
| `critical` | 最高優先，阻塞其他任務 | 🔴 |
| `high` | 高優先，需本週處理 | 🟠 |
| `medium` | 中優先，正常排程 | 🟡 |
| `low` | 低優先，可延後 | 🟢 |

---

#### `owner`（必填）

| 項目 | 說明 |
| :--- | :--- |
| **類型** | String |
| **值域** | `PM` / `TL` / `BE` / `FE` / `QA` / `Design` / 人名 |
| **用途** | 責任歸屬，用於過濾特定角色的待辦文件 |

---

#### `updated`（必填）

| 項目 | 說明 |
| :--- | :--- |
| **類型** | Date |
| **格式** | `YYYY-MM-DD`（ISO 8601） |
| **用途** | 時間維度過濾（如「7 天內更新的文件」） |
| **注意** | 每次修改文件時手動更新此欄位 |

---

#### `tags`（選填）

| 項目 | 說明 |
| :--- | :--- |
| **類型** | Array of String |
| **格式** | `[tag1, tag2]` |
| **用途** | 彈性標籤，供 Obsidian Graph View 分群、OpenClaw 細粒度過濾 |
| **建議值** | `auth` / `payment` / `backend` / `frontend` / `ai` / `legal` / `risk` |

---

### 2.3 完整範例

#### 範例 A：PRD 文件（規劃中）

```yaml
---
project: "ProjectA"
doc_type: PRD
status: draft
phase: planning
priority: high
owner: PM
updated: 2026-04-25
tags: [product, mvp]
---
```

#### 範例 B：ERD 文件（已核准，開發中）

```yaml
---
project: "ProjectA"
doc_type: ERD
status: approved
phase: dev
priority: critical
owner: TL
updated: 2026-04-20
tags: [database, backend]
```

#### 範例 C：API 文件（審核中，blocked）

```yaml
---
project: "ClientB-CRM"
doc_type: API
status: in-review
phase: blocked
priority: high
owner: BE
updated: 2026-04-22
tags: [api, auth, payment]
---
```

---

## 三、CLAUDE.md 配置

### 3.1 加入 CLAUDE.md 的規範指令

在 `CLAUDE.md` 加入以下內容，讓 Claude Code 每次產出文件時自動帶入 frontmatter：

```markdown
## 文件產出規範

### YAML Frontmatter 必填規則

所有產出的 `.md` 文件開頭必須包含以下 YAML frontmatter，
格式嚴格遵守以下規範：

project: "[專案名稱，與 GitHub repo 名稱一致]"
doc_type: [PRD / ERD / Architecture / WBS / API / BDD / ModuleSpec / Sitemap / ClassDiagram / ProjectStructure / Dependencies / Strategy / BusinessPlan / FeatureSpec / Other]
status: [draft / in-review / approved / deprecated]
phase: [planning / dev / testing / done / blocked]
priority: [critical / high / medium / low]
owner: [PM / TL / BE / FE / QA / Design]
updated: [今天日期，YYYY-MM-DD 格式]
tags: [相關標籤陣列，可為空 []]

範例：
---
project: "ProjectA"
doc_type: PRD
status: draft
phase: planning
priority: high
owner: PM
updated: 2026-04-25
tags: [product, mvp]
---
```

### 3.2 Obsidian Templater 模板

在 Obsidian 中設定 Templater Plugin，新增文件時自動帶入模板：

```markdown
---
project: "<% tp.system.prompt('Project name') %>"
doc_type: "<% tp.system.suggester(['PRD','ERD','Architecture','WBS','API','BDD','ModuleSpec','FeatureSpec','Other'], ['PRD','ERD','Architecture','WBS','API','BDD','ModuleSpec','FeatureSpec','Other']) %>"
status: draft
phase: planning
priority: medium
owner: PM
updated: <% tp.date.now("YYYY-MM-DD") %>
tags: []
---
```

---

## 四、維護規則

### 4.1 更新 `updated` 欄位的時機

| 操作 | 是否更新 updated |
| :--- | :--- |
| 修改文件正文內容 | ✅ 是 |
| 修改 frontmatter 中的 status / phase / priority | ✅ 是 |
| 只是瀏覽或閱讀文件 | ❌ 否 |
| git merge 但無實質內容變更 | ❌ 否 |

### 4.2 欄位值的一致性規則

**嚴格遵守**：
- `doc_type` 值域必須完全對應上方枚舉，不允許自創值（如 `prd`、`Prd`）
- `status` / `phase` / `priority` 的值域必須使用小寫英文

**不允許**：
```yaml
# ❌ 錯誤示範
doc_type: prd         # 應為 PRD
phase: In Progress    # 應為 dev
priority: High        # 應為 high
updated: 25/04/2026   # 應為 2026-04-25
```

### 4.3 文件廢棄流程

文件不刪除，改為 `status: deprecated`，並在文件頂部加入說明：

```markdown
> ⚠️ 此文件已廢棄（Deprecated）。取代文件：[新文件連結]
```

---

## 五、Dataview 查詢速查

### 常用查詢片段

```javascript
// 查詢特定專案所有文件
FROM "ProjectA"
WHERE project = "ProjectA"

// 查詢所有草稿文件
WHERE status = "draft"

// 查詢高優先度且 blocked 的文件
WHERE priority = "critical" AND phase = "blocked"

// 查詢 7 天內更新的文件
WHERE date(updated) >= date(today) - dur(7 days)

// 查詢特定 doc_type
WHERE doc_type = "ERD"
```

---

**文件版本**：v1.0
**最後更新**：2026-04-25
**狀態**：草稿（Draft）
