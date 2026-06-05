-- ============================================================
-- 測試資料：電商平台重構專案
-- 執行前提：benben83922@gmail.com 已存在於 auth.users
-- ============================================================

DO $$
DECLARE
  v_project_id  UUID := 'aaaa0001-0000-0000-0000-000000000001';
  v_user_id     UUID;
BEGIN

-- 1. 取得使用者 UUID
SELECT id INTO v_user_id FROM auth.users WHERE email = 'benben83922@gmail.com' LIMIT 1;
IF v_user_id IS NULL THEN
  RAISE EXCEPTION '找不到使用者 benben83922@gmail.com，請先登入一次';
END IF;

-- 2. 新增專案
INSERT INTO public.projects (id, name, repo_full_name, created_at)
VALUES (
  v_project_id,
  '電商平台重構',
  'benben83922/ecommerce-refactor',
  NOW() - INTERVAL '60 days'
)
ON CONFLICT (id) DO NOTHING;

-- 3. 賦予 admin 存取權
INSERT INTO public.project_access (user_id, project_id, role)
VALUES (v_user_id, v_project_id, 'admin')
ON CONFLICT (user_id, project_id) DO NOTHING;

-- ============================================================
-- 4. 里程碑（3 個）
-- ============================================================
INSERT INTO public.milestones
  (id, project_id, milestone_id, milestone_name, planned_date, actual_date, is_completed)
VALUES
  -- M1：架構設計（已完成，實際稍晚）
  ('bbbb0001-0000-0000-0000-000000000001', v_project_id,
   'M1', '架構設計完成', '2026-03-31', '2026-04-03', TRUE),

  -- M2：後端 API（進行中，尚未完成）
  ('bbbb0001-0000-0000-0000-000000000002', v_project_id,
   'M2', '後端 API 交付', '2026-05-31', NULL, FALSE),

  -- M3：前端整合（未來）
  ('bbbb0001-0000-0000-0000-000000000003', v_project_id,
   'M3', '前端整合上線', '2026-07-31', NULL, FALSE)
ON CONFLICT (project_id, milestone_id) DO NOTHING;

-- ============================================================
-- 5. 任務（15 筆）
--    M1 任務（wbs_path 以 M1 開頭）→ 全部 Done
--    M2 任務（M2 開頭）→ 混合狀態，含逾期、卡關
--    M3 任務（M3 開頭）→ 全部 Todo / 含卡關
-- ============================================================
INSERT INTO public.tasks_sync
  (id, project_id, external_id, title, status, assignee_email, deadline, wbs_path, yaml_data, updated_at)
VALUES

  -- M1：架構設計（全部完成）
  ('cccc0001-0001-0000-0000-000000000001', v_project_id,
   'EC-001', '系統架構設計文件撰寫', 'Done',
   'benben83922@gmail.com', '2026-03-15', 'M1.1', NULL,
   NOW() - INTERVAL '80 days'),

  ('cccc0001-0001-0000-0000-000000000002', v_project_id,
   'EC-002', '資料庫 Schema 設計', 'Done',
   'benben83922@gmail.com', '2026-03-20', 'M1.2', NULL,
   NOW() - INTERVAL '75 days'),

  ('cccc0001-0001-0000-0000-000000000003', v_project_id,
   'EC-003', 'API 規格書定義', 'Done',
   'benben83922@gmail.com', '2026-03-28', 'M1.3', NULL,
   NOW() - INTERVAL '65 days'),

  -- M2：後端 API（混合狀態）
  ('cccc0001-0002-0000-0000-000000000001', v_project_id,
   'EC-004', '用戶認證 API 實作', 'Done',
   'benben83922@gmail.com', '2026-04-30', 'M2.1', NULL,
   NOW() - INTERVAL '35 days'),

  ('cccc0001-0002-0000-0000-000000000002', v_project_id,
   'EC-005', '商品管理 CRUD API', 'Doing',
   'benben83922@gmail.com', '2026-05-15', 'M2.2', NULL,      -- 逾期（Doing）
   NOW() - INTERVAL '5 days'),

  ('cccc0001-0002-0000-0000-000000000003', v_project_id,
   'EC-006', '訂單建立與查詢 API', 'Todo',
   'benben83922@gmail.com', '2026-05-25', 'M2.3', NULL,      -- 逾期（Todo）
   NOW() - INTERVAL '10 days'),

  ('cccc0001-0002-0000-0000-000000000004', v_project_id,
   'EC-007', '第三方支付 SDK 整合', 'Todo',
   'benben83922@gmail.com', '2026-05-30', 'M2.4',
   '{"blocked": true, "reason": "等待廠商提供測試帳號"}',   -- 逾期 + 卡關
   NOW() - INTERVAL '8 days'),

  ('cccc0001-0002-0000-0000-000000000005', v_project_id,
   'EC-008', '全文搜尋功能 API', 'Todo',
   'benben83922@gmail.com', '2026-06-20', 'M2.5', NULL,      -- 未來
   NOW() - INTERVAL '3 days'),

  ('cccc0001-0002-0000-0000-000000000006', v_project_id,
   'EC-009', '庫存即時同步 API', 'Todo',
   'benben83922@gmail.com', '2026-06-25', 'M2.6', NULL,      -- 未來
   NOW() - INTERVAL '2 days'),

  -- M3：前端整合（全 Todo，含一個卡關）
  ('cccc0001-0003-0000-0000-000000000001', v_project_id,
   'EC-010', '首頁 Banner 與分類導航', 'Todo',
   'benben83922@gmail.com', '2026-07-05', 'M3.1', NULL,
   NOW() - INTERVAL '1 day'),

  ('cccc0001-0003-0000-0000-000000000002', v_project_id,
   'EC-011', '商品列表頁與篩選器', 'Todo',
   'benben83922@gmail.com', '2026-07-10', 'M3.2', NULL,
   NOW()),

  ('cccc0001-0003-0000-0000-000000000003', v_project_id,
   'EC-012', '購物車功能與本地暫存', 'Todo',
   'benben83922@gmail.com', '2026-07-15', 'M3.3', NULL,
   NOW()),

  ('cccc0001-0003-0000-0000-000000000004', v_project_id,
   'EC-013', '結帳流程（三步驟）', 'Todo',
   'benben83922@gmail.com', '2026-07-18', 'M3.4',
   '{"blocked": true, "reason": "依賴 EC-007 支付整合完成"}', -- 卡關（相依未完成）
   NOW()),

  ('cccc0001-0003-0000-0000-000000000005', v_project_id,
   'EC-014', '用戶中心與訂單歷史', 'Todo',
   'benben83922@gmail.com', '2026-07-22', 'M3.5', NULL,
   NOW()),

  ('cccc0001-0003-0000-0000-000000000006', v_project_id,
   'EC-015', 'Lighthouse 效能調優（目標 90+）', 'Todo',
   'benben83922@gmail.com', '2026-07-28', 'M3.6', NULL,
   NOW())

ON CONFLICT (project_id, external_id) DO NOTHING;

RAISE NOTICE '✅ 電商平台重構 測試資料插入完成（project_id: %）', v_project_id;
END $$;
