# Notion 同步 · 討論總整理

> 整理日期：2026-06-02
> 範圍：從「GitHub ↔ Notion 同步規劃」到「WBS → Notion 自動化 pipeline（多專案版）」的完整決策與產出。

---

## 0. 目標

在既有的 **GitHub → Obsidian-Git → 本地 OpenClaw → Discord** 知識系統上，讓文件能同步到 **Notion** 給多人讀／改，並做到自動化：
**產出文件 → push GitHub → GitHub Action 觸發 → Notion 直接看到。**

---

## 1. 同步架構的核心決策

來源：`docs/Notion同步規劃_討論彙整.html`

- **事實來源（single source of truth）放 GitHub**。Notion 是下游。
- 三種模式中選 **A：Notion 唯讀鏡像**（最初），後演進為**受控雙向**。
- 鐵律：沒有真雙向同步＋衝突處理，**不能讓兩個系統同時當寫入主控**。
- 馴服雙向的關鍵：**一份文件只有一個「主人」**（frontmatter `authority`）——系統層級雙向，但每份檔單向，衝突趨近零。
- 紅線：結構化文件（WBS/Dataview）**絕不整頁 `notion-to-md` 反向**；OpenClaw **絕不直接寫 Notion**；每台本地機**不各自推 Notion**。

> 相關產出：`Notion同步流程圖.md`、`Notion同步_本機測試指南.md`

---

## 2. 兩套資料的釐清

| | `docs/18/` | `新增資料夾/`（Notion 匯出） |
|---|---|---|
| 是什麼 | **一個** 軟體平台（TrustCase）的設計規格書 | **一個團隊的多專案管理工作區** |
| 內容 | PRD / ERD / API / Architecture / WBS… 12 份長文 | 25 個 Database，6 層巢狀 |
| 性質 | 長文設計文件 | 任務管理（Tasks 166 列）＋發想＋研究＋會議週報 |

**關鍵發現**：Notion `專案進度追蹤/Tasks` DB 的任務名（API 設計規範、ER 圖設計、WBS 結構設計…）**正是 docs/18 各文件的「產出任務」**——兩邊是同一個專案的不同面向。

---

## 3. docs/18 → Notion 框架對應（純框架）

Notion 框架只有兩種「格子」：

- **A. Database 列（有欄位 schema）** → 放結構化資料
- **B. 頁面內文 / 子頁面** → 放長文

docs/18 對應：

| docs/18 | 對應格子 |
|---|---|
| **WBS 任務表** | **A**：填進 Tasks DB（逐欄）＋ Projects DB（總覽列）|
| 其餘 12 份設計文件 | **B**：只能當頁面長文（框架無「設計文件」型別）|

→ 結論：**只有 WBS 真正能結構化填進 DB**。其餘需要新建容器或當長文。

---

## 4. 文件格式：Obsidian × Notion 雙相容

掃描 `docs/18` 後（詳見 `docs/18/格式修正清單.md`）：

| 類別 | 數量 | 處理 |
|---|---|---|
| metadata 粗體區塊 → YAML frontmatter | 10 檔 | 🔴 必改 |
| H4/H5 標題 → 封頂 H3 | 168 個 | 🔴 必改（readme 用粗體＝策略B，其餘降 H3＝策略A）|
| PRD 表格 `<br>`+清單 → 拆出 | 34 列 | 🔴 必改（29 列需人工）|
| 本地 `.md` 連結 | 6 個 | 🟡 同步時轉 URL |
| TOC 錨點 | 94 個 | 🟢 可留 |
| ~~行內/區塊數學~~ | 誤判 | ✅ 不用改 |
| mermaid(27)、工作清單(14) | — | ✅ 兩邊相容 |

> 產出：`scripts/normalize_md.mjs`（dry-run 預設、CRLF 安全、code-fence 感知；自動處理 ①② + 標記 PRD 待人工列）。決策：readme=B、其餘=A。

---

## 5. 決定：只做 WBS

各專案 WBS 結構相同、數量不同。`TrustCase_WBS_Development_Plan.md`：
- **128 個原子任務**（X.Y.Z），7 大類（後端50/前端25/測試13/管理12/架構11/部署9/文檔8），31 里程碑
- 已正確排除 14 列章節彙總（Projects 層 roll-up，非任務）
- 工時加總 535h（vs 文件宣稱 504h，為原始文件自身數字不一致）

### WBS 任務表 → Tasks DB 欄位對應

| WBS 欄 | → Notion |
|---|---|
| 任務編號 `3.1.1` | Task ID + Parent（階層）|
| 任務名稱 | Name（前綴編號當錨點）|
| 負責人 | Assigned |
| 工時(h) | Eng hours（DB 原無，自動補）|
| 狀態 ⬜/⏳ | Status（⬜→未開始, ⏳→待處理）|
| 週期 W1 | Timeline |
| 依賴關係 | Depends on（DB 原無，自動補）|
| 章節 3.0 | Action Type |
| #### 3.1 | Milestone |
| 全部 | Project = 該專案 |

---

## 6. 最終自動化 pipeline（多專案安全版）

路由模型：**一個共用 Tasks DB，用 `Project` 欄區分專案**。

```
改某專案 WBS.md → git push
   → GitHub Action（只挑本次變動的 *WBS*.md）
   → 解析 + 結構驗證（fail → exit 1，壞資料不進 Notion）
   → 以 UID upsert 進共用 Tasks DB
   → 同步後查 Notion 該 Project 任務數做驗證
```

### 三個多專案保證

1. **拿到對的檔**：`git diff` 只同步本次變動的 `*WBS*.md`；手動觸發＝全量。
2. **解析正確（數量不同也行）**：`validateWbs` 用「**解析數 == 原始 X.Y.Z 列數**」自我比對抓漏抓，加 Task ID 不重複 / 父里程碑存在 / 狀態已知 / 名稱非空。任何 error → CI 中止。
3. **進對位置**：唯一鍵 `UID = <project>::<TaskID>`（跨專案不撞號）＋ 每筆帶 `Project` 欄 ＋ 同步後數量驗證。

### 已驗證

- 正向：TrustCase 128 任務、UID `TrustCase::1.1.1` ✅
- 負向：漏一筆→`127≠128` 擋下；重複 ID→error 擋下 ✅

---

## 7. 產出檔案清單

| 檔案 | 作用 |
|---|---|
| `scripts/parse_wbs.mjs` | 共用解析器＋驗證器（讀 frontmatter project、產 UID） |
| `scripts/wbs_to_tasks.mjs` | WBS → CSV（手動匯入用） |
| `scripts/sync_wbs_to_notion.mjs` | WBS → Notion API upsert（自動化核心，冪等） |
| `.github/workflows/sync_wbs_to_notion.yml` | push 觸發，只同步變動的 WBS |
| `package.json` | 相依 `@notionhq/client` |
| `scripts/SETUP_Notion同步.md` | 一次性設定說明 |
| `scripts/normalize_md.mjs` | docs/18 格式正規化（雙相容） |
| `docs/18/格式修正清單.md` | 格式修正逐項審查清單 |
| `Notion同步流程圖.md` | 架構流程圖（mermaid） |
| `Notion同步_本機測試指南.md` | 本機跑通整條流程的指南 |

---

## 8. 一次性設定（詳見 `scripts/SETUP_Notion同步.md`）

1. 建 Notion integration → 拿 `secret_...` token
2. 建共用 Tasks DB（有 Title 欄即可，其餘自動補）＋ Connections 加入 integration
3. GitHub Secrets：`NOTION_TOKEN`、`NOTION_WBS_DB_ID`
4. 每份 WBS 加 frontmatter `project: <名稱>`（normalize 會自動補）

本機測試：
```bash
npm install
node scripts/sync_wbs_to_notion.mjs --dry-run --project TrustCase docs/18/TrustCase_WBS_Development_Plan.md
```

---

## 9. 未完待辦

- [ ] 幫 `docs/18/TrustCase_WBS_Development_Plan.md` 補 frontmatter `project:`（或跑 `normalize_md.mjs --write`）
- [ ] PRD 29 列含清單儲存格人工拆解（若要把 PRD 也進 Notion）
- [ ] 一次性設定 Notion token / DB / Secrets 後實跑驗證
- [ ] （未來）其餘 11 份設計文件若要進 Notion，需新建「設計文件」DB 或當長文頁
