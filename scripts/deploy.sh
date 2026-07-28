#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="je1ght-server"
SERVER_PORTAL="/home/je1ght/code/websites/je1ght-platform/portal-source"
SERVER_DOCKER="/home/je1ght/docker/je1ght-platform"
SERVER_OPENRESTY_CONF="/opt/1panel/apps/openresty/openresty/conf/conf.d/je1ght.top.conf"
SERVER_OPENRESTY_STAGING="$SERVER_DOCKER/je1ght.top.conf.next"
SERVER_OPENRESTY_BACKUP="$SERVER_DOCKER/je1ght.top.conf.codex-backup"
OPENRESTY_CONTAINER="1Panel-openresty-JJeW"

echo "========================================="
echo " Deploy to je1ght.top"
echo "========================================="

# --- Local build ---

echo ""
echo "[1/5] Syncing posts, drafts, and media..."

# Ensure directories exist (postimage/ may not exist on first run)
mkdir -p "$REPO_ROOT/apps/blog-portal/source/postimage"
ssh "$SERVER" "mkdir -p $SERVER_PORTAL/source/postimage"

# Admin/MySQL owns these snapshots. Refuse to build a stale copy because that
# would silently replace the visible Admin-managed profile during deployment.
for snapshot in site_profile.yml portfolio.yml; do
  if [[ -n "$(rsync -aczni "$SERVER:$SERVER_PORTAL/source/_data/$snapshot" "$REPO_ROOT/apps/blog-portal/source/_data/")" ]]; then
    echo "Snapshot mismatch: source/_data/$snapshot differs from production." >&2
    echo "Run scripts/content-snapshot.sh pull, review, commit, and deploy again." >&2
    exit 1
  fi
done

# Phase a: push local new/edited posts, images, and drafts to server.
# Database-owned _data snapshots are intentionally excluded; use
# scripts/content-snapshot.sh for an explicit snapshot operation.
rsync -avz \
  "$REPO_ROOT/apps/blog-portal/source/_posts/" \
  "$SERVER:$SERVER_PORTAL/source/_posts/" 2>&1 | tail -1
rsync -avz \
  "$REPO_ROOT/apps/blog-portal/source/postimage/" \
  "$SERVER:$SERVER_PORTAL/source/postimage/" 2>&1 | tail -1
# Sync drafts with --delete so published drafts (moved to _posts) are cleaned up server-side
mkdir -p "$REPO_ROOT/apps/blog-portal/source/_drafts"
ssh "$SERVER" "mkdir -p $SERVER_PORTAL/source/_drafts"
rsync -avz --delete \
  "$REPO_ROOT/apps/blog-portal/source/_drafts/" \
  "$SERVER:$SERVER_PORTAL/source/_drafts/" 2>&1 | tail -1
# Phase b: import local posts into MySQL (skips already-managed files)
ssh "$SERVER" "docker exec je1ght-backend-api node scripts/import-local-posts.js 2>&1" || true

# Phase c: pull back server state (now includes Admin-created posts + managed-marked local posts)
rsync -avz \
  "$SERVER:$SERVER_PORTAL/source/_posts/" \
  "$REPO_ROOT/apps/blog-portal/source/_posts/" 2>&1 | tail -1
rsync -avz \
  "$SERVER:$SERVER_PORTAL/source/postimage/" \
  "$REPO_ROOT/apps/blog-portal/source/postimage/" 2>&1 | tail -1

# Pull back server-side _drafts
rsync -avz \
  "$SERVER:$SERVER_PORTAL/source/_drafts/" \
  "$REPO_ROOT/apps/blog-portal/source/_drafts/" 2>&1 | tail -1
# Pull back admin-uploaded brand assets (avatar, icon, backgrounds)
rsync -avz \
  "$SERVER:$SERVER_PORTAL/source/shared-assets/images/" \
  "$REPO_ROOT/packages/shared-assets/images/" 2>&1 | tail -1

echo "[2/5] Building Portal..."
cd "$REPO_ROOT/apps/blog-portal"
# Clear Hexo cache so stale db.json doesn't poison the build with old data
rm -f db.json
BUILD_VER="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"
echo "       Cache-bust version: $BUILD_VER"
PORTAL_BUILD_VERSION="$BUILD_VER" npm run build 2>&1 | tail -1
npm run validate

# --- Prepare self-contained portal for server ---
# Server has no packages/ directory, so copy deps into portal before syncing.
# Save and restore the local shared-assets symlink.

echo "[3/5] Preparing portal for deployment..."
PORTAL_DIR="$REPO_ROOT/apps/blog-portal"

# Save the repository-relative symlink target before we clobber it.
SHARED_ASSETS_LINK="$(readlink "$PORTAL_DIR/source/shared-assets")"

# Copy shared config
cp "$REPO_ROOT/packages/shared-config/site-identity.json" "$PORTAL_DIR/"

# Replace symlink with real copy for server
rm -rf "$PORTAL_DIR/source/shared-assets"
cp -r "$REPO_ROOT/packages/shared-assets" "$PORTAL_DIR/source/shared-assets"

# --- Sync to server ---

echo "[4/5] Syncing to server..."
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='public' \
  --exclude='source/_data/site_profile.yml' \
  --exclude='source/_data/portfolio.yml' \
  "$PORTAL_DIR/" \
  "$SERVER:$SERVER_PORTAL/" 2>&1 | tail -1

# Sync built HTML (hexo output)
rsync -avz --delete \
  "$PORTAL_DIR/public/" \
  "$SERVER:$SERVER_PORTAL/public/" 2>&1 | tail -1

# Sync backend source for Docker build
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.env' \
  "$REPO_ROOT/apps/backend-api/" \
  "$SERVER:$SERVER_DOCKER/backend-api/" 2>&1 | tail -1

# --- Restore local symlink ---
rm -rf "$PORTAL_DIR/source/shared-assets"
ln -s "$SHARED_ASSETS_LINK" "$PORTAL_DIR/source/shared-assets"
rm -f "$PORTAL_DIR/site-identity.json"

# --- Docker rebuild on server ---

echo "[5/5] Installing deps & rebuilding Docker..."
rsync -avz "$REPO_ROOT/infra/docker-compose.yml" "$SERVER:$SERVER_DOCKER/" 2>&1 | tail -1
rsync -avz "$REPO_ROOT/infra/nginx/default.conf" "$SERVER:$SERVER_DOCKER/nginx/" 2>&1 | tail -1
rsync -avz "$REPO_ROOT/infra/nginx/je1ght.top.conf" "$SERVER:$SERVER_OPENRESTY_STAGING" 2>&1 | tail -1

# Fix root-owned files from Docker, then recreate only the services whose
# loopback ports and application image are managed by this repository.
ssh "$SERVER" "docker exec je1ght-backend-api chown -R 1000:1000 /portal-source/public/ 2>/dev/null" || true
ssh "$SERVER" "grep -q '^WALINE_DB_PASSWORD=' $SERVER_DOCKER/.env"
ssh "$SERVER" "cd $SERVER_DOCKER && docker compose build backend-api 2>&1 | tail -3 && docker compose up -d --no-deps backend-api waline 2>&1 | tail -3"
ssh "$SERVER" "curl --fail --silent --show-error http://127.0.0.1:3001/health >/dev/null"

# 1Panel OpenResty is the production edge. Install its versioned site config
# atomically, validate the complete configuration, then reload without downtime.
ssh "$SERVER" "cp $SERVER_OPENRESTY_CONF $SERVER_OPENRESTY_BACKUP && cp $SERVER_OPENRESTY_STAGING $SERVER_OPENRESTY_CONF && if docker exec $OPENRESTY_CONTAINER openresty -t; then docker exec $OPENRESTY_CONTAINER openresty -s reload && rm -f $SERVER_OPENRESTY_BACKUP $SERVER_OPENRESTY_STAGING; else cp $SERVER_OPENRESTY_BACKUP $SERVER_OPENRESTY_CONF; rm -f $SERVER_OPENRESTY_STAGING; exit 1; fi"

# --- Sync admin credentials ---

"$REPO_ROOT/scripts/sync-admin.sh" 2>/dev/null || true

echo ""
echo "========================================="
echo " Deploy complete!"
echo " https://je1ght.top"
echo "========================================="
