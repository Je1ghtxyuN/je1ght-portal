#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="je1ght-server"
SERVER_PORTAL="/home/je1ght/websites/je1ght-platform/portal-source"
SERVER_DOCKER="/home/je1ght/docker/je1ght-platform"

echo "========================================="
echo " Deploy to je1ght.top"
echo "========================================="

# --- Local build ---

echo ""
echo "[1/5] Bidirectional content sync..."

# Ensure directories exist (postimage/ may not exist on first run)
mkdir -p "$REPO_ROOT/apps/blog-portal/source/postimage"
ssh "$SERVER" "mkdir -p $SERVER_PORTAL/source/postimage"

# Phase a: push local new/edited posts and images to server (no --delete, preserves both sides)
rsync -avz \
  "$REPO_ROOT/apps/blog-portal/source/_posts/" \
  "$SERVER:$SERVER_PORTAL/source/_posts/" 2>&1 | tail -1
rsync -avz \
  "$REPO_ROOT/apps/blog-portal/source/postimage/" \
  "$SERVER:$SERVER_PORTAL/source/postimage/" 2>&1 | tail -1
rsync -avz \
  "$REPO_ROOT/apps/blog-portal/source/_data/" \
  "$SERVER:$SERVER_PORTAL/source/_data/" 2>&1 | tail -1

# Phase b: import local posts into MySQL (skips already-managed files)
ssh "$SERVER" "docker exec je1ght-backend-api node scripts/import-local-posts.js 2>&1" || true

# Phase c: pull back server state (now includes Admin-created posts + managed-marked local posts)
rsync -avz \
  "$SERVER:$SERVER_PORTAL/source/_posts/" \
  "$REPO_ROOT/apps/blog-portal/source/_posts/" 2>&1 | tail -1
rsync -avz \
  "$SERVER:$SERVER_PORTAL/source/postimage/" \
  "$REPO_ROOT/apps/blog-portal/source/postimage/" 2>&1 | tail -1
rsync -avz \
  "$SERVER:$SERVER_PORTAL/source/_data/" \
  "$REPO_ROOT/apps/blog-portal/source/_data/" 2>&1 | tail -1

echo "[2/5] Building Portal..."
cd "$REPO_ROOT/apps/blog-portal"
# Clear Hexo cache so stale db.json doesn't poison the build with old data
rm -f db.json
./node_modules/.bin/hexo generate 2>&1 | tail -1

# Bust Cloudflare cache by replacing BUILD_VER placeholder with Unix timestamp
BUILD_VER=$(date +%s)
echo "       Cache-bust version: $BUILD_VER"
find "$REPO_ROOT/apps/blog-portal/public" -name '*.html' -exec sed -i '' "s/BUILD_VER/$BUILD_VER/g" {} +

# --- Prepare self-contained portal for server ---
# Server has no packages/ directory, so copy deps into portal before syncing.
# Save and restore the local shared-assets symlink.

echo "[3/5] Preparing portal for deployment..."
PORTAL_DIR="$REPO_ROOT/apps/blog-portal"

# Save symlink target before we clobber it
SHARED_ASSETS_REAL="$(cd "$PORTAL_DIR/source/shared-assets" 2>/dev/null && pwd -P || true)"

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
ln -s "$SHARED_ASSETS_REAL" "$PORTAL_DIR/source/shared-assets" 2>/dev/null || true
rm -f "$PORTAL_DIR/site-identity.json"

# --- Docker rebuild on server ---

echo "[5/5] Installing deps & rebuilding Docker..."
ssh "$SERVER" "cd $SERVER_PORTAL && npm install --silent 2>&1 | tail -1"
rsync -avz "$REPO_ROOT/infra/docker-compose.yml" "$SERVER:$SERVER_DOCKER/" 2>&1 | tail -1
rsync -avz "$REPO_ROOT/infra/nginx/default.conf" "$SERVER:$SERVER_DOCKER/nginx/" 2>&1 | tail -1

# Disable conflicting generator on server (source/index.md + tag handles homepage)
ssh "$SERVER" "mv $SERVER_PORTAL/scripts/portal-home-generator.js $SERVER_PORTAL/scripts/portal-home-generator.js.disabled 2>/dev/null" || true

# Fix root-owned files from Docker, then full restart (not just recreate)
ssh "$SERVER" "docker exec je1ght-backend-api chown -R 1000:1000 /portal-source/public/ 2>/dev/null" || true
ssh "$SERVER" "cd $SERVER_DOCKER && docker compose build backend-api 2>&1 | tail -3 && docker compose down 2>&1 | tail -1 && docker compose up -d 2>&1 | tail -1"

# --- Sync admin credentials ---

"$REPO_ROOT/scripts/sync-admin.sh" 2>/dev/null || true

echo ""
echo "========================================="
echo " Deploy complete!"
echo " https://je1ght.top"
echo "========================================="
