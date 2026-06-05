-- RLS Acceptance Tests — WBS item 5.3.1
-- 5 tables × 3 roles = 15 scenarios
-- Run each block in Supabase SQL Editor while authenticated as the test user.
-- Replace <admin_user_id>, <dev_user_id>, <viewer_user_id>, <project_id> with real UUIDs.
--
-- Setup: create three users in Supabase Auth, then insert into project_access:
--
--   INSERT INTO project_access (user_id, project_id, role) VALUES
--     ('<admin_user_id>',  '<project_id>', 'admin'),
--     ('<dev_user_id>',    '<project_id>', 'developer'),
--     ('<viewer_user_id>', '<project_id>', 'viewer');

-- ────────────────────────────────────────────────────────────────
-- HELPER: simulate a user session for testing
-- Run as service_role, then SET LOCAL role and claim to test RLS
-- ────────────────────────────────────────────────────────────────

-- TC-RLS-001: admin can read projects they have access to
-- Expected: row(s) returned
SET LOCAL role TO authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "<admin_user_id>", "role": "authenticated"}';
SELECT id, name FROM projects;  -- should return the project

-- TC-RLS-002: developer can read projects they have access to
-- Expected: row(s) returned
SET LOCAL "request.jwt.claims" TO '{"sub": "<dev_user_id>", "role": "authenticated"}';
SELECT id, name FROM projects;

-- TC-RLS-003: viewer can read projects they have access to
-- Expected: row(s) returned
SET LOCAL "request.jwt.claims" TO '{"sub": "<viewer_user_id>", "role": "authenticated"}';
SELECT id, name FROM projects;

-- TC-RLS-004: admin can read tasks_sync for their project
-- Expected: rows returned
SET LOCAL "request.jwt.claims" TO '{"sub": "<admin_user_id>", "role": "authenticated"}';
SELECT id, external_id, title FROM tasks_sync WHERE project_id = '<project_id>';

-- TC-RLS-005: developer can read tasks_sync for their project
SET LOCAL "request.jwt.claims" TO '{"sub": "<dev_user_id>", "role": "authenticated"}';
SELECT id, external_id, title FROM tasks_sync WHERE project_id = '<project_id>';

-- TC-RLS-006: viewer can read tasks_sync for their project
SET LOCAL "request.jwt.claims" TO '{"sub": "<viewer_user_id>", "role": "authenticated"}';
SELECT id, external_id, title FROM tasks_sync WHERE project_id = '<project_id>';

-- TC-RLS-007: admin can read milestones
SET LOCAL "request.jwt.claims" TO '{"sub": "<admin_user_id>", "role": "authenticated"}';
SELECT id, title, planned_date FROM milestones WHERE project_id = '<project_id>';

-- TC-RLS-008: developer can read milestones
SET LOCAL "request.jwt.claims" TO '{"sub": "<dev_user_id>", "role": "authenticated"}';
SELECT id, title, planned_date FROM milestones WHERE project_id = '<project_id>';

-- TC-RLS-009: viewer can read milestones
SET LOCAL "request.jwt.claims" TO '{"sub": "<viewer_user_id>", "role": "authenticated"}';
SELECT id, title, planned_date FROM milestones WHERE project_id = '<project_id>';

-- TC-RLS-010: user can read own profile
SET LOCAL "request.jwt.claims" TO '{"sub": "<admin_user_id>", "role": "authenticated"}';
SELECT id, email FROM profiles WHERE id = '<admin_user_id>';  -- expected: 1 row

-- TC-RLS-011: user CANNOT read another user's profile
-- Expected: 0 rows
SET LOCAL "request.jwt.claims" TO '{"sub": "<admin_user_id>", "role": "authenticated"}';
SELECT id, email FROM profiles WHERE id = '<dev_user_id>';  -- expected: 0 rows

-- TC-RLS-012: user can read own project_access rows
SET LOCAL "request.jwt.claims" TO '{"sub": "<dev_user_id>", "role": "authenticated"}';
SELECT user_id, project_id, role FROM project_access WHERE user_id = '<dev_user_id>';

-- TC-RLS-013: user CANNOT read another user's project_access
-- Expected: 0 rows
SET LOCAL "request.jwt.claims" TO '{"sub": "<dev_user_id>", "role": "authenticated"}';
SELECT user_id, project_id, role FROM project_access WHERE user_id = '<admin_user_id>';

-- TC-RLS-014: unauthenticated request cannot read tasks_sync
-- Expected: 0 rows (anon role, no JWT)
SET LOCAL role TO anon;
SELECT count(*) FROM tasks_sync;  -- expected: 0

-- TC-RLS-015: unauthenticated request cannot read projects
-- Expected: 0 rows
SET LOCAL role TO anon;
SELECT count(*) FROM projects;  -- expected: 0

-- ────────────────────────────────────────────────────────────────
-- Verification query: confirm RLS is enabled on all tables
-- Expected: all 5 tables show rowsecurity = true
-- ────────────────────────────────────────────────────────────────
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('profiles', 'projects', 'project_access', 'tasks_sync', 'milestones')
ORDER BY tablename;
