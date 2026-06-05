-- =============================================================
-- Node_PM Web App — Initial Schema
-- Migration: 001_initial_schema.sql
-- Run in: Supabase Dashboard → SQL Editor
-- =============================================================

-- ──────────────────────────────────────────
-- 1. profiles（用戶個人資料，對應 auth.users）
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- 2. projects（專案主表）
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  repo_full_name  TEXT,                        -- e.g. 'owner/repo-name'
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'archived', 'completed')),
  current_phase   TEXT
                    CHECK (current_phase IN ('planning', 'dev', 'testing', 'done', 'blocked')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- 3. project_access（RBAC 角色分配）
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_access (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role        TEXT NOT NULL
                CHECK (role IN ('admin', 'developer', 'viewer')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, project_id)
);

-- ──────────────────────────────────────────
-- 4. tasks_sync（WBS 任務，由 GitHub Actions 寫入）
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks_sync (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  external_id     TEXT NOT NULL,               -- e.g. 'M3.1.3'
  title           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'Todo'
                    CHECK (status IN ('Todo', 'Done')),
  assignee_role   TEXT,                        -- PM, BE, FE, TL
  assignee_name   TEXT,
  assignee_email  TEXT,
  deadline        DATE,
  wbs_path        TEXT,                        -- e.g. 'M3 > M3.1 > M3.1.3'
  yaml_data       JSONB,                       -- raw parsed attributes
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, external_id)
);

-- ──────────────────────────────────────────
-- 5. milestones（里程碑，由 GitHub Actions 寫入）
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.milestones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id    TEXT NOT NULL,               -- e.g. 'M1', 'M2'
  milestone_name  TEXT NOT NULL,
  planned_date    DATE,
  actual_date     DATE,
  is_completed    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, milestone_id)
);

-- ──────────────────────────────────────────
-- 6. 索引（查詢效能）
-- ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_sync_project_id
  ON public.tasks_sync(project_id);

CREATE INDEX IF NOT EXISTS idx_tasks_sync_assignee_email
  ON public.tasks_sync(assignee_email);

CREATE INDEX IF NOT EXISTS idx_tasks_sync_status
  ON public.tasks_sync(status);

CREATE INDEX IF NOT EXISTS idx_milestones_project_id
  ON public.milestones(project_id);

CREATE INDEX IF NOT EXISTS idx_project_access_user_id
  ON public.project_access(user_id);

CREATE INDEX IF NOT EXISTS idx_project_access_project_id
  ON public.project_access(project_id);

-- ──────────────────────────────────────────
-- 7. 自動建立 profile（新用戶註冊觸發器）
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────
-- 8. 自動更新 updated_at
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER set_tasks_sync_updated_at
  BEFORE UPDATE ON public.tasks_sync
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER set_milestones_updated_at
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
