#!/usr/bin/env bash
# Pre-launch security acceptance script (covers checklist 5.3.2 / 5.3.3 / 5.3.5)
set -euo pipefail

PASS=0
FAIL=0

ok()   { echo "  [PASS] $1"; PASS=$((PASS+1)); }
fail() { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }
hdr()  { echo; echo "=== $1 ==="; }

hdr "5.3.2 — service_role key not in repo"
if git grep -r "service_role" -- ":(exclude).github/workflows/" ":(exclude)docs/" ":(exclude)scripts/sync_wbs_to_supabase.py" 2>/dev/null | grep -v "^Binary"; then
  fail "service_role string found in tracked files (excluding docs/workflows)"
else
  ok "No service_role key found in source code"
fi

hdr "5.3.2 — .env.local not tracked"
if git ls-files | grep -q "\.env\.local"; then
  fail ".env.local is tracked by git — add to .gitignore"
else
  ok ".env.local not tracked"
fi

hdr "5.3.3 — Vercel env uses only VITE_ prefix (anon key only)"
if [ -f "../web/.env.local" ]; then
  if grep -v "^#" ../web/.env.local | grep -v "^$" | grep -qv "^VITE_"; then
    fail ".env.local contains non-VITE_ variable"
  else
    ok ".env.local contains only VITE_-prefixed variables"
  fi
else
  echo "  [SKIP] web/.env.local not found (check Vercel env instead)"
fi

hdr "5.3.5 — npm audit (no high/critical)"
cd "$(dirname "$0")/../web"
AUDIT=$(npm audit --audit-level=high 2>&1 || true)
if echo "$AUDIT" | grep -qE "found [1-9][0-9]* (high|critical)"; then
  fail "npm audit found high/critical vulnerabilities"
  echo "$AUDIT" | grep -E "high|critical"
else
  ok "npm audit: no high/critical vulnerabilities"
fi
cd - > /dev/null

echo
echo "───────────────────────────────────────"
echo "  Security check: $PASS passed, $FAIL failed"
echo "───────────────────────────────────────"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
