-- ============================================================
-- 補充 priority 欄位到 tasks_sync.yaml_data
-- 適用專案：電商平台重構（EC-xxx）、官網改版 2025（WR-xxx）
-- 規則：對已有 yaml_data 的任務用 jsonb concat（保留 blocked 等欄位）
--       對 null yaml_data 的任務直接建立新 jsonb
-- ============================================================

-- 電商平台重構
UPDATE public.tasks_sync SET
  yaml_data = COALESCE(yaml_data, '{}'::jsonb) || jsonb_build_object('priority', p.priority)
FROM (VALUES
  ('EC-001', 'Medium'),   -- 架構設計文件（完成）
  ('EC-002', 'High'),     -- 資料庫 Schema（核心基礎）
  ('EC-003', 'Medium'),   -- API 規格書（完成）
  ('EC-004', 'High'),     -- 用戶認證 API（核心功能）
  ('EC-005', 'High'),     -- 商品管理 CRUD（Doing + 逾期）
  ('EC-006', 'High'),     -- 訂單 API（Todo + 逾期）
  ('EC-007', 'High'),     -- 第三方支付（Blocked + 逾期，關鍵卡關）
  ('EC-008', 'Medium'),   -- 全文搜尋（未來）
  ('EC-009', 'Medium'),   -- 庫存同步（未來）
  ('EC-010', 'Medium'),   -- 首頁 Banner（M3 前端）
  ('EC-011', 'Medium'),   -- 商品列表（M3 前端）
  ('EC-012', 'High'),     -- 購物車（核心轉換路徑）
  ('EC-013', 'High'),     -- 結帳流程（Blocked，核心轉換路徑）
  ('EC-014', 'Low'),      -- 用戶中心（次要功能）
  ('EC-015', 'Low')       -- Lighthouse 效能（最後優化）
) AS p(external_id, priority)
WHERE tasks_sync.external_id = p.external_id
  AND tasks_sync.project_id = 'aaaa0001-0000-0000-0000-000000000001';

-- 官網改版 2025（封存，全部 Done）
UPDATE public.tasks_sync SET
  yaml_data = COALESCE(yaml_data, '{}'::jsonb) || jsonb_build_object('priority', p.priority)
FROM (VALUES
  ('WR-001', 'Medium'),   -- 競品分析與需求訪談
  ('WR-002', 'Medium'),   -- 資訊架構規劃
  ('WR-003', 'Low'),      -- Wireframe 繪製
  ('WR-004', 'Medium'),   -- UI 視覺設計
  ('WR-005', 'High'),     -- RWD 切版（核心交付物）
  ('WR-006', 'High'),     -- CMS 後台串接
  ('WR-007', 'Low'),      -- SEO Meta
  ('WR-008', 'High'),     -- UAT 驗收
  ('WR-009', 'High'),     -- DNS 切換上線（關鍵）
  ('WR-010', 'Low')       -- GA4 追蹤驗證
) AS p(external_id, priority)
WHERE tasks_sync.external_id = p.external_id
  AND tasks_sync.project_id = 'cccc0001-0000-0000-0000-000000000001';
