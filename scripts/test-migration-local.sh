#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_root="$(mktemp -d /tmp/synclaro-ai-readiness-db.XXXXXX)"
test_port="55439"

cleanup() {
  if [[ -f "$test_root/data/postmaster.pid" ]]; then
    pg_ctl -D "$test_root/data" -m fast stop >/dev/null 2>&1 || true
  fi
  case "$test_root" in
    /tmp/synclaro-ai-readiness-db.*) rm -rf -- "$test_root" ;;
  esac
}
trap cleanup EXIT

initdb -D "$test_root/data" -A trust -U postgres --no-locale >/dev/null
pg_ctl -D "$test_root/data" -o "-F -p $test_port -k $test_root" -l "$test_root/postgres.log" start >/dev/null

psql -X -h "$test_root" -p "$test_port" -U postgres -d postgres -f "$repo_dir/supabase/tests/fixture_crm_schema.sql" >/dev/null
psql -X -h "$test_root" -p "$test_port" -U postgres -d postgres -f "$repo_dir/supabase/migrations/20260719060000_ai_readiness_lead_funnel.sql" >/dev/null
psql -X -h "$test_root" -p "$test_port" -U postgres -d postgres -f "$repo_dir/supabase/tests/lead_funnel_integration.sql" >/dev/null

echo "PASS: Supabase-Migration und Lead-Funnel-Integration"
