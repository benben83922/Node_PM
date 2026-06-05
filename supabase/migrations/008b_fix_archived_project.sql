-- 修正官網改版 2025 資料：強制設定 status，避免 DO NOTHING 導致舊資料殘留

-- 1. 確保專案狀態為 archived
UPDATE public.projects
SET status = 'archived', name = '官網改版 2025'
WHERE id = 'cccc0001-0000-0000-0000-000000000001';

-- 2. 將此專案所有任務強制設為 Done（修正任何狀態不對的舊任務）
UPDATE public.tasks_sync
SET status = 'Done'
WHERE project_id = 'cccc0001-0000-0000-0000-000000000001';

-- 3. 將此專案所有里程碑強制設為已完成
UPDATE public.milestones
SET is_completed = TRUE
WHERE project_id = 'cccc0001-0000-0000-0000-000000000001';
