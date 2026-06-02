#!/usr/bin/env node
// wbs_to_tasks.mjs — WBS → Notion 可匯入 CSV（手動匯入用；自動化請用 sync_wbs_to_notion.mjs）
//
// 用法：
//   node scripts/wbs_to_tasks.mjs <wbs.md> [--project X] [--out path.csv]
//   node scripts/wbs_to_tasks.mjs docs/18/TrustCase_WBS_Development_Plan.md --project TrustCase
//
import fs from 'node:fs';
import path from 'node:path';
import { parseWbs, validateWbs, COLS } from './parse_wbs.mjs';

const argv = process.argv.slice(2);
const get = (flag, def) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : def; };
const projectOverride = get('--project', undefined);
const OUT = get('--out', undefined);
const SRC = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--project' && argv[i - 1] !== '--out')
          || 'docs/18/TrustCase_WBS_Development_Plan.md';

const { project, rows, raw } = parseWbs(SRC, { project: projectOverride });
const { errors, warnings, stats } = validateWbs({ rows, raw, project });
warnings.forEach(w => console.log(`⚠️  ${w}`));
if (errors.length) { errors.forEach(e => console.log(`⛔ ${e}`)); process.exit(1); }

const out = OUT || `docs/18/WBS_Tasks_${project}.csv`;
const esc = v => /[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
const csv = [COLS.join(',')].concat(rows.map(r => COLS.map(c => esc(r[c] ?? '')).join(','))).join('\n');
fs.writeFileSync(path.resolve(out), '﻿' + csv);

console.log(`\n✅ 專案「${project}」解析 ${stats.tasks} 任務 → ${out}`);
console.log('各類任務數：', stats.bySection);
