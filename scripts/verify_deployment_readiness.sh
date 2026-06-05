#!/usr/bin/env bash
# Deployment Readiness Verification — covers WBS 6.2.1 / 6.2.2
# Checks everything that CAN be verified programmatically before production launch.
# Items requiring a live browser or external dashboard are listed but skipped.
set -euo pipefail

PASS=0; FAIL=0; SKIP=0
ok()   { echo "  [PASS] $1"; PASS=$((PASS+1)); }
fail() { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }
skip() { echo "  [SKIP] $1 (requires live environment)"; SKIP=$((SKIP+1)); }
hdr()  { echo; echo "=== $1 ==="; }

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
WEB_DIR="$REPO_ROOT/web"

# ── A. Core Security ─────────────────────────────────────────────────────────
hdr "A. Core Security"

if git -C "$REPO_ROOT" grep -r "service_role" -- \
     ":(exclude).github/workflows/" \
     ":(exclude)docs/" \
     ":(exclude)scripts/sync_wbs_to_supabase.py" \
     ":(exclude)supabase/migrations/003_rls_acceptance_tests.sql" 2>/dev/null | grep -v "^Binary"; then
  fail "service_role string found in source code"
else
  ok "No service_role key in tracked source files"
fi

if git -C "$REPO_ROOT" ls-files | grep -q "\.env\.local"; then
  fail ".env.local is tracked by git"
else
  ok ".env.local not committed to git"
fi

grep -q "\.env\.local" "$REPO_ROOT/.gitignore" && ok ".env.local in .gitignore" || fail ".env.local missing from .gitignore"
grep -q "dist/" "$REPO_ROOT/.gitignore" && ok "dist/ in .gitignore" || fail "dist/ missing from .gitignore"

# ── B. Supabase Config ───────────────────────────────────────────────────────
hdr "B. Supabase Config"
skip "3.1.6 Google OAuth Provider enabled (verify in Supabase Dashboard)"
skip "5.3.1 RLS 15 scenarios (run supabase/migrations/003_rls_acceptance_tests.sql)"

if [ -f "$REPO_ROOT/supabase/migrations/001_initial_schema.sql" ]; then
  ok "Migration 001_initial_schema.sql exists"
else
  fail "Migration 001_initial_schema.sql missing"
fi

if [ -f "$REPO_ROOT/supabase/migrations/002_rls_policies.sql" ]; then
  ok "Migration 002_rls_policies.sql exists"
else
  fail "Migration 002_rls_policies.sql missing"
fi

# ── C. CI/CD Workflows ───────────────────────────────────────────────────────
hdr "C. CI/CD Workflows"
for wf in ci.yml wbs_sync.yml e2e.yml lighthouse.yml; do
  if [ -f "$REPO_ROOT/.github/workflows/$wf" ]; then
    ok "$wf exists"
  else
    fail "$wf missing"
  fi
done
[ -f "$REPO_ROOT/.github/dependabot.yml" ] && ok "dependabot.yml exists" || fail "dependabot.yml missing"
skip "3.3.4 Vercel project connected (verify in Vercel Dashboard)"
skip "3.3.5 Vercel env vars set (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)"
skip "3.3.8 Vercel Preview Deploy success"

# ── D. Frontend Build ────────────────────────────────────────────────────────
hdr "D. Frontend Build"
cd "$WEB_DIR"

BUILD_OUTPUT=$(npm run build 2>&1)
if echo "$BUILD_OUTPUT" | grep -q "✓ built in"; then
  ok "npm run build succeeds (zero errors)"
else
  fail "npm run build failed"
fi

TEST_OUTPUT=$(npm run test -- --run 2>&1)
PASSED=$(echo "$TEST_OUTPUT" | grep -oP 'Tests\s+\K\d+(?= passed)')
if [ -n "$PASSED" ] && [ "$PASSED" -ge 33 ]; then
  ok "Vitest: $PASSED tests passed"
else
  fail "Vitest: unexpected result — $(echo "$TEST_OUTPUT" | tail -5)"
fi

# ── E. Dependency Security ───────────────────────────────────────────────────
hdr "E. npm audit (5.3.5)"
AUDIT=$(npm audit --audit-level=high 2>&1 || true)
if echo "$AUDIT" | grep -qE "found [1-9][0-9]* (high|critical)"; then
  fail "npm audit: high/critical vulnerabilities found"
  echo "$AUDIT" | grep -E "high|critical"
else
  ok "npm audit: no high/critical vulnerabilities"
fi

# ── F. Key Files Present ─────────────────────────────────────────────────────
hdr "F. Required files"
cd "$REPO_ROOT"
FILES=(
  "web/src/lib/supabaseClient.js"
  "web/src/hooks/useAuth.js"
  "web/src/components/RoleGuard.jsx"
  "web/src/pages/LoginPage.jsx"
  "web/src/pages/ForbiddenPage.jsx"
  "web/src/pages/pm/PmL1Page.jsx"
  "web/src/pages/engineer/EngineerL1Page.jsx"
  "web/src/pages/client/ClientL1Page.jsx"
  "web/vercel.json"
  "scripts/sync_wbs_to_supabase.py"
  "docs/web_docs/Production_Deployment_Runbook.md"
)
for f in "${FILES[@]}"; do
  [ -f "$f" ] && ok "$f" || fail "$f missing"
done

# ── G. Manual verification reminders ─────────────────────────────────────────
hdr "G. Manual steps required before production"
skip "3.1.6 Set Google OAuth in Supabase + Google Cloud Console"
skip "3.2.1 Add GitHub Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
skip "3.3.4 Connect Vercel project to GitHub repo"
skip "3.3.5 Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in Vercel"
skip "4.2.8 Three-role login walkthrough in browser"
skip "5.3.1 Run 003_rls_acceptance_tests.sql in Supabase SQL Editor"
skip "5.3.4 Test viewer cannot access /pm or /engineer"
skip "5.4.1 Run Lighthouse on Vercel Preview URL (LCP<2.5s, CLS<0.1)"
skip "6.2.3 git push main → verify Vercel auto-deploys"
skip "6.2.4 Production 3-role walkthrough"
skip "6.3.1 Enable Vercel Analytics (Speed Insights)"
skip "6.3.2 Confirm Supabase Auth + DB logs visible"
skip "6.3.3 Confirm Supabase PITR backup enabled"

cd - > /dev/null

echo
echo "══════════════════════════════════════════════"
echo "  Results: $PASS passed  |  $FAIL failed  |  $SKIP manual"
echo "══════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  echo "  ❌ Fix $FAIL issue(s) before deploying."
  exit 1
else
  echo "  ✅ All automated checks pass."
  echo "  📋 $SKIP items need manual action — see Production_Deployment_Runbook.md"
  exit 0
fi
