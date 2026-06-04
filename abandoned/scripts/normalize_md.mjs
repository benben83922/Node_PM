#!/usr/bin/env node
// normalize_md.mjs — 把 docs/18 的 .md 正規化成 Obsidian × Notion 雙相容
//
// 處理三件事（依《格式修正清單.md》定案）：
//   ① metadata 粗體區塊 → YAML frontmatter（10 檔；readme/sitemap 補最簡 frontmatter）
//   ② H4/H5 標題封頂 H3：readme.md 用策略 B（→ **粗體**），其餘用策略 A（→ ###）
//   ③ 表格儲存格 <br>：簡單欄位自動轉「 / 」；含清單的複雜儲存格「只標記不亂改」，列進報告人工處理
//
// 安全設計：
//   - 預設 dry-run，只印報告不寫檔；加 --write 才真的覆寫。
//   - code fence（``` ）內的內容一律不動。
//   - 已有 frontmatter 的檔會跳過 ①（可重複執行 idempotent）。
//
// 用法：
//   node scripts/normalize_md.mjs                # dry-run，掃 docs/18
//   node scripts/normalize_md.mjs --write        # 實際寫檔
//   node scripts/normalize_md.mjs --dir docs/18 --write
//
import fs from 'node:fs';
import path from 'node:path';

// ---- 參數 ----
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const dirIdx = args.indexOf('--dir');
const DIR = dirIdx >= 0 ? args[dirIdx + 1] : 'docs/18';

// ---- 每檔 frontmatter 設定（取自《格式修正清單.md》）----
const META = {
  'TrustCase_API_Specification.md':   { doc_type: 'API',          version: 'v1.0.0', status: '草稿', author: 'Tech Lead' },
  'TrustCase_Architecture.md':        { doc_type: 'Architecture', version: 'v1.0',   status: '草稿', author: '技術架構師' },
  'TrustCase_BDD.md':                 { doc_type: 'BDD',          version: 'v1.0',   status: '活躍', author: '技術負責人, 產品經理' },
  'TrustCase_Class_Relationships.md': { doc_type: 'Class',        version: 'v1.0',   status: '草稿', author: '技術負責人/架構團隊' },
  'TrustCase_Dependencies.md':        { doc_type: 'Dependencies', version: 'v1.0',   status: '草稿', author: '技術負責人/架構團隊' },
  'TrustCase_ERD.md':                 { doc_type: 'ERD',          version: 'v2.0',   status: '草稿', author: '技術負責人/架構團隊' },
  'TrustCase_Module_Specification.md':{ doc_type: 'Module',       version: 'v1.0',   status: '草稿', author: '開發工程師' },
  'TrustCase_PRD.md':                 { doc_type: 'PRD',          version: 'v1.0',   status: '草稿', author: 'Product Team' },
  'TrustCase_Project_Structure.md':   { doc_type: 'Structure',    version: 'v1.0',   status: '活躍', author: '技術負責人/架構團隊' },
  'TrustCase_WBS_Development_Plan.md':{ doc_type: 'WBS',          version: 'v1.0',   status: '草稿', author: '專案經理 / Claude' },
  'readme.md':                        { doc_type: 'Glossary' },
  'sitemap.md':                       { doc_type: 'Sitemap' },
};
const PROJECT = 'TrustCase';
const UPDATED = '2026-02-01';

// readme.md 用策略 B（粗體），其餘用策略 A（降 H3）
const BOLD_HEADING_FILES = new Set(['readme.md']);

// ---- 工具：YAML 純量安全引號 ----
function yamlVal(v) {
  const s = String(v);
  // 含 YAML 特殊起始字元或冒號接空白時加引號，否則維持純量
  return /^[\s>|&*!%@`"'#?,\[\]{}-]|:\s|\s$/.test(s) ? JSON.stringify(s) : s;
}

function buildFrontmatter(title, m) {
  const lines = ['---'];
  lines.push(`title: ${yamlVal(title)}`);
  if (m.doc_type) lines.push(`doc_type: ${m.doc_type}`);
  lines.push(`project: ${PROJECT}`);
  if (m.version) lines.push(`version: ${m.version}`);
  if (m.author)  lines.push(`author: ${yamlVal(m.author)}`);
  if (m.status)  lines.push(`status: ${m.status}`);
  lines.push('authority: github');           // 規格書固定 GitHub 當主人
  lines.push(`updated: ${UPDATED}`);
  lines.push('notion_id:');                  // 同步後由腳本回填
  lines.push('---');
  return lines.join('\n');
}

// ---- ① 移除舊 metadata 區塊、插入 frontmatter ----
function applyFrontmatter(content, fileName, report) {
  if (/^﻿?---\r?\n/.test(content)) {    // 已有 frontmatter → 跳過
    report.push('① frontmatter：已存在，跳過');
    return content;
  }
  const m = META[fileName] || { doc_type: 'Doc' };
  const lines = content.replace(/^﻿/, '').split('\n');

  const titleIdx = lines.findIndex(l => /^#\s+/.test(l));
  if (titleIdx < 0) { report.push('① frontmatter：找不到 # 標題，跳過'); return content; }
  const title = lines[titleIdx].replace(/^#\s+/, '').trim();

  // 嘗試移除 title 之後的「--- 粗體meta ---」區塊
  let i = titleIdx + 1;
  while (i < lines.length && lines[i].trim() === '') i++;
  let removed = false;
  if (lines[i] && lines[i].trim() === '---') {
    const openIdx = i;
    let closeIdx = -1;
    for (let j = openIdx + 1; j < lines.length; j++) {
      if (lines[j].trim() === '---') { closeIdx = j; break; }
    }
    if (closeIdx > openIdx) {
      const block = lines.slice(openIdx + 1, closeIdx).join('\n');
      if (/\*\*(文件版本|最後更新|主要作者|狀態)/.test(block)) {
        lines.splice(openIdx, closeIdx - openIdx + 1);     // 移除整個 meta 區塊
        while (lines[openIdx] !== undefined && lines[openIdx].trim() === '') lines.splice(openIdx, 1);
        removed = true;
      }
    }
  }
  report.push(removed ? '① frontmatter：已轉換（移除舊 metadata 區塊）'
                      : `① frontmatter：補上最簡 frontmatter（doc_type: ${m.doc_type}）`);

  const body = lines.join('\n').replace(/^\n+/, '');
  return buildFrontmatter(title, m) + '\n\n' + body;
}

// ---- ②③ 逐行處理（code fence 感知）----
function applyLineFixes(content, fileName, report) {
  const useBold = BOLD_HEADING_FILES.has(fileName);
  const out = [];
  let inFence = false;
  let h4 = 0, h5 = 0, brSimple = 0;
  const brComplexLines = [];

  const srcLines = content.split('\n');
  // 估算 frontmatter 行數，回報時換算原始行號用（這裡僅統計，不精算）
  srcLines.forEach((line, idx) => {
    const fence = /^\s*```/.test(line);
    if (fence) { inFence = !inFence; out.push(line); return; }
    if (inFence) { out.push(line); return; }

    // ② 標題降級
    const mH = line.match(/^(#{4,5})\s+(.*)$/);
    if (mH) {
      const text = mH[2].trim();
      if (mH[1].length === 5) h5++; else h4++;
      out.push(useBold ? `**${text}**` : `### ${text}`);
      return;
    }

    // ③ 表格列含 <br>
    if (/^\s*\|/.test(line) && line.includes('<br>')) {
      const hasList = /<br>\s*(?:[-*+]\s|\d+[.)]\s)/.test(line) || /\|\s*(?:[-*+]\s|\d+[.)]\s)/.test(line);
      if (hasList) {
        brComplexLines.push(idx + 1);                 // 複雜：標記，不動
        out.push(line);
      } else {
        brSimple++;
        out.push(line.replace(/<br>/g, ' / '));        // 簡單：<br> → 「 / 」
      }
      return;
    }

    out.push(line);
  });

  if (h4 || h5) report.push(`② 標題：${useBold ? '策略B(粗體)' : '策略A(→###)'} 轉換 H4×${h4}${h5 ? ` H5×${h5}` : ''}`);
  if (brSimple) report.push(`③ 表格：簡單 <br> 自動轉「 / 」×${brSimple} 列`);
  if (brComplexLines.length) report.push(`③ 表格：⚠️ 含清單的複雜儲存格需「人工」拆出，未改 ×${brComplexLines.length} 列 → 修正後檔案行號 ${brComplexLines.join(', ')}`);
  return out.join('\n');
}

// ---- 主流程 ----
const absDir = path.resolve(DIR);
if (!fs.existsSync(absDir)) { console.error(`找不到目錄：${absDir}`); process.exit(1); }

const files = fs.readdirSync(absDir).filter(f => f.endsWith('.md') && f !== '格式修正清單.md');
console.log(`\n${WRITE ? '✍️  寫入模式' : '🔍 dry-run（不寫檔，加 --write 才實際修改）'} · 目錄 ${DIR}\n`);

let changed = 0;
for (const f of files.sort()) {
  const full = path.join(absDir, f);
  const orig = fs.readFileSync(full, 'utf8');
  const eol = orig.includes('\r\n') ? '\r\n' : '\n';   // 保留原始換行風格（docs/18 為 CRLF）
  const lf = orig.replace(/\r\n/g, '\n');               // 處理時統一用 LF，行尾無 \r 才不會破壞正則
  const report = [];

  let next = applyFrontmatter(lf, f, report);
  next = applyLineFixes(next, f, report);

  const restored = next.replace(/\n/g, eol);            // 寫回時換回原始換行風格
  const isChanged = restored !== orig;
  if (isChanged) changed++;

  console.log(`${isChanged ? '●' : '○'} ${f}`);
  for (const r of report) console.log(`    ${r}`);
  if (!report.length) console.log('    （無需修改）');

  if (WRITE && isChanged) fs.writeFileSync(full, restored);
}

console.log(`\n${WRITE ? '已寫入' : '預計修改'} ${changed} / ${files.length} 檔。`);
if (!WRITE && changed) console.log('確認無誤後執行：node scripts/normalize_md.mjs --write\n');
