#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="je1ght-server"
SERVER_PORTAL="/home/je1ght/code/websites/je1ght-platform/portal-source"
DATA_DIR="$REPO_ROOT/apps/blog-portal/source/_data"
ACTION="${1:-}"

case "$ACTION" in
  pull)
    mkdir -p "$DATA_DIR"
    rsync -avz \
      "$SERVER:$SERVER_PORTAL/source/_data/site_profile.yml" \
      "$SERVER:$SERVER_PORTAL/source/_data/portfolio.yml" \
      "$DATA_DIR/"
    echo "Pulled database-owned portal snapshots for review."
    ;;
  import-profile)
    rsync -avz \
      "$DATA_DIR/site_profile.yml" \
      "$SERVER:$SERVER_PORTAL/source/_data/site_profile.yml"
    ssh "$SERVER" "docker exec je1ght-backend-api node scripts/import-local-profile.js"
    echo "Imported the reviewed site profile snapshot into MySQL."
    ;;
  *)
    echo "Usage: $0 {pull|import-profile}" >&2
    exit 2
    ;;
esac
