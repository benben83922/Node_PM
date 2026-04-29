# GitHub Actions 資料同步管道｜設計規格書

**版本**：v1.0
**文件類型**：核心功能規格
**依賴**：文件規範_YAML設計規格書.md、WBS設計規格書.md、Supabase_Schema設計規格書.md

---

## 一、功能定位

### 1.1 核心問題

文件的結構化資料（YAML Frontmatter、WBS 任務、里程碑）目前只能由 Obsidian Dataview 在本地讀取，無法傳遞給 Web App 或供團隊成員查看。

### 1.2 解決方案

在每個 GitHub Repo 設定 **GitHub Actions Workflow**，偵測 `_Projects/` 目錄下的 `.md` 文件變更，觸發 Python 腳本解析結構化資料並寫入 Supabase。

```
git push（含 _Projects/ 下 .md 變更）
    ↓
GitHub Actions 觸發
    ↓
Python 腳本解析：
  - YAML Frontmatter → projects / yaml_data
  - WBS - [ ] 任務行 → tasks_sync 個別任務記錄
  - ## 里程碑 表格 → milestones
    ↓
Supabase Upsert
    ↓
Web App 即時更新
```

---

## 二、觸發條件

### 2.1 Workflow 設定

觸發條件：**push 到 main branch 且變更檔案位於 `_Projects/` 目錄下**

```yaml
# .github/workflows/sync_to_supabase.yml

name: Sync Project Docs to Supabase

on:
  push:
    branches:
      - main
    paths:
      - '_Projects/**/*.md'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install python-frontmatter supabase
      - name: Run sync script
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
          REPO_FULL_NAME: ${{ github.repository }}
        run: python scripts/sync_to_supabase.py
```

### 2.2 觸發範圍說明

| 檔案位置 | 觸發 Actions | 寫入 Supabase | 說明 |
| :--- | :--- | :--- | :--- |
| `_Projects/**/*.md` | ✅ | ✅ | 專案進度文件 |
| 其他路徑的 `.md` | ❌ | ❌ | 知識文件、設計文件，僅同步至 Obsidian |

---

## 三、欄位對照表

### 3.1 YAML Frontmatter → Supabase

| YAML 欄位 | Supabase 欄位 | 說明 |
| :--- | :--- | :--- |
| `project` | `projects.name` | 用於關聯 project_id |
| `doc_type` | `yaml_data.doc_type` | 存入 JSONB |
| `status` | `yaml_data.status` | 存入 JSONB |
| `phase` | `projects.current_phase`（WBS 文件）/ `yaml_data.phase`（其他文件） | WBS 的 `phase` 直接更新專案宏觀階段 |
| `priority` | `priority` | 直接欄位 |
| `owner` | 對應 `team` 查找 `assignee_email` | 角色縮寫 → email |
| `updated` | `updated_at` | 文件更新時間 |
| `total_tasks` | `yaml_data.total_tasks` | WBS 專用，存入 JSONB |
| `module_count` | `yaml_data.module_count` | WBS 專用，存入 JSONB |

### 3.2 WBS 任務行 → tasks_sync

WBS 任務格式：
```
- [ ] M3.1.3 實作付款 API 串接 [owner:: BE:張後端] #2026-05-10
```

| WBS 欄位 | 解析方式 | Supabase 欄位 |
| :--- | :--- | :--- |
| `[ ]` / `[x]` | regex | `status`（Todo / Done） |
| `M3.1.3` | regex `M\d+\.\d+\.\d+` | `external_id` |
| 任務描述 | regex 擷取 | `title` |
| `[owner:: BE:張後端]` | regex 擷取角色縮寫，對照 frontmatter `team` 欄位取 email | `assignee_email` |
| `#2026-05-10` | regex `#\d{4}-\d{2}-\d{2}` | `deadline` |

### 3.3 里程碑表格 → milestones

WBS.md 中 `## 里程碑 (Milestones)` 章節下的固定格式表格：

| Markdown 欄 | Supabase 欄位 |
| :--- | :--- |
| 里程碑名稱 | `milestone_name` |
| 計畫完成日 | `planned_date` |
| 實際完成日 | `actual_date`（空白則 NULL） |
| 狀態（「完成」→ true，其餘 → false） | `is_completed` |

---

## 四、Python 腳本設計

### 4.1 腳本位置

```
repo 根目錄/
└── scripts/
    └── sync_to_supabase.py
```

### 4.2 核心腳本

```python
import os
import re
import frontmatter
from supabase import create_client
from pathlib import Path

supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])
REPO_FULL_NAME = os.environ['REPO_FULL_NAME']

def get_or_create_project(repo_full_name, project_name, current_phase=None):
    payload = {'repo_full_name': repo_full_name, 'name': project_name}
    if current_phase:
        payload['current_phase'] = current_phase
    result = supabase.table('projects').upsert(
        payload,
        on_conflict='repo_full_name'
    ).execute()
    return result.data[0]['id']

def resolve_email(role, team_map):
    entry = team_map.get(role, {})
    return entry.get('email') if isinstance(entry, dict) else None

def parse_wbs_tasks(content, project_id, team_map):
    pattern = re.compile(
        r'- \[( |x)\] (M[\d.]+) (.+?) \[owner:: (\w+):[\w一-鿿]+\](?: #(\d{4}-\d{2}-\d{2}))?',
        re.MULTILINE
    )
    tasks = []
    for m in pattern.finditer(content):
        completed, task_id, title, role, deadline = m.groups()
        tasks.append({
            'project_id': project_id,
            'external_id': task_id,
            'title': title.strip(),
            'status': 'Done' if completed == 'x' else 'Todo',
            'assignee_email': resolve_email(role, team_map),
            'deadline': deadline or None,
            'yaml_data': {}
        })
    return tasks

def parse_milestones(content, project_id):
    section = re.search(r'## 里程碑.*?\n(.*?)(?=\n##|\Z)', content, re.DOTALL)
    if not section:
        return []
    milestones = []
    row_pattern = re.compile(
        r'\|\s*[^\|]+\s*\|\s*(.+?)\s*\|\s*(\d{4}-\d{2}-\d{2})?\s*\|\s*(\d{4}-\d{2}-\d{2})?\s*\|\s*(\S+)\s*\|'
    )
    for m in row_pattern.finditer(section.group(1)):
        name, planned, actual, status = m.groups()
        milestones.append({
            'project_id': project_id,
            'milestone_name': name.strip(),
            'planned_date': planned or None,
            'actual_date': actual or None,
            'is_completed': status.strip() == '完成'
        })
    return milestones

def sync_file(md_path):
    post = frontmatter.load(md_path)
    meta = post.metadata
    if not meta.get('project'):
        return
    # WBS 文件的 phase 寫入 projects.current_phase
    phase = meta.get('phase') if meta.get('doc_type') == 'WBS' else None
    project_id = get_or_create_project(REPO_FULL_NAME, meta['project'], current_phase=phase)
    team_map = meta.get('team', {})
    tasks = parse_wbs_tasks(post.content, project_id, team_map)
    if tasks:
        supabase.table('tasks_sync').upsert(tasks, on_conflict='project_id,external_id').execute()
    milestones = parse_milestones(post.content, project_id)
    if milestones:
        supabase.table('milestones').upsert(milestones, on_conflict='project_id,milestone_name').execute()

for md_path in Path('_Projects').rglob('*.md'):
    try:
        sync_file(md_path)
        print(f'✅ Synced: {md_path}')
    except Exception as e:
        print(f'❌ Failed: {md_path} — {e}')
```

---

## 五、Secrets 設定

在 GitHub Repo → Settings → Secrets and variables → Actions 新增：

| Secret 名稱 | 說明 |
| :--- | :--- |
| `SUPABASE_URL` | Supabase 專案 URL |
| `SUPABASE_KEY` | Supabase `service_role` key（不是 `anon` key） |

> ⚠️ Actions 使用 `service_role` key 繞過 RLS 寫入；前端使用 `anon` key + RLS 讀取。

---

## 六、錯誤處理策略

| 情境 | 處理方式 |
| :--- | :--- |
| YAML Frontmatter 缺 `project` 欄位 | 跳過該文件，印出警告 log |
| `team` 欄位查無對應 email | `assignee_email` 填 NULL，任務仍寫入 |
| 里程碑區塊格式不符 | 跳過里程碑同步，任務同步不受影響 |
| Supabase 連線失敗 | Actions 標記 Failed，GitHub 發送通知 |
| 單一文件解析例外 | 印出錯誤行，繼續處理下一個文件 |

---

**文件版本**：v1.0
**最後更新**：2026-04-29
**狀態**：草稿（Draft）
