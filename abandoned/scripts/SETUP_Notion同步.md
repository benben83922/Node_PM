# WBS → Notion 自動同步 · 設定說明（多專案版）

> `push WBS 到 GitHub` → `Action 只同步本次變動的 WBS` → `Notion 共用 Tasks DB（用 Project 欄區分）`
> 多專案安全：UID 防撞號、結構驗證 fail-fast、同步後數量驗證。

## 組成

| 檔案 | 作用 |
|---|---|
| `scripts/parse_wbs.mjs` | 解析器 + 驗證器（讀 frontmatter 的 project、產 UID） |
| `scripts/wbs_to_tasks.mjs` | 出 CSV（手動匯入用） |
| `scripts/sync_wbs_to_notion.mjs` | 直接 upsert 進 Notion（自動化用，冪等） |
| `.github/workflows/sync_wbs_to_notion.yml` | push 觸發，只同步變動的 WBS |
| `package.json` | 相依 `@notionhq/client` |

---

## 多專案的三個保證

1. **拿到對的檔**：Action 用 `git diff` 只挑「本次 push 改到的 `*WBS*.md`」；手動觸發＝全量。
2. **解析正確**：送 Notion 前先 `validateWbs`，任何 error 直接 exit 1：
   - 解析數 == 原始 `X.Y.Z` 任務列數（抓靜默漏抓，**數量不同也適用**）
   - Task ID 不重複、父里程碑存在、狀態在已知集合、名稱非空
3. **進對位置**：
   - 每筆唯一鍵 `UID = <project>::<TaskID>`，跨專案永不撞號
   - 每筆帶 `Project` 欄，Notion 用 filter/group by Project 看單一專案
   - 同步後查 Notion 該 Project 任務數，和解析數對不上就告警

---

## 每份 WBS 必做：frontmatter 宣告專案

每個專案的 WBS 開頭要有：

```yaml
---
doc_type: WBS
project: TrustCase        # ← 專案身分，決定 Project 欄與 UID 前綴；跟著檔案走
---
```

> `scripts/normalize_md.mjs` 會自動補上 `project:`。本機測試也可用 `--project X` 暫時指定。

建議路徑慣例：`docs/<專案>/...WBS....md`（Action 監聽 `docs/**/*WBS*.md`）。

---

## 一次性設定（約 5 分鐘）

1. **Notion integration**：<https://www.notion.so/my-integrations> → New → 複製 token。
2. **共用 Tasks DB**：建一個 Database（有 Title 欄即可，其餘腳本自動補）；`•••` → Connections 加入該 integration。抓網址裡的 32 碼 DB ID。
3. **GitHub Secrets**（repo Settings → Secrets → Actions）：
   - `NOTION_TOKEN`
   - `NOTION_WBS_DB_ID`

---

## 本機先測

```bash
npm install

# 不需 token，只解析+驗證+看 payload（檔案沒 frontmatter 時用 --project 指定）
node scripts/sync_wbs_to_notion.mjs --dry-run --project TrustCase docs/18/TrustCase_WBS_Development_Plan.md

# 實際同步
export NOTION_TOKEN=secret_xxx
export NOTION_WBS_DB_ID=xxxxxxxx
node scripts/sync_wbs_to_notion.mjs docs/18/TrustCase_WBS_Development_Plan.md   # 有 frontmatter project 後免 --project
```

---

## 之後的日常

改任何專案的 WBS → push → Action 自動只同步那一份 → Notion 對應 Project 的任務更新。
重跑不重複（以 UID upsert）。在 Notion 用 `Project` 欄 group by，就是一個專案一塊看板。
