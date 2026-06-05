-- =============================================================
-- Node_PM Web App — Team Invite Function
-- Migration: 004_invite_function.sql
-- Run in: Supabase Dashboard → SQL Editor
-- =============================================================
-- 設計：admin 透過 supabase.rpc('invite_user', ...) 邀請成員
--   - SECURITY DEFINER：函數以定義者身份執行，可繞過 RLS 寫入
--   - 呼叫者必須是 admin，否則拋錯
--   - 被邀請者必須已有 auth.users 帳號（先登入過一次）
-- =============================================================

CREATE OR REPLACE FUNCTION public.invite_user(
  p_email      TEXT,
  p_project_id UUID,
  p_role       TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user_id UUID;
BEGIN
  -- 1. 驗證 role 值
  IF p_role NOT IN ('admin', 'developer', 'viewer') THEN
    RAISE EXCEPTION '無效的角色：%。只允許 admin / developer / viewer', p_role;
  END IF;

  -- 2. 驗證呼叫者是 admin
  IF NOT EXISTS (
    SELECT 1 FROM public.project_access
    WHERE user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION '權限不足：只有 admin 可以邀請成員';
  END IF;

  -- 3. 查詢被邀請者的 user_id
  SELECT id INTO v_target_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION '找不到此 Email 的用戶：%。請確認對方已登入過一次。', p_email;
  END IF;

  -- 4. 插入或更新 project_access
  INSERT INTO public.project_access (user_id, project_id, role)
  VALUES (v_target_user_id, p_project_id, p_role)
  ON CONFLICT (user_id, project_id)
  DO UPDATE SET role = EXCLUDED.role;

  RETURN 'ok';
END;
$$;

-- 開放 authenticated 角色呼叫（RPC 層仍受函數內 admin 檢查保護）
GRANT EXECUTE ON FUNCTION public.invite_user(TEXT, UUID, TEXT) TO authenticated;

-- =============================================================
-- 移除成員
-- =============================================================
CREATE OR REPLACE FUNCTION public.remove_member(
  p_user_id    UUID,
  p_project_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. 驗證呼叫者是 admin
  IF NOT EXISTS (
    SELECT 1 FROM public.project_access
    WHERE user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION '權限不足：只有 admin 可以移除成員';
  END IF;

  -- 2. 禁止移除自己
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION '不能移除自己';
  END IF;

  DELETE FROM public.project_access
  WHERE user_id = p_user_id
    AND project_id = p_project_id;

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_member(UUID, UUID) TO authenticated;

-- =============================================================
-- 查詢專案成員（含 email）— admin 專用 view function
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_project_members(p_project_id UUID)
RETURNS TABLE (
  user_id    UUID,
  email      TEXT,
  full_name  TEXT,
  role       TEXT,
  joined_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 驗證呼叫者是 admin（用 alias 避免與 RETURNS TABLE 欄位名稱衝突）
  IF NOT EXISTS (
    SELECT 1 FROM public.project_access AS chk
    WHERE chk.user_id = auth.uid()
      AND chk.role = 'admin'
  ) THEN
    RAISE EXCEPTION '權限不足：只有 admin 可以查詢成員清單';
  END IF;

  RETURN QUERY
  SELECT
    pa.user_id,
    u.email::TEXT,
    COALESCE(pr.full_name, '')::TEXT,
    pa.role,
    pa.created_at
  FROM public.project_access AS pa
  JOIN auth.users AS u ON u.id = pa.user_id
  LEFT JOIN public.profiles AS pr ON pr.id = pa.user_id
  WHERE pa.project_id = p_project_id
  ORDER BY pa.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_members(UUID) TO authenticated;
