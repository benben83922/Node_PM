// parse_wbs.mjs — 共用 WBS 解析器 + 驗證器（多專案安全版）
//   parseWbs(src, {project})  → { project, rows, raw }
//   validateWbs({rows, raw, project}) → { errors, warnings, stats }
// 被 wbs_to_tasks.mjs（出 CSV）與 sync_wbs_to_notion.mjs（推 Notion）共用。
import fs from 'node:fs';
import path from 'node:path';

export const STATUS = { '⬜': '未開始', '⏳': '待處理', '✅': '已完成', '🔄': '進行中' };
export const KNOWN_STATUS = new Set(Object.values(STATUS));

// CSV 欄位順序（Name 首欄＝Notion title；UID＝全域唯一鍵）
export const COLS = ['Name', 'UID', 'Task ID', 'Parent', 'Milestone', 'Action Type',
  'Assigned', 'Eng hours', 'Status', 'Timeline', 'Depends on', 'Project'];

const reSection   = /^###\s+[\d.]+\s+(.+?)(?:\s*\([^)]*\))?\s*$/;   // ### 3.0 後端開發 (Backend)
const reMilestone = /^####\s+([\d.]+)\s+(.+?)\s*$/;                 // #### 3.1 基礎架構建置 [Week 1-2]
const reTaskId    = /^[0-9]+\.[0-9]+\.[0-9]+$/;                     // 只收 3 級原子任務 X.Y.Z
const reTaskRow   = /^\|\s*[0-9]+\.[0-9]+\.[0-9]+\s*\|/;            // 原始檔中的任務列（驗證用）

// --- 極簡 frontmatter 讀取（只取 key: value，夠用就好，不引入相依套件）---
function readFrontmatter(text) {
  if (!/^﻿?---\r?\n/.test(text)) return {};
  const end = text.indexOf('\n---', text.indexOf('\n') );
  const block = text.slice(0, end < 0 ? 0 : end).split('\n').slice(1);
  const fm = {};
  for (const line of block) {
    const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return fm;
}

export function parseWbs(srcPath, opts = {}) {
  const raw = fs.readFileSync(path.resolve(srcPath), 'utf8').replace(/\r\n/g, '\n');
  const fm = readFrontmatter(raw);
  const project = opts.project || fm.project || '';
  if (!project) {
    throw new Error(`「${srcPath}」缺少專案身分：請在 frontmatter 加 project: <名稱>，或用 --project 指定`);
  }

  const lines = raw.split('\n');
  let section = '', milestone = '', inTaskTable = false;
  const rows = [];

  for (const line of lines) {
    const mSec = line.match(reSection);
    if (mSec) { section = mSec[1].trim(); milestone = ''; inTaskTable = false; continue; }

    const mMile = line.match(reMilestone);
    if (mMile) {
      const name = mMile[2].replace(/\s*\[[^\]]*\]\s*$/, '').trim();
      milestone = `${mMile[1]} ${name}`;
      inTaskTable = false;
      continue;
    }

    if (line.includes('任務編號')) { inTaskTable = true; continue; }
    if (inTaskTable && /^\s*$/.test(line)) { inTaskTable = false; continue; }
    if (!inTaskTable) continue;
    if (/^\|?\s*-{2,}/.test(line.replace(/\|/g, ''))) continue;       // 分隔列
    if (!line.trimStart().startsWith('|')) { inTaskTable = false; continue; }

    const cells = line.split('|').map(c => c.trim());
    if (cells[0] === '') cells.shift();
    if (cells[cells.length - 1] === '') cells.pop();
    if (cells.length < 5) continue;

    const [id, name, owner, hours, status, week, deps] = cells;
    if (!reTaskId.test(id)) continue;

    rows.push({
      'Name': `${id} ${name}`,
      'UID': `${project}::${id}`,                         // ← 全域唯一鍵，跨專案不撞號
      'Task ID': id,
      'Parent': id.split('.').slice(0, -1).join('.'),
      'Milestone': milestone,
      'Action Type': section,
      'Assigned': owner || '',
      'Eng hours': hours || '',
      'Status': STATUS[status] || status || '',
      'Timeline': week && week !== '-' ? week : '',
      'Depends on': deps && deps !== '-' ? deps : '',
      'Project': project,
    });
  }
  return { project, rows, raw };
}

// --- 結構驗證：有 error 就該讓 CI 失敗、絕不送進 Notion ---
export function validateWbs({ rows, raw, project }) {
  const errors = [], warnings = [];

  // 1) 解析數 == 原始檔 X.Y.Z 任務列數（抓靜默漏抓）
  const rawRows = (raw.match(new RegExp(reTaskRow.source, 'gm')) || []).length;
  if (rawRows !== rows.length)
    errors.push(`解析數 ${rows.length} ≠ 原始任務列數 ${rawRows}（可能漏抓或表格跑版）`);

  // 2) Task ID 不重複
  const seen = new Map();
  for (const r of rows) {
    if (seen.has(r['Task ID'])) errors.push(`Task ID 重複：${r['Task ID']}`);
    seen.set(r['Task ID'], true);
  }

  // 3) 每個任務的父里程碑存在
  const milestones = new Set(rows.map(r => r.Milestone.split(' ')[0]).filter(Boolean));
  for (const r of rows)
    if (!milestones.has(r.Parent)) warnings.push(`任務 ${r['Task ID']} 找不到父里程碑 ${r.Parent}`);

  // 4) 狀態在已知集合
  for (const r of rows)
    if (r.Status && !KNOWN_STATUS.has(r.Status)) warnings.push(`未知狀態「${r.Status}」於 ${r['Task ID']}`);

  // 5) 基本欄位
  for (const r of rows) {
    if (!r.Name.trim()) errors.push(`任務 ${r['Task ID']} 名稱為空`);
    if (!project) errors.push('缺少 project');
  }

  const bySection = {};
  for (const r of rows) bySection[r['Action Type']] = (bySection[r['Action Type']] || 0) + 1;
  const stats = { project, tasks: rows.length, milestones: milestones.size, bySection };

  return { errors, warnings, stats };
}
