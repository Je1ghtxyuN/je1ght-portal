# Blog Dual-Channel Editing & Sync

**Date:** 2026-05-20
**Status:** approved

## Goal

Both local VS Code and Admin UI can create/edit blog posts. Deployment (`deploy.sh`) merges changes bidirectionally. No content is lost from either channel.

## Current Pain Points

- `deploy.sh` step 1 uses `rsync --delete` pulling `_posts/` from server, overwriting local changes
- Local `.md` files have no path into MySQL, so Admin UI cannot see them
- `date` front-matter must be manually written
- No standard place for per-article images

## Design

### 1. Bidirectional rsync in deploy.sh

Replace step 1 (server-to-local rsync with `--delete`) with three-phase sync:

| Phase | Direction | Purpose |
|-------|-----------|---------|
| 1a | local → server | Push local new posts/images first |
| 1b | server (SSH) | Run import script to ingest local posts into MySQL |
| 1c | server → local | Pull back Admin-managed posts (no `--delete`) |

Also add `postimage/` to the rsync set for article-specific image directories.

### 2. Server-side import script

New file: `apps/blog-portal/scripts/import-local-posts.js`

- Scans `source/_posts/*.md`
- Skips files with `<!-- managed-by-backend-api -->` marker (already in MySQL)
- Parses front-matter from unmarked files
- Slug = filename minus `.md` extension
- INSERT if slug not found in MySQL, UPDATE if file mtime > `updatedAt`
- After DB write: re-generate `.md` via rebuild logic (now includes marker)
- Runs only on server (detected by env)

### 3. Auto-date generator

New file: `apps/blog-portal/scripts/auto-date.js`

Hexo `before_post_render` filter:
- If post has no `date` or `date` is zero → use file `mtime` as date
- If post already has `date` → keep it unchanged
- No user-facing config needed

### 4. Image directories

- Location: `source/postimage/<article-slug>/`
- Referenced in markdown as `/postimage/<article-slug>/file.png`
- Hexo copies `source/*` (except `_posts`) verbatim to `public/`
- deploy.sh syncs `postimage/` bidirectionally

## Data Flow

```
Local VS Code                     Server
─────────────                     ──────
_posts/new.md ── push (1a) ────→ _posts/new.md
                                   │
                                   ▼
                              import script (1b)
                              detect: no marker
                              INSERT INTO MySQL
                              rewrite .md with marker
                                   │
_posts/new.md ←── pull (1c) ──── _posts/new.md (now with marker)

postimage/     ←─ bidirectional ─→ postimage/

hexo generate
public/        ── push (4) ─────→ public/ → nginx
```

## Files Changed

| File | Action | Summary |
|------|--------|---------|
| `scripts/deploy.sh` | Modify | Three-phase step 1, add postimage sync |
| `apps/blog-portal/scripts/import-local-posts.js` | New | Import unmarked .md into MySQL |
| `apps/blog-portal/scripts/auto-date.js` | New | Auto-fill date frontmatter from file mtime |

## Edge Cases

- **New local post:** No marker, no MySQL record → INSERT
- **Local edit of Admin post:** No marker, MySQL has record → compare mtime, UPDATE if local is newer
- **Admin edit, then local edit:** Both have marker → import sees marker and skips, deploy.sh pull overwrites local with server version (server is newer). If local was edited after marker removal, no marker → mtime comparison wins.
- **File deleted locally:** Not synced to server (rsync without `--delete`). Server copy persists until admin explicitly deletes via Admin UI.
- **Import script not present (local dev):** SSH step fails gracefully, hexo server still works.
