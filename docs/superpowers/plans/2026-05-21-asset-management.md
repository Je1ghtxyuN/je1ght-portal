# Brand Asset Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin UI upload for profile/icon/background images with auto-formatting, JS background rotation, and bidirectional sync.

**Architecture:** Backend API with Sharp image processing writes to server filesystem. Admin SPA gets a new Assets tab. Portal frontend rotates backgrounds via setInterval. Deploy script gains server→local rsync for shared-assets.

**Tech Stack:** Hono (backend), Sharp (image processing), vanilla JS (admin UI + portal hero), rsync (sync)

---

## File Map

| File | Action | Responsibility |
|------|--------|-----------------|
| `apps/backend-api/src/routes/assets.js` | **Create** | Upload/list/delete/set-default endpoints |
| `apps/backend-api/src/app.js` | Modify | Register assets route |
| `apps/backend-api/package.json` | Modify | Add `sharp` dependency |
| `apps/backend-api/public/admin/index.html` | Modify | Add Assets tab + HTML |
| `apps/backend-api/public/admin/app.js` | Modify | Add assets tab logic + upload handlers |
| `apps/backend-api/public/admin/style.css` | Modify | Add asset card styles |
| `apps/blog-portal/scripts/portal-renderer.js` | Modify | Embed background list in heroData |
| `apps/blog-portal/source/js/portal-hero.js` | Modify | Background rotation timer |
| `apps/blog-portal/source/_data/site_profile.yml` | Modify | Add hero_backgrounds + hero_rotation_interval |
| `scripts/deploy.sh` | Modify | Add shared-assets rsync pull |

---

### Task 1: Add Sharp dependency and create assets route skeleton

**Files:**
- Modify: `apps/backend-api/package.json`
- Create: `apps/backend-api/src/routes/assets.js`
- Modify: `apps/backend-api/src/app.js`

- [ ] **Step 1: Add sharp to package.json**

```bash
cd apps/backend-api && npm install sharp
```

- [ ] **Step 2: Create assets route file with all 4 endpoints**

Create `apps/backend-api/src/routes/assets.js`:

```js
import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'
import { mkdir, writeFile, readdir, unlink, copyFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import sharp from 'sharp'
import { env } from '../config/env.js'

const assets = new Hono()

function getPortalRoot() {
  if (env.REPO_ROOT === '/portal-source') return '/portal-source'
  if (env.REPO_ROOT) return join(env.REPO_ROOT, 'apps', 'blog-portal')
  throw new Error('REPO_ROOT is not configured')
}

function getAssetsDir() {
  return join(getPortalRoot(), 'source', 'shared-assets', 'images')
}

function getBackgroundsDir() {
  return join(getAssetsDir(), 'backgrounds')
}

const BG_MAX_WIDTH = 1920
const BG_QUALITY = 85
const AVATAR_SIZE = 400
const AVATAR_QUALITY = 85

// GET /api/admin/assets — list all assets
assets.get('/admin/assets', requireAuth(), async (c) => {
  const assetsDir = getAssetsDir()
  const backgroundsDir = getBackgroundsDir()

  const result = { avatar: null, icon: null, backgrounds: [], defaultBackground: null }

  try {
    const rootFiles = await readdir(assetsDir, { withFileTypes: true })
    for (const f of rootFiles) {
      if (!f.isFile()) continue
      if (f.name === 'profile.jpg') result.avatar = f.name
      if (f.name === 'icon.png') result.icon = f.name
      if (f.name === 'background.jpg') result.defaultBackground = f.name
    }
  } catch {}

  try {
    const bgFiles = await readdir(backgroundsDir, { withFileTypes: true })
    for (const f of bgFiles) {
      if (f.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(f.name)) {
        result.backgrounds.push(f.name)
      }
    }
  } catch {}

  return c.json(result)
})

// POST /api/admin/assets/upload — upload an asset
assets.post('/admin/assets/upload', requireAuth(), async (c) => {
  const body = await c.req.parseBody()
  const file = body.file
  const type = body.type || 'background'

  if (!file) return c.json({ error: 'No file provided' }, 400)

  const assetsDir = getAssetsDir()
  const backgroundsDir = getBackgroundsDir()
  await mkdir(assetsDir, { recursive: true })

  const buf = Buffer.from(await file.arrayBuffer())
  const ext = extname(file.name).toLowerCase()

  // Validate image
  try {
    const meta = await sharp(buf).metadata()
    if (!meta.width) throw new Error('invalid image')
  } catch {
    return c.json({ error: 'Invalid image file' }, 400)
  }

  const pipeline = sharp(buf)

  if (type === 'avatar') {
    const outPath = join(assetsDir, 'profile.jpg')
    await pipeline
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: AVATAR_QUALITY })
      .toFile(outPath)
    return c.json({ filename: 'profile.jpg', type: 'avatar' })
  }

  if (type === 'icon') {
    const outPath = join(assetsDir, 'icon.png')
    await pipeline.png().toFile(outPath)
    return c.json({ filename: 'icon.png', type: 'icon' })
  }

  if (type === 'background') {
    await mkdir(backgroundsDir, { recursive: true })
    const ts = Date.now()
    const filename = `bg-${ts}.jpg`
    const outPath = join(backgroundsDir, filename)
    await pipeline
      .resize(BG_MAX_WIDTH, undefined, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: BG_QUALITY })
      .toFile(outPath)
    return c.json({ filename, type: 'background', path: `/shared-assets/images/backgrounds/${filename}` })
  }

  return c.json({ error: 'Invalid type. Use avatar, icon, or background.' }, 400)
})

// DELETE /api/admin/assets/:filename — remove from backgrounds pool
assets.delete('/admin/assets/:filename', requireAuth(), async (c) => {
  const { filename } = c.req.param()

  // Protect fixed assets
  if (['profile.jpg', 'icon.png', 'background.jpg'].includes(filename)) {
    return c.json({ error: 'Cannot delete core asset. Replace it by uploading a new one.' }, 400)
  }

  const backgroundsDir = getBackgroundsDir()
  const filePath = join(backgroundsDir, filename)

  try {
    await unlink(filePath)
  } catch {
    return c.json({ error: 'File not found' }, 404)
  }

  return c.json({ deleted: filename })
})

// POST /api/admin/assets/set-default — promote a backgrounds/ file to background.jpg
assets.post('/admin/assets/set-default', requireAuth(), async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { filename } = body

  if (!filename) return c.json({ error: 'filename required' }, 400)

  const backgroundsDir = getBackgroundsDir()
  const src = join(backgroundsDir, filename)
  const dest = join(getAssetsDir(), 'background.jpg')

  try {
    await copyFile(src, dest)
  } catch {
    return c.json({ error: 'File not found in backgrounds pool' }, 404)
  }

  return c.json({ defaultBackground: filename })
})

export { assets }
```

- [ ] **Step 3: Register route in app.js**

```bash
# Add import at top:
import { assets } from './routes/assets.js'

# Add route registration after existing routes:
app.route('/assets', assets)
```

Edit `apps/backend-api/src/app.js`:
- Add import: `import { assets } from './routes/assets.js'`
- Add route: `app.route('/assets', assets)`

- [ ] **Step 4: Verify server starts**

```bash
cd apps/backend-api && npm run dev
# Expected: server starts without errors on port 3001
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend-api/package.json apps/backend-api/package-lock.json \
        apps/backend-api/src/routes/assets.js apps/backend-api/src/app.js
git commit -m "feat: add asset upload API endpoints with Sharp processing"
```

---

### Task 2: Add Assets tab to Admin UI

**Files:**
- Modify: `apps/backend-api/public/admin/index.html`
- Modify: `apps/backend-api/public/admin/app.js`
- Modify: `apps/backend-api/public/admin/style.css`

- [ ] **Step 1: Add Assets tab button and tab content in HTML**

In `apps/backend-api/public/admin/index.html`, after the "Site Profile" tab button (line 42):

```html
<button class="tab" data-tab="assets">Assets</button>
```

After the Site Profile tab content div closing `</div>` (around line 218 area), add:

```html
<!-- Assets Tab -->
<div id="tab-assets" class="tab-content">
  <div class="asset-section">
    <h3>Avatar</h3>
    <div class="asset-upload-row">
      <div class="input-with-preview">
        <img id="asset-avatar-preview" class="img-preview" src="" alt="Avatar preview">
      </div>
      <div>
        <input type="file" id="asset-avatar-input" accept="image/*">
        <button class="btn btn-primary btn-sm" id="asset-avatar-upload">Upload Avatar</button>
      </div>
    </div>
  </div>

  <div class="asset-section">
    <h3>Icon</h3>
    <div class="asset-upload-row">
      <div class="input-with-preview">
        <img id="asset-icon-preview" class="img-preview img-preview--sm" src="" alt="Icon preview">
      </div>
      <div>
        <input type="file" id="asset-icon-input" accept="image/*">
        <button class="btn btn-primary btn-sm" id="asset-icon-upload">Upload Icon</button>
      </div>
    </div>
  </div>

  <div class="asset-section">
    <h3>Backgrounds</h3>
    <div class="asset-upload-row">
      <input type="file" id="asset-bg-input" accept="image/*" multiple>
      <button class="btn btn-primary btn-sm" id="asset-bg-upload">Upload Backgrounds</button>
    </div>
    <div id="asset-bg-grid" class="asset-bg-grid"></div>
  </div>
</div>
```

- [ ] **Step 2: Add Assets tab logic in app.js**

In `apps/backend-api/public/admin/app.js`:

Add `else if (name === 'assets') await loadAssets()` to the `loadTab` function (around line 83):

```js
async function loadTab(name) {
  if (name === 'posts') await loadPosts()
  else if (name === 'portfolio') await loadPortfolio()
  else if (name === 'profile') await loadProfile()
  else if (name === 'assets') await loadAssets()
}
```

Add the assets functions at the end (before `// --- Init ---`):

```js
// --- Assets ---
async function loadAssets() {
  const { avatar, icon, backgrounds, defaultBackground } = await api('/assets/admin/assets')
  document.getElementById('asset-avatar-preview').src = avatar ? `/shared-assets/images/${avatar}` : ''
  document.getElementById('asset-icon-preview').src = icon ? `/shared-assets/images/${icon}` : ''

  const grid = document.getElementById('asset-bg-grid')
  grid.innerHTML = backgrounds.length
    ? backgrounds.map(bg => `
      <div class="asset-bg-card">
        <img src="/shared-assets/images/backgrounds/${bg}" alt="${bg}">
        <div class="asset-bg-card__name">${bg}${bg === defaultBackground ? ' (default)' : ''}</div>
        <div class="asset-bg-card__actions">
          <button class="btn btn-ghost btn-sm" onclick="setDefaultBg('${bg}')">Set Default</button>
          <button class="btn btn-danger btn-sm" onclick="deleteBg('${bg}')">Delete</button>
        </div>
      </div>`).join('')
    : '<p style="color:#8b949e">No background images uploaded yet.</p>'
}

function uploadAsset(type) {
  const inputId = type === 'background' ? 'asset-bg-input' : `asset-${type}-input`
  const input = document.getElementById(inputId)
  const files = input.files
  if (!files || files.length === 0) return

  const uploadFile = async (file) => {
    const form = new FormData()
    form.append('file', file)
    form.append('type', type)
    const res = await fetch('/assets/admin/assets/upload', {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    return res.json()
  }

  Promise.all(Array.from(files).map(uploadFile))
    .then(() => {
      showToast(`${files.length} file(s) uploaded`)
      loadAssets()
    })
    .catch(err => showToast('Upload failed: ' + err.message, 'error'))
    .finally(() => { input.value = '' })
}

document.getElementById('asset-avatar-upload').addEventListener('click', () => uploadAsset('avatar'))
document.getElementById('asset-icon-upload').addEventListener('click', () => uploadAsset('icon'))
document.getElementById('asset-bg-upload').addEventListener('click', () => uploadAsset('background'))

window.setDefaultBg = async function (filename) {
  try {
    await api('/assets/admin/assets/set-default', {
      method: 'POST',
      body: JSON.stringify({ filename }),
    })
    showToast('Default background updated')
    loadAssets()
  } catch (err) {
    showToast('Failed: ' + err.message, 'error')
  }
}

window.deleteBg = async function (filename) {
  if (!confirm(`Delete "${filename}"?`)) return
  try {
    await api(`/assets/admin/assets/${filename}`, { method: 'DELETE' })
    showToast('Background deleted')
    loadAssets()
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error')
  }
}
```

- [ ] **Step 3: Add CSS styles**

In `apps/backend-api/public/admin/style.css`, append:

```css
.asset-section { margin-bottom: 2rem; }
.asset-section h3 { margin: 0 0 1rem; font-size: 1rem; color: #e6edf3; }
.asset-upload-row { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; }
.asset-bg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; }
.asset-bg-card { background: #161b22; border: 1px solid #30363d; border-radius: 6px; overflow: hidden; }
.asset-bg-card img { width: 100%; height: 100px; object-fit: cover; }
.asset-bg-card__name { padding: 0.4rem 0.6rem; font-size: 0.75rem; color: #8b949e; word-break: break-all; }
.asset-bg-card__actions { padding: 0.4rem 0.6rem; display: flex; gap: 0.4rem; }
```

- [ ] **Step 4: Test admin UI**

```bash
# Start backend locally
cd apps/backend-api && npm run dev
# Open http://localhost:3001/admin
# Login, click "Assets" tab
# Upload a test avatar, icon, and background
# Verify previews update, background grid populates
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend-api/public/admin/index.html \
        apps/backend-api/public/admin/app.js \
        apps/backend-api/public/admin/style.css
git commit -m "feat: add Assets tab to admin UI with upload/preview/delete"
```

---

### Task 3: Background rotation JS + portal renderer update

**Files:**
- Modify: `apps/blog-portal/scripts/portal-renderer.js:738-747`
- Modify: `apps/blog-portal/source/js/portal-hero.js`
- Modify: `apps/blog-portal/source/_data/site_profile.yml`

- [ ] **Step 1: Add hero_backgrounds and hero_rotation_interval to site_profile.yml**

In `apps/blog-portal/source/_data/site_profile.yml`, after `hero_background_path` (line 52):

```yaml
hero_backgrounds: []
hero_rotation_interval: 300
```

- [ ] **Step 2: Embed background list in portal-renderer.js heroData**

In `apps/blog-portal/scripts/portal-renderer.js`, inside the `heroData` object (around line 738), add two fields:

```js
hero_backgrounds: Array.isArray(profile.hero_backgrounds) ? profile.hero_backgrounds : [],
hero_rotation_interval: typeof profile.hero_rotation_interval === 'number' ? profile.hero_rotation_interval : 300,
```

So the heroData block becomes:

```js
const heroData = {
  display_name: fallbackText(profile.owner?.display_name, hexo.config.author),
  full_name: fallbackText(profile.owner?.full_name, ''),
  avatar_path: fallbackText(profile.avatar_path, '/shared-assets/images/profile.jpg'),
  intro_short: fallbackText(profile.intro?.short, ''),
  intro_long: fallbackText(profile.intro?.long, ''),
  hero_phrases: Array.isArray(profile.hero_phrases) && profile.hero_phrases.length > 0
    ? profile.hero_phrases
    : ['Code, Anime, Games, and Coffee.', 'VR, HCI, and game dev.', "Writing things down so I don't forget."],
  hero_backgrounds: Array.isArray(profile.hero_backgrounds) ? profile.hero_backgrounds : [],
  hero_rotation_interval: typeof profile.hero_rotation_interval === 'number' ? profile.hero_rotation_interval : 300,
}
```

- [ ] **Step 3: Add background rotation timer to portal-hero.js**

In `apps/blog-portal/source/js/portal-hero.js`, after the existing hero setup (after the scroll hint, before `})()`), add:

```js
// Background rotation
var backgrounds = data.hero_backgrounds || []
var rotationInterval = (data.hero_rotation_interval || 300) * 1000

if (backgrounds.length > 1) {
  var bgIndex = 0
  setInterval(function () {
    bgIndex = (bgIndex + 1) % backgrounds.length
    if (header) {
      header.style.backgroundImage = 'url(' + backgrounds[bgIndex] + ')'
    }
  }, rotationInterval)
}
```

- [ ] **Step 4: Build and test locally**

```bash
cd apps/blog-portal
rm -f db.json
./node_modules/.bin/hexo generate
# Open public/index.html in browser
# Verify hero data script contains hero_backgrounds array
# If backgrounds is empty array, rotation won't trigger (correct)
```

- [ ] **Step 5: Commit**

```bash
git add apps/blog-portal/scripts/portal-renderer.js \
        apps/blog-portal/source/js/portal-hero.js \
        apps/blog-portal/source/_data/site_profile.yml
git commit -m "feat: add background rotation timer and hero_backgrounds data"
```

---

### Task 4: Auto-populate hero_backgrounds in rebuild service

**Files:**
- Modify: `apps/backend-api/src/services/rebuild.js:158-163`

- [ ] **Step 1: Enrich profile data with filesystem background scan**

In `apps/backend-api/src/services/rebuild.js`, replace the site_profile.yml generation block (lines 158-163):

```js
  // 2. Generate site_profile.yml
  const profile = await prisma.siteProfile.findUnique({ where: { id: 'default' } })
  if (profile?.data) {
    // Clone so we don't mutate cached DB data
    const data = { ...profile.data }

    // Auto-populate hero_backgrounds from filesystem
    try {
      const backgroundsDir = join(getPortalRoot(), 'source', 'shared-assets', 'images', 'backgrounds')
      const bgFiles = await readdir(backgroundsDir)
      const bgPaths = bgFiles
        .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .sort()
        .map(f => `/shared-assets/images/backgrounds/${f}`)
      if (bgPaths.length > 0) {
        data.hero_backgrounds = bgPaths
      }
    } catch { /* backgrounds dir may not exist yet — leave hero_backgrounds as-is */ }

    // Default rotation interval
    if (!data.hero_rotation_interval) {
      data.hero_rotation_interval = 300
    }

    const yamlContent = MANAGED_MARKER_YML + '\n' + toYaml(data)
    await writeFile(join(dataDir, 'site_profile.yml'), yamlContent, 'utf-8')
  }
```

- [ ] **Step 2: Verify rebuild service writes backgrounds**

```bash
# SSH into server after deploying, check generated site_profile.yml
ssh je1ght-server "cat /home/je1ght/websites/je1ght-platform/portal-source/source/_data/site_profile.yml | grep -A5 hero_backgrounds"
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend-api/src/services/rebuild.js
git commit -m "feat: auto-populate hero_backgrounds from filesystem in rebuild"
```

---

### Task 6: Add shared-assets rsync to deploy.sh

**Files:**
- Modify: `scripts/deploy.sh`

- [ ] **Step 1: Add server→local rsync for shared-assets images**

In `scripts/deploy.sh`, after the existing Phase C pull-back lines (after `_data/` rsync around line 41), add:

```bash
# Phase c continued: pull back admin-uploaded brand assets (avatar, icon, backgrounds)
rsync -avz \
  "$SERVER:$SERVER_PORTAL/source/shared-assets/images/" \
  "$REPO_ROOT/packages/shared-assets/images/" 2>&1 | tail -1
```

- [ ] **Step 2: Verify the deploy script runs**

```bash
# Dry-run check: does the shared-assets directory exist on the server?
ssh je1ght-server "ls /home/je1ght/websites/je1ght-platform/portal-source/source/shared-assets/images/"
```

- [ ] **Step 3: Commit**

```bash
git add scripts/deploy.sh
git commit -m "feat: sync shared-assets images from server to local in deploy"
```

---

### Task 7: Integration test — full deploy

- [ ] **Step 1: Build and deploy**

```bash
bash scripts/deploy.sh
```

- [ ] **Step 2: Verify admin UI**

Open `https://je1ght.top/admin`, login, click Assets tab. Upload:
- A test avatar (verify it shows up on home page)
- A test icon (verify it appears in nav bar on all pages)
- 3 test backgrounds (verify grid shows them)

- [ ] **Step 3: Set a default background and verify it shows**

Click "Set Default" on one background. Rebuild. Verify home page header shows the new background.

- [ ] **Step 4: Verify background rotation**

Check page source: `hero_backgrounds` array is populated. Wait 5 minutes or reduce rotation interval for testing.

- [ ] **Step 5: Verify sync back to local**

After deploy completes, check that uploaded assets exist locally:

```bash
ls -la packages/shared-assets/images/
ls -la packages/shared-assets/images/backgrounds/
```

- [ ] **Step 6: Commit deploy artifacts if any**

---

### Task 8: Fix accumulated bugs from earlier session

These changes are already edited but not committed. Bundle them:

- [ ] **Step 1: Review and commit the pending fixes**

```bash
git diff --stat
# Should show:
# _config.yml (je1ght.top URL fix)
# _config.butterfly.yml (if changed)
# docker-note.md (cover added)
# portal-hero.js (textContent → siteName fix)
# 4 MCP series posts (renamed, frontmatter, series nav)

git add apps/blog-portal/_config.yml \
        apps/blog-portal/source/_posts/docker-note.md \
        apps/blog-portal/source/js/portal-hero.js \
        apps/blog-portal/source/_posts/
git commit -m "fix: correct site URL, add docker cover, fix nav icon bug, rename MCP posts"
```

- [ ] **Step 2: Deploy everything**

```bash
bash scripts/deploy.sh
```

- [ ] **Step 3: Verify live site**

Open `https://je1ght.top`:
- Nav icon visible (was the textContent bug)
- Copyright link shows `je1ght.top` not `je1ghtxyun.github.io`
- docker-note has cover thumbnail on blog page
- MCP series navigation at bottom of each post

---

## Dependency Order

```
Task 1 (backend API) ──┐
                       ├── Task 2 (admin UI) ──┐
Task 4 (rebuild scan) ─┘                       ├── Task 7 (integration test)
Task 3 (portal JS) ─── independent             │
Task 5 (deploy sync) ── independent            │
Task 6 (bug fixes) ─── bundle existing ────────┘
```
