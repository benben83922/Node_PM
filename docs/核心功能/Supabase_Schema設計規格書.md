---
project: Node_PM
doc_type: FeatureSpec
status: draft
phase: planning
priority: high
owner: PM
updated: 2026-05-06
tags: [supabase, schema, database]
---

# Supabase Schema｜設計規格書

**版本**：v1.0
**文件類型**：核心功能規格
**前置依賴**：GitHub_Actions_Pipeline設計規格書.md、Web_App設計規格書.md

---

## 一、資料庫設計原則

1. **GitHub 為唯一寫入來源**：所有業務資料由 GitHub Actions 從 `.md` 文件解析後寫入，Web App 只讀
2. **進度由 Web App 動態計算**：`tasks_sync` 不存 `progress` 欄位，Web App 從任務完成數即時計算百分比
3. **RLS 強制啟用**：每張業務資料表啟用 Row Level Security，透過 `project_access` 控制存取範圍

---

## 二、完整 Schema

```sql
-- 啟用 UUID 擴充
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 專案清單（對應 GitHub Repo）
CREATE TABLE projects (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           TEXT NOT NULL,
    repo_full_name TEXT UNIQUE NOT NULL,  -- 格式：'user/repo_name'
    status         TEXT DEFAULT 'active',
    current_phase  TEXT,                  -- 由 GitHub Actions 從 WBS.md frontmatter.phase 寫入
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 使用者擴充資訊
CREATE TABLE profiles (
    id          UUID REFERENCES auth.users PRIMARY KEY,
    email       TEXT UNIQUE,
    full_name   TEXT,
    avatar_url  TEXT
);

-- 3. 權限對照表（RBAC 核心）
CREATE TABLE project_access (
    id          SERIAL PRIMARY KEY,
    user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
    project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
    role        TEXT CHECK (role IN ('admin', 'developer', 'viewer')) DEFAULT 'viewer',
    UNIQUE(user_id, project_id)
);

-- 4. 任務同步表（由 GitHub Actions 寫入）
CREATE TABLE tasks_sync (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id     UUID REFERENCES projects(id) ON DELETE CASCADE,
    external_id    TEXT NOT NULL,           -- WBS 任務 ID，如 M3.1.3
    title          TEXT NOT NULL,
    status         TEXT CHECK (status IN ('Todo', 'Doing', 'Done', 'Blocked')) DEFAULT 'Todo', -- GitHub Actions 僅寫入 Todo/Done；Doing/Blocked 為保留值，供手動更新或未來功能使用
    priority       TEXT,
    assignee_email TEXT,
    deadline       DATE,
    yaml_data      JSONB,                   -- 儲存原始 YAML 屬性供彈性查詢
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, external_id)
);

-- 5. 里程碑表（用於 S-Curve 與時間軸）
CREATE TABLE milestones (
    id             SERIAL PRIMARY KEY,
    project_id     UUID REFERENCES projects(id) ON DELETE CASCADE,
    milestone_name TEXT NOT NULL,
    planned_date   DATE,
    actual_date    DATE,
    is_completed   BOOLEAN DEFAULT FALSE,
    UNIQUE(project_id, milestone_name)
);

-- 6. updated_at 自動更新觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_sync_updated_at
    BEFORE UPDATE ON tasks_sync
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 三、進度計算（由 Web App 負責）

`tasks_sync` 不儲存 `progress` 整數欄位，Web App 查詢時動態計算：

```sql
SELECT
    COUNT(*) FILTER (WHERE status = 'Done')  AS completed,
    COUNT(*)                                  AS total,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'Done') * 100.0 / NULLIF(COUNT(*), 0),
        1
    ) AS progress_pct
FROM tasks_sync
WHERE project_id = $1;
```

---

## 四、RLS 政策

```sql
-- tasks_sync
ALTER TABLE tasks_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks: user can view accessible projects"
ON tasks_sync FOR SELECT
USING (
    project_id IN (
        SELECT project_id FROM project_access
        WHERE user_id = auth.uid()
    )
);

-- milestones（同邏輯）
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "milestones: user can view accessible projects"
ON milestones FOR SELECT
USING (
    project_id IN (
        SELECT project_id FROM project_access
        WHERE user_id = auth.uid()
    )
);

-- projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects: user can view accessible projects"
ON projects FOR SELECT
USING (
    id IN (
        SELECT project_id FROM project_access
        WHERE user_id = auth.uid()
    )
);

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: users can view own profile"
ON profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "profiles: users can update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid());

-- project_access
ALTER TABLE project_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_access: users can view own entries"
ON project_access FOR SELECT
USING (user_id = auth.uid());
```

> GitHub Actions 使用 `service_role` key 寫入，不受 RLS 限制。前端使用 `anon` key，受 RLS 控制。

---

## 五、Index 設計

```sql
CREATE INDEX idx_tasks_project    ON tasks_sync(project_id);
CREATE INDEX idx_tasks_status     ON tasks_sync(status);
CREATE INDEX idx_tasks_assignee   ON tasks_sync(assignee_email);
CREATE INDEX idx_tasks_deadline   ON tasks_sync(deadline);
CREATE INDEX idx_milestones_proj  ON milestones(project_id);
CREATE INDEX idx_access_user      ON project_access(user_id);
```

---

## 六、資料生命週期

| 資料表 | 寫入時機 | 更新時機 | 刪除政策 |
| :--- | :--- | :--- | :--- |
| `projects` | 首次 push 時 Actions 自動建立 | repo 名稱變更時 | 人工刪除 |
| `tasks_sync` | 每次 push `.md` 文件 | Actions Upsert（key：project_id + external_id） | 隨專案刪除 |
| `milestones` | 每次 push `WBS.md` | Actions Upsert（key：project_id + milestone_name） | 隨專案刪除 |
| `profiles` | 使用者首次登入時建立 | 使用者更新個人資料 | 使用者刪除帳號時 |
| `project_access` | PM 手動新增成員 | 角色變更時 | 移除成員時 |

---

**文件版本**：v1.0
**最後更新**：2026-05-06
**狀態**：草稿（Draft）
