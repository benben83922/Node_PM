-- tasks_sync.status 新增 'Doing' 允許值
ALTER TABLE public.tasks_sync
  DROP CONSTRAINT tasks_sync_status_check;

ALTER TABLE public.tasks_sync
  ADD CONSTRAINT tasks_sync_status_check
  CHECK (status IN ('Todo', 'Doing', 'Done'));
