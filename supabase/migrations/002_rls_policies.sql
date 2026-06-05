-- =============================================================
-- Node_PM Web App — Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- Run AFTER 001_initial_schema.sql
-- Run in: Supabase Dashboard → SQL Editor
-- =============================================================
-- 安全原則：
--   - 前端使用 anon key（受 RLS 過濾，只能讀取）
--   - GitHub Actions 使用 service_role key（繞過 RLS，可寫入）
--   - 所有表格預設拒絕存取，只有明確 Policy 才開放
-- =============================================================

-- ──────────────────────────────────────────
-- profiles：用戶只能讀取/更新自己的資料
-- ──────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: 只能讀取自己的資料"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles: 只能更新自己的資料"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ──────────────────────────────────────────
-- projects：只能讀取有 project_access 記錄的專案
-- ──────────────────────────────────────────
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects: 只能讀取有存取權的專案"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_access
      WHERE project_access.project_id = projects.id
        AND project_access.user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────
-- project_access：只能讀取自己的角色記錄
-- ──────────────────────────────────────────
ALTER TABLE public.project_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_access: 只能讀取自己的角色"
  ON public.project_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ──────────────────────────────────────────
-- tasks_sync：只能讀取有存取權的專案任務
-- ──────────────────────────────────────────
ALTER TABLE public.tasks_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_sync: 只能讀取有存取權的任務"
  ON public.tasks_sync
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_access
      WHERE project_access.project_id = tasks_sync.project_id
        AND project_access.user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────
-- milestones：只能讀取有存取權的專案里程碑
-- ──────────────────────────────────────────
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "milestones: 只能讀取有存取權的里程碑"
  ON public.milestones
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_access
      WHERE project_access.project_id = milestones.project_id
        AND project_access.user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────
-- 驗證：確認所有表格 RLS 已啟用
-- ──────────────────────────────────────────
-- 執行後請在 Supabase Dashboard → Authentication → Policies 確認
-- 5 張表格的 "RLS enabled" 欄位均為 true
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'projects', 'project_access', 'tasks_sync', 'milestones')
ORDER BY tablename;
