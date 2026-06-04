#!/usr/bin/env node
// sync_wbs_to_notion.mjs — 把一或多份 WBS upsert 進「共用 Tasks DB」（用 Project 欄區分專案）
//
// 多專案安全：
//   - 每筆任務唯一鍵 = UID = "<project>::<TaskID>"，跨專案永不撞號
//   - 同步前先 validate，有 error 直接 exit 1（壞資料不進 Notion）
//   - 每筆帶 Project 欄；同步後查 Notion 該 Project 任務數做驗證
//
// 環境變數：NOTION_TOKEN、NOTION_WBS_DB_ID
//
// 用法：
//   node scripts/sync_wbs_to_notion.mjs <wbs1.md> [wbs2.md ...]   # 指定檔（Action 傳變動檔）
//   node scripts/sync_wbs_to_notion.mjs                           # 不給檔→掃 docs/**/*WBS*.md
//   node scripts/sync_wbs_to_notion.mjs --dry-run [--project X] f.md   # 只解析+驗證，不打 API
//
import fs from 'node:fs';
import { parseWbs, validateWbs } from './parse_wbs.mjs';

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const pIdx = argv.indexOf('--project');
const projectOverride = pIdx >= 0 ? argv[pIdx + 1] : undefined;
// 位置參數＝檔名（排除旗標與 --project 的值）
let files = argv.filter((a, i) => !a.startsWith('--') && i !== pIdx + 1);

if (files.length === 0) {
  try { files = fs.globSync('docs/**/*WBS*.md'); } catch { files = []; }
}
if (files.length === 0) { console.error('⛔ 找不到任何 WBS 檔（給檔名或放在 docs/**/*WBS*.md）'); process.exit(1); }

const SCHEMA = {
  'UID': 'rich_text', 'Task ID': 'rich_text', 'Parent': 'rich_text', 'Milestone': 'select',
  'Action Type': 'select', 'Assigned': 'rich_text', 'Eng hours': 'number', 'Status': 'select',
  'Timeline': 'rich_text', 'Depends on': 'rich_text', 'Project': 'select',
};
const KEY = 'UID';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function propVal(type, v) {
  const empty = v === '' || v == null;
  switch (type) {
    case 'title':     return { title: empty ? [] : [{ text: { content: String(v) } }] };
    case 'rich_text': return { rich_text: empty ? [] : [{ text: { content: String(v) } }] };
    case 'number':    { const n = Number(v); return { number: empty || isNaN(n) ? null : n }; }
    case 'select':    return { select: empty ? null : { name: String(v) } };
  }
}
async function withRetry(fn, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) {
      if ((e.code === 'rate_limited' || e.status === 429) && i < tries - 1) { await sleep(1000 * (i + 1)); continue; }
      throw e;
    }
  }
}

// 1) 先解析 + 驗證所有檔（任何一檔有 error 就全部不送）
const parsed = [];
let hasError = false;
for (const f of files) {
  const { project, rows, raw } = parseWbs(f, { project: projectOverride });
  const { errors, warnings, stats } = validateWbs({ rows, raw, project });
  console.log(`\n📄 ${f}  → 專案「${project}」`);
  console.log(`   解析 ${stats.tasks} 任務、${stats.milestones} 里程碑`, stats.bySection);
  warnings.forEach(w => console.log(`   ⚠️  ${w}`));
  errors.forEach(e => console.log(`   ⛔ ${e}`));
  if (errors.length) hasError = true;
  parsed.push({ file: f, project, rows });
}
if (hasError) { console.error('\n⛔ 驗證未通過，已中止（未送任何資料到 Notion）'); process.exit(1); }

if (DRY) {
  console.log('\n[dry-run] 驗證通過，未打 API。第 1 筆 payload：');
  console.log(JSON.stringify(parsed[0]?.rows[0], null, 2));
  process.exit(0);
}

// 2) 連 Notion，逐檔 upsert
const TOKEN = process.env.NOTION_TOKEN, DB = process.env.NOTION_WBS_DB_ID;
if (!TOKEN || !DB) { console.error('⛔ 缺少 NOTION_TOKEN 或 NOTION_WBS_DB_ID'); process.exit(1); }
const { Client } = await import('@notionhq/client');
const notion = new Client({ auth: TOKEN });

// 確保 schema
const db = await withRetry(() => notion.databases.retrieve({ database_id: DB }));
const titleProp = Object.entries(db.properties).find(([, p]) => p.type === 'title')?.[0] || 'Name';
const missing = {};
for (const [name, type] of Object.entries(SCHEMA)) if (!db.properties[name]) missing[name] = { [type]: {} };
if (Object.keys(missing).length) {
  console.log(`\n補上缺少欄位：${Object.keys(missing).join(', ')}`);
  await withRetry(() => notion.databases.update({ database_id: DB, properties: missing }));
}

// 載入既有：UID → pageId（整庫一次，之後只比對記憶體）
const uidMap = new Map();
let cursor;
do {
  const res = await withRetry(() => notion.databases.query({ database_id: DB, start_cursor: cursor, page_size: 100 }));
  for (const pg of res.results) {
    const uid = pg.properties[KEY]?.rich_text?.[0]?.plain_text;
    if (uid) uidMap.set(uid, pg.id);
  }
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);
console.log(`\nNotion 既有任務 ${uidMap.size} 筆`);

for (const { file, project, rows } of parsed) {
  let created = 0, updated = 0;
  for (const r of rows) {
    const properties = { [titleProp]: propVal('title', r.Name) };
    for (const [name, type] of Object.entries(SCHEMA)) properties[name] = propVal(type, r[name]);
    const pageId = uidMap.get(r[KEY]);
    if (pageId) { await withRetry(() => notion.pages.update({ page_id: pageId, properties })); updated++; }
    else        { await withRetry(() => notion.pages.create({ parent: { database_id: DB }, properties })); created++; }
    await sleep(350);
  }

  // 同步後驗證：查 Notion 該 Project 的任務數
  let count = 0; cursor = undefined;
  do {
    const res = await withRetry(() => notion.databases.query({
      database_id: DB, start_cursor: cursor, page_size: 100,
      filter: { property: 'Project', select: { equals: project } },
    }));
    count += res.results.length;
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  const ok = count >= rows.length;
  console.log(`${ok ? '✅' : '⚠️'} ${file}：新增 ${created}、更新 ${updated}；Notion 內 Project=「${project}」現有 ${count} 筆（解析 ${rows.length}）`);
  if (!ok) console.log('   ⚠️ Notion 數量少於解析數，請檢查');
}
console.log('\n完成。');
