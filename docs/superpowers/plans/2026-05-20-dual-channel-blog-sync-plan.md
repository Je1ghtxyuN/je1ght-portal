# Dual-Channel Blog Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow both local VS Code and Admin UI to create/edit blog posts with bidirectional sync on deploy.

**Architecture:** deploy.sh step 1 changes from unidirectional server-pull-with-delete to three-phase bidirectional sync (push local → import to MySQL → pull server). A new import script in backend-api reads unmarked .md files into MySQL. An auto-date Hexo filter fills missing date frontmatter from file mtime.

**Tech Stack:** Bash (deploy.sh), Node.js ESM (import script), Hexo filter API (auto-date), Prisma (MySQL access)

---

### Task 1: Modify deploy.sh — bidirectional sync + postimage

**Files:**
- Modify: `scripts/deploy.sh:15-20`

- [ ] **Step 1: Replace step 1 (server→local rsync with --delete) with three-phase sync**

Replace lines 15-20:
```bash
echo "[1/5] Syncing latest content from server..."
# Pull latest _data/ and _posts/ from server (admin UI edits live in server MySQL,
# rebuild script writes them to YAML; we need those files before local hexo generate)
rsync -avz --delete "$SERVER:$SERVER_PORTAL/source/_data/" "$REPO_ROOT/apps/blog-portal/source/_data/" 2>&1 | tail -1
rsync -avz --delete "$SERVER:$SERVER_PORTAL/source/_posts/" "$REPO_ROOT/apps/blog-portal/source/_posts/" 2>&1 | tail -1
```

With:
```bash
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
```

Also update the step numbering: `[2/5]` → `[2/5]`, etc. (step count is still 5).

- [ ] **Step 2: Verify the modified deploy.sh is syntactically valid**

Run: `bash -n scripts/deploy.sh`
Expected: no output (no syntax errors)

- [ ] **Step 3: Commit**

```bash
git add scripts/deploy.sh
git commit -m "feat: bidirectional _posts sync in deploy.sh step 1

Replace server-pull-with-delete with three-phase sync: push local to
server, import unmarked posts into MySQL, pull back merged state.
Add postimage/ directory to sync set.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Create import-local-posts.js — import unmarked .md into MySQL

**Files:**
- Create: `apps/backend-api/scripts/import-local-posts.js`

- [ ] **Step 1: Create the import script**

```javascript
import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { prisma } from '../src/db/client.js'

const MANAGED_MARKER = '<!-- managed-by-backend-api -->'

const POSTS_DIR = join('/portal-source', 'source', '_posts')

function yamlEscape(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  const str = String(value)
  if (str.includes('\n') || str.includes(':') || str.includes('#') || str.includes('"') || str.includes(',')) {
    return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return str
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const fm = {}
  const lines = match[1].split('\n')
  let currentKey = null
  let inArray = false
  for (const line of lines) {
    if (/^\s{2}- /.test(line)) {
      if (currentKey) {
        if (!Array.isArray(fm[currentKey])) fm[currentKey] = []
        fm[currentKey].push(line.trim().replace(/^-\s*/, ''))
      }
      continue
    }
    inArray = false
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/)
    if (kv) {
      currentKey = kv[1]
      const val = kv[2].trim()
      if (val === '') {
        inArray = true
      } else {
        fm[currentKey] = val.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
      }
    }
  }
  return fm
}

function postToFrontmatter(post) {
  const lines = ['---']
  lines.push(`title: ${yamlEscape(post.title)}`)
  lines.push(`date: ${new Date(post.publishedAt || post.createdAt).toISOString().replace('T', ' ').slice(0, 19)}`)
  if (post.description) lines.push(`description: ${yamlEscape(post.description)}`)

  const categories = Array.isArray(post.categories) ? post.categories : []
  if (categories.length > 0) {
    lines.push('categories:')
    for (const cat of categories) lines.push(`  - ${yamlEscape(cat)}`)
  }

  const tags = Array.isArray(post.tags) ? post.tags : []
  if (tags.length > 0) {
    lines.push('tags:')
    for (const tag of tags) lines.push(`  - ${yamlEscape(tag)}`)
  }

  lines.push('---')
  lines.push('')
  lines.push(post.content || '')

  return lines.join('\n')
}

async function importLocalPosts() {
  let files
  try {
    files = await readdir(POSTS_DIR)
  } catch {
    console.log('import-local-posts: _posts dir not found, skipping')
    return { imported: 0, updated: 0 }
  }

  let imported = 0
  let updated = 0

  for (const file of files) {
    if (!file.endsWith('.md')) continue

    const filePath = join(POSTS_DIR, file)
    const raw = await readFile(filePath, 'utf-8')

    // Skip already-managed files (Admin UI manages these via rebuild)
    if (raw.includes(MANAGED_MARKER)) continue

    const slug = file.replace(/\.md$/, '')
    const frontmatter = parseFrontmatter(raw)
    const bodyContent = raw.replace(/^---\n[\s\S]*?\n---\n?/, '')
    const stats = await stat(filePath)
    const fileMtime = stats.mtime

    const title = frontmatter.title || slug
    const description = frontmatter.description || ''
    const categories = Array.isArray(frontmatter.categories) ? frontmatter.categories : (frontmatter.categories ? [frontmatter.categories] : [])
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : (frontmatter.tags ? [frontmatter.tags] : [])

    const existing = await prisma.blogPost.findUnique({ where: { slug } })

    if (existing) {
      // Compare file mtime with MySQL updatedAt — file wins if newer
      const dbUpdated = new Date(existing.updatedAt)
      if (fileMtime > dbUpdated) {
        await prisma.blogPost.update({
          where: { slug },
          data: {
            title,
            description,
            content: bodyContent.trim(),
            categories,
            tags,
            updatedAt: new Date(),
          },
        })
        updated++
        console.log(`import-local-posts: updated "${slug}" (file newer)`)
      } else {
        console.log(`import-local-posts: skipped "${slug}" (DB newer, file unchanged)`)
        continue
      }
    } else {
      await prisma.blogPost.create({
        data: {
          slug,
          title,
          description,
          content: bodyContent.trim(),
          categories,
          tags,
          published: true,
          publishedAt: frontmatter.date ? new Date(frontmatter.date) : fileMtime,
          createdAt: frontmatter.date ? new Date(frontmatter.date) : fileMtime,
        },
      })
      imported++
      console.log(`import-local-posts: created "${slug}"`)
    }

    // Re-read from DB to get canonical record, then rewrite .md with marker
    const record = await prisma.blogPost.findUnique({ where: { slug } })
    if (record) {
      const md = postToFrontmatter(record) + '\n' + MANAGED_MARKER
      await writeFile(filePath, md, 'utf-8')
    }
  }

  console.log(`import-local-posts: done (${imported} created, ${updated} updated)`)
  return { imported, updated }
}

importLocalPosts()
  .then((result) => {
    console.log(`import-local-posts: ${result.imported} imported, ${result.updated} updated`)
    process.exit(0)
  })
  .catch((err) => {
    console.error('import-local-posts error:', err.message)
    process.exit(1)
  })
```

- [ ] **Step 2: Verify script syntax**

Run: `cd apps/backend-api && node --check scripts/import-local-posts.js`
Expected: no output (no syntax errors)

- [ ] **Step 3: Commit**

```bash
git add apps/backend-api/scripts/import-local-posts.js
git commit -m "feat: add import-local-posts script for bidirectional sync

Scans _posts/ for .md files without managed-by-backend-api marker,
imports them into MySQL (INSERT or mtime-based UPDATE), then rewrites
the .md file with marker. Called by deploy.sh step 1b via docker exec.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Create auto-date.js Hexo filter

**Files:**
- Create: `apps/blog-portal/scripts/auto-date.js`

- [ ] **Step 1: Create the Hexo filter script**

```javascript
const { statSync } = require('node:fs')

hexo.extend.filter.register('before_post_render', function (data) {
  // Only fill date for posts missing it (page posts have their own dates)
  if (!data.date || data.date.valueOf() === 0) {
    if (data.source) {
      try {
        const stats = statSync(data.source)
        data.date = stats.mtime
      } catch {
        // file not found (e.g. draft in db.json cache), leave date as-is
      }
    }
  }
  return data
})
```

- [ ] **Step 2: Verify Hexo picks up the script**

Run: `cd apps/blog-portal && ls scripts/auto-date.js`
Expected: file exists

- [ ] **Step 3: Commit**

```bash
git add apps/blog-portal/scripts/auto-date.js
git commit -m "feat: auto-fill date frontmatter from file mtime

New before_post_render filter: if a post has no date or zero date,
uses the file's modification time as the post date.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Verification

- [ ] **Step 1: Full dry-run — verify all files exist and scripts are valid**

```bash
# Syntax check all modified/created scripts
bash -n scripts/deploy.sh
cd apps/blog-portal && node -e "require('./scripts/auto-date.js')" 2>&1 || true
cd ../backend-api && node --check scripts/import-local-posts.js
```

Expected: deploy.sh syntax passes; auto-date.js loads (may warn outside Hexo context); import script syntax passes.

- [ ] **Step 2: Review git diff for unintended changes**

```bash
git diff --stat HEAD~3..HEAD
git log --oneline -5
```

Expected: 4 commits (design doc + 3 implementation commits), only the intended files changed.

- [ ] **Step 3: Verify deploy.sh flow order**

Confirm the deploy.sh step order is correct:
- Phase 1a (push local to server) happens before 1b (import), so new local files exist on server
- Phase 1b (import) happens before 1c (pull from server), so imported files get the managed marker
- Phase 1c (pull) uses no `--delete`, preserving local-only files

Read the modified deploy.sh and trace the logic.

- [ ] **Step 4: Commit verification results (if any fixes needed) or declare done**

No separate commit needed if verification passes.
