# Notion 同步 · 本機測試指南

> 目標：在自己一台機器上，用你自己的 **GitHub + Obsidian + Notion**，把整條流程（正向＋反向）跑通。
> 重點：本機測試**不需要 GitHub Actions**——正向同步就是手動跑 `node` 腳本；Action 只是「push 時自動幫你跑同一支腳本」，最後再加即可。

---

## 心智模型：本機要模擬的角色

```
你的 Obsidian vault (= 一個 git repo)  ←→  你的 GitHub repo
        │
   node 腳本 (正向/反向)
        ▼
   你的 Notion Database
```

整條流程在**一台機器**就能演完，不需要三個人。

---

## Phase 0 — 準備

- Node（v22 即可）
- 一個**測試用 GitHub repo**（空的就好，例如 `notion-sync-test`）
- Obsidian + **Obsidian Git** 外掛
- Notion 帳號

把 GitHub repo clone 下來、用 Obsidian「Open folder as vault」打開它——這樣 **vault = git repo**，是整套架構的基礎。

---

## Phase 1 — Notion 設定（約 5 分鐘）

1. 開 <https://www.notion.so/my-integrations> → **New integration** → 取得 `secret_xxx` token。
2. 在 Notion 建一個 **Database**（Table view），加這些 properties（對應 frontmatter）：

   | property | 型別 | 用途 |
   |---|---|---|
   | `Name` | Title | 文件標題 |
   | `project` / `status` / `owner` | Select / Text | 對應同名 frontmatter |
   | `updated` | Date | |
   | `_filepath` | Text | **唯一鍵**（同步靠它配對） |
   | `authority` | Select（`github`/`notion`） | 決定反向是否同步這份 |

3. 在 Database 右上 `•••` → **Connections** → 把剛建的 integration 加進來（**這步沒做 API 會 404**）。
4. 從網址抓 **Database ID**：`notion.so/<工作區>/<這段32碼就是DB_ID>?v=...`

---

## Phase 2 — 本機專案

在 vault 根目錄：

```bash
npm init -y
npm install @notionhq/client @tryfabric/martian notion-to-md gray-matter dotenv
```

建 `.env`（**加進 `.gitignore`，別 commit**）：

```
NOTION_TOKEN=secret_你的token
NOTION_DB_ID=你的32碼DB_ID
```

---

## Phase 3 — 正向：`sync_to_notion.mjs`（GitHub→Notion）

```js
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { Client } from '@notionhq/client';
import { markdownToBlocks } from '@tryfabric/martian';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB = process.env.NOTION_DB_ID;
const file = process.argv[2];
if (!file) { console.error('用法: node sync_to_notion.mjs <file.md>'); process.exit(1); }

const raw = fs.readFileSync(file, 'utf8');

// 🛡️ 防呆：含 git 衝突標記就拒推
if (raw.includes('<<<<<<<')) { console.error(`⛔ ${file} 含衝突標記，拒絕同步`); process.exit(1); }

const { data: fm, content } = matter(raw);
const filepath = path.relative(process.cwd(), file).replace(/\\/g, '/');
const title = fm.title || path.basename(file, '.md');

const props = {
  Name:      { title: [{ text: { content: title } }] },
  _filepath: { rich_text: [{ text: { content: filepath } }] },
};
if (fm.project) props.project = { select: { name: String(fm.project) } };
if (fm.status)  props.status  = { select: { name: String(fm.status) } };
if (fm.owner)   props.owner   = { rich_text: [{ text: { content: String(fm.owner) } }] };
if (fm.updated) props.updated = { date: { start: String(fm.updated) } };

const blocks = markdownToBlocks(content);

const q = await notion.databases.query({
  database_id: DB,
  filter: { property: '_filepath', rich_text: { equals: filepath } },
});

let pageId;
if (q.results.length) {                          // upsert: 已存在 → 更新 + 清空舊正文
  pageId = q.results[0].id;
  await notion.pages.update({ page_id: pageId, properties: props });
  const kids = await notion.blocks.children.list({ block_id: pageId, page_size: 100 });
  for (const b of kids.results) await notion.blocks.delete({ block_id: b.id });
} else {                                         // 不存在 → 建新頁
  pageId = (await notion.pages.create({ parent: { database_id: DB }, properties: props })).id;
}

for (let i = 0; i < blocks.length; i += 100)     // Notion 一次最多 100 blocks
  await notion.blocks.children.append({ block_id: pageId, children: blocks.slice(i, i + 100) });

console.log(`✅ 正向同步: ${filepath} → ${pageId}`);
```

**測試**：建一份 `test.md`：

```markdown
---
title: 測試文件
project: NodePM
status: 進行中
owner: 你
updated: 2026-06-02
---

# 標題
這是一段正文，**粗體**、`code`、

- 清單一
- 清單二
```

跑：

```bash
node sync_to_notion.mjs test.md
```

→ 去 Notion DB 看，應該出現一筆，frontmatter 進了 properties、正文變成 blocks。**這就是綠燈路徑，先把它玩穩。**

---

## Phase 4 — 反向：兩種，看文件類型

反向的鐵律：**結構化文件（WBS/Dataview）絕不整頁轉回**，只有純內容文件才整頁 `notion-to-md`。

### 4a. 內容文件（`authority: notion`）— `sync_from_notion.mjs`

```js
import 'dotenv/config';
import fs from 'node:fs';
import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });
const DB = process.env.NOTION_DB_ID;

const res = await notion.databases.query({ database_id: DB });
for (const page of res.results) {
  const p = page.properties;
  if (p.authority?.select?.name !== 'notion') continue;   // 🔑 只反向 notion 當主人的
  const filepath = p._filepath?.rich_text?.[0]?.plain_text;
  if (!filepath) continue;

  const body = n2m.toMarkdownString(await n2m.pageToMarkdown(page.id)).parent;
  const fm = ['---',
    `title: ${p.Name?.title?.[0]?.plain_text || ''}`,
    p.project?.select && `project: ${p.project.select.name}`,
    p.status?.select  && `status: ${p.status.select.name}`,
    'authority: notion', '---'].filter(Boolean).join('\n');

  fs.writeFileSync(filepath, fm + '\n\n' + body);
  console.log(`⬅️  反向: ${filepath}`);
}
```

**測試**：在 Notion 改一份 `authority=notion` 的頁面正文 → 跑 `node sync_from_notion.mjs` → **`git diff` 確認**本機 `.md` 變了 → `git commit && push`。

### 4b. WBS 任務狀態 — 不整頁轉，只 patch 單行（核心防失真）

#### 問題的根源

WBS 文件混了一堆 Obsidian 專屬語法（inline field、dataview、巢狀縮排）：

```markdown
## 里程碑 M3

- [ ] M3.1.3 設計資料庫 schema [owner:: BE:張後端] [due:: 2026-07-01]
- [x] M3.1.4 建立 API 端點 [owner:: BE:李工程師]

```dataview
TASK FROM "專案" WHERE status = "進行中"
```
```

非技術人員想做的事很單純：**把 `M3.1.3` 打勾**（`[ ]` → `[x]`）。

#### 為什麼「整頁轉回」會出事

如果用 `notion-to-md` 把**整頁**轉回 markdown，它會把整份文件**重新序列化**，而轉換器看不懂 Obsidian 語法，會弄壞它們：

```markdown
- [x] M3.1.3 設計資料庫 schema \[owner:: BE:張後端\]   ← inline field 被跳脫
                                  ↑ Supabase 解析 regex 會失敗
```

你**以為**只改一個字元 `[ ]→[x]`，實際 git 看到的卻是**「整份檔案被重排」的大 diff**——owner、dataview、縮排全壞。這就是「失真」。

#### 解法：外科手術式只改那一行

不碰整份檔案，只精準翻轉**目標那一行**：

```js
// 假設從 Notion 讀到：任務 M3.1.3 狀態變成 done
const taskId = "M3.1.3";
const status = "done";

// 1. 讀進整份 WBS.md，切成一行一行
const lines = fs.readFileSync('WBS.md', 'utf8').split('\n');

// 2. 找到「包含 M3.1.3」的那一行（任務 ID 是穩定的錨點）
const i = lines.findIndex(l => l.includes(taskId));

// 3. 只把那一行的 [ ] 換成 [x]，行內其他文字（owner、due）原封不動
if (i >= 0) lines[i] = lines[i].replace(/\[[ x]\]/, status === 'done' ? '[x]' : '[ ]');

// 4. 寫回去——除了那一行那一個字元，整份檔案其他 byte 完全沒動
fs.writeFileSync('WBS.md', lines.join('\n'));
```

#### 兩種做法的 diff 對比

**整頁轉回（壞）：**

```diff
- - [ ] M3.1.3 設計資料庫 schema [owner:: BE:張後端] [due:: 2026-07-01]
+ - [x] M3.1.3 設計資料庫 schema \[owner:: BE:張後端\] \[due:: 2026-07-01\]
- ```dataview
+ (dataview 區塊整個跑掉...)
... 還有十幾行被動到
```

**單行 patch（好）：**

```diff
- - [ ] M3.1.3 設計資料庫 schema [owner:: BE:張後端] [due:: 2026-07-01]
+ - [x] M3.1.3 設計資料庫 schema [owner:: BE:張後端] [due:: 2026-07-01]
```

**整份檔案只有那一個字元變了。** 乾淨、零失真。

#### 核心觀念

> **「任務 ID」是錨點。** `M3.1.3` 這種編號在檔案裡唯一且穩定，所以能用它精準定位「要改的那一行」，只動那一行的勾選符號，絕不讓轉換器碰整份檔案的其他內容。

更安全的做法：把 WBS 任務做成 **Notion Database（一列一任務）**，非技術人員只改「狀態下拉」，連 markdown 都不用碰；反向同步讀每列的 `(任務ID, 狀態)`，再用上面的單行 patch 寫回 `WBS.md`。

---

## Phase 5 — 把整條 loop 跑一遍（一台機器就能演完）

```
1. Obsidian 改 test.md → 存檔
2. node sync_to_notion.mjs test.md   → Notion 出現 ✅   (正向)
3. 到 Notion 改一份 authority=notion 的內容頁
4. node sync_from_notion.mjs         → 本機 .md 更新
5. git diff 確認只動到該動的             → commit / push  (反向)
6. （另開 vault 模擬成員B）Obsidian-Git pull → 看到更新
```

跑通這 6 步，整套架構你就驗證完了。

---

## Phase 6 —（可選，最後再做）自動化

確認腳本沒問題後，才把 `.env` 的 token 搬進 **GitHub Secret**，加一個 workflow 讓 push 自動跑正向：

```yaml
# .github/workflows/sync_to_notion.yml
on: { push: { paths: ['**/*.md'] } }
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: |  # 只推這次 push 改動的 .md
          git diff --name-only ${{ github.event.before }} ${{ github.sha }} -- '*.md' \
            | while read f; do node sync_to_notion.mjs "$f"; done
        env:
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
          NOTION_DB_ID: ${{ secrets.NOTION_DB_ID }}
```

反向通常不放 Action（避免多寫入者競態），保持「手動 / Discord 指令觸發中央一支」。

---

## 幾個會踩的雷

- Notion API **404** → 99% 是忘了 Phase 1 步驟 3（沒把 DB 分享給 integration）。
- Select property 的值若 Notion 沒這個選項，API 會自動建，但大小寫要一致。
- `.env` 一定要進 `.gitignore`，token 別 commit。
- 先**只跑正向**玩幾天，再開反向——這跟原規劃「先跑正向兩週」一致。
