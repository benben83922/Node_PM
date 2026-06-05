-- ============================================================
-- 測試資料：已封存專案（舊官網改版）
-- ============================================================

DO $$
DECLARE
  v_project_id  UUID := 'cccc0001-0000-0000-0000-000000000001';
  v_user_id     UUID;
BEGIN

SELECT id INTO v_user_id FROM auth.users WHERE email = 'benben83922@gmail.com' LIMIT 1;
IF v_user_id IS NULL THEN
  RAISE EXCEPTION '找不到使用者 benben83922@gmail.com';
END IF;

-- 專案（status = archived）
INSERT INTO public.projects (id, name, repo_full_name, status, created_at)
VALUES (
  v_project_id,
  '官網改版 2025',
  'benben83922/website-revamp-2025',
  'archived',
  NOW() - INTERVAL '180 days'
)
ON CONFLICT (id) DO NOTHING;

-- project_access
INSERT INTO public.project_access (user_id, project_id, role)
VALUES (v_user_id, v_project_id, 'admin')
ON CONFLICT (user_id, project_id) DO NOTHING;

-- 里程碑（全部已完成）
INSERT INTO public.milestones
  (id, project_id, milestone_id, milestone_name, planned_date, actual_date, is_completed)
VALUES
  ('dddd0001-0000-0000-0000-000000000001', v_project_id,
   'M1', '需求確認', '2025-09-30', '2025-09-28', TRUE),
  ('dddd0001-0000-0000-0000-000000000002', v_project_id,
   'M2', '設計稿交付', '2025-10-31', '2025-11-03', TRUE),
  ('dddd0001-0000-0000-0000-000000000003', v_project_id,
   'M3', '前端開發完成', '2025-11-30', '2025-12-02', TRUE),
  ('dddd0001-0000-0000-0000-000000000004', v_project_id,
   'M4', '上線驗收', '2025-12-15', '2025-12-17', TRUE)
ON CONFLICT (project_id, milestone_id) DO NOTHING;

-- 任務（全部 Done）
INSERT INTO public.tasks_sync
  (id, project_id, external_id, title, status, assignee_email, deadline, wbs_path, yaml_data, updated_at)
VALUES
  ('eeee0001-0001-0000-0000-000000000001', v_project_id,
   'WR-001', '競品分析與需求訪談', 'Done', 'benben83922@gmail.com', '2025-09-20', 'M1.1', NULL, NOW() - INTERVAL '170 days'),
  ('eeee0001-0001-0000-0000-000000000002', v_project_id,
   'WR-002', '資訊架構（IA）規劃', 'Done', 'benben83922@gmail.com', '2025-09-28', 'M1.2', NULL, NOW() - INTERVAL '165 days'),
  ('eeee0001-0002-0000-0000-000000000001', v_project_id,
   'WR-003', 'Wireframe 繪製', 'Done', 'benben83922@gmail.com', '2025-10-15', 'M2.1', NULL, NOW() - INTERVAL '150 days'),
  ('eeee0001-0002-0000-0000-000000000002', v_project_id,
   'WR-004', 'UI 視覺設計（Figma）', 'Done', 'benben83922@gmail.com', '2025-10-31', 'M2.2', NULL, NOW() - INTERVAL '140 days'),
  ('eeee0001-0003-0000-0000-000000000001', v_project_id,
   'WR-005', 'RWD 切版（首頁、關於、服務）', 'Done', 'benben83922@gmail.com', '2025-11-15', 'M3.1', NULL, NOW() - INTERVAL '120 days'),
  ('eeee0001-0003-0000-0000-000000000002', v_project_id,
   'WR-006', 'CMS 後台串接', 'Done', 'benben83922@gmail.com', '2025-11-25', 'M3.2', NULL, NOW() - INTERVAL '110 days'),
  ('eeee0001-0003-0000-0000-000000000003', v_project_id,
   'WR-007', 'SEO Meta 與 sitemap 設定', 'Done', 'benben83922@gmail.com', '2025-11-30', 'M3.3', NULL, NOW() - INTERVAL '105 days'),
  ('eeee0001-0004-0000-0000-000000000001', v_project_id,
   'WR-008', 'UAT 使用者驗收測試', 'Done', 'benben83922@gmail.com', '2025-12-10', 'M4.1', NULL, NOW() - INTERVAL '90 days'),
  ('eeee0001-0004-0000-0000-000000000002', v_project_id,
   'WR-009', 'DNS 切換與正式上線', 'Done', 'benben83922@gmail.com', '2025-12-15', 'M4.2', NULL, NOW() - INTERVAL '85 days'),
  ('eeee0001-0004-0000-0000-000000000003', v_project_id,
   'WR-010', 'GA4 追蹤驗證', 'Done', 'benben83922@gmail.com', '2025-12-17', 'M4.3', NULL, NOW() - INTERVAL '84 days')
ON CONFLICT (project_id, external_id) DO NOTHING;

RAISE NOTICE '✅ 官網改版 2025（archived）測試資料插入完成';
END $$;
