# .md File Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag-and-drop and click-to-import .md files into the blog post editor, with automatic YAML frontmatter parsing to fill form fields.

**Architecture:** Pure frontend feature — client-side file reading via FileReader API, regex-based YAML frontmatter parsing, and direct DOM manipulation to populate the existing form. No backend changes needed.

**Tech Stack:** Vanilla JS (FileReader API), no new dependencies

---

## Files

- Modify: `apps/backend-api/public/admin/app.js` — add import logic (file reader, frontmatter parser, drop zone handlers)
- Modify: `apps/backend-api/public/admin/index.html` — add "Import .md" button and drop zone overlay
- Modify: `apps/backend-api/public/admin/style.css` — add drop zone overlay styles

---

### Task 1: Add frontmatter parser function

**Files:**
- Modify: `apps/backend-api/public/admin/app.js` (after the `splitComma` helper, before `// --- Init ---`)

- [ ] **Step 1: Add `parseFrontmatter` function**

Add this function after `splitComma` (around line 535):

```javascript
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw.trim() }

  const yaml = match[1]
  const body = match[2].trim()
  const meta = {}

  // Simple single-line key: value parser
  let currentKey = null
  let currentArray = null

  for (const line of yaml.split('\n')) {
    const arrayItem = line.match(/^\s+-\s+(.+)$/)
    if (arrayItem && currentKey) {
      if (!currentArray) currentArray = []
      currentArray.push(arrayItem[1].trim().replace(/^["']|["']$/g, ''))
      meta[currentKey] = currentArray
      continue
    }

    // Flush previous array
    currentArray = null

    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/)
    if (kv) {
      currentKey = kv[1]
      let val = kv[2].trim().replace(/^["']|["']$/g, '')
      if (val === '' || val === 'null') {
        meta[currentKey] = null
        currentArray = null
      } else {
        meta[currentKey] = val
        currentArray = null
      }
    }
  }

  return { meta, body }
}
```

- [ ] **Step 2: Verify no syntax errors**

Run: `node -c apps/backend-api/public/admin/app.js`
Expected: no output (success)

- [ ] **Step 3: Commit**

```bash
git add apps/backend-api/public/admin/app.js
git commit -m "feat: add YAML frontmatter parser for .md import"
```

---

### Task 2: Add `importMdToForm` function

**Files:**
- Modify: `apps/backend-api/public/admin/app.js` (after `parseFrontmatter`)

- [ ] **Step 1: Add `importMdToForm` function**

Add after `parseFrontmatter`:

```javascript
function importMdToForm(text, filename) {
  const { meta, body } = parseFrontmatter(text)

  // Post form fields
  const titleEl = document.getElementById('post-title')
  const slugEl = document.getElementById('post-slug')
  const descEl = document.getElementById('post-description')
  const catEl = document.getElementById('post-categories')
  const tagEl = document.getElementById('post-tags')
  const coverEl = document.getElementById('post-cover')
  const contentEl = document.getElementById('post-content')

  // Only fill if the modal is the post editor
  if (!titleEl || !contentEl) return false

  if (meta.title) titleEl.value = meta.title
  if (meta.slug) slugEl.value = meta.slug
  if (meta.description) descEl.value = meta.description
  if (meta.categories) {
    const cats = Array.isArray(meta.categories) ? meta.categories : [meta.categories]
    catEl.value = cats.join(', ')
  }
  if (meta.tags) {
    const tags = Array.isArray(meta.tags) ? meta.tags : [meta.tags]
    tagEl.value = tags.join(', ')
  }
  if (meta.coverImage || meta.cover) coverEl.value = meta.coverImage || meta.cover
  contentEl.value = body

  showToast(`Imported from ${filename}`)
  return true
}
```

- [ ] **Step 2: Verify no syntax errors**

Run: `node -c apps/backend-api/public/admin/app.js`
Expected: no output (success)

- [ ] **Step 3: Commit**

```bash
git add apps/backend-api/public/admin/app.js
git commit -m "feat: add importMdToForm to populate form from .md file"
```

---

### Task 3: Add drop zone overlay and "Import .md" button to HTML

**Files:**
- Modify: `apps/backend-api/public/admin/index.html`

- [ ] **Step 1: Add "Import .md" button to post editor modal header**

Find the post editor modal header (line ~246):
```html
<div class="modal-header">
  <h2 id="post-editor-title">New Post</h2>
  <button class="btn btn-ghost modal-close">&times;</button>
</div>
```

Replace with:
```html
<div class="modal-header">
  <h2 id="post-editor-title">New Post</h2>
  <div class="modal-header-actions">
    <label class="btn btn-ghost btn-sm import-md-btn">
      Import .md
      <input type="file" accept=".md,.markdown,.txt" id="import-md-input" style="display:none">
    </label>
    <button class="btn btn-ghost modal-close">&times;</button>
  </div>
</div>
```

- [ ] **Step 2: Add drop zone overlay inside the post editor modal**

Find the post editor modal div (line ~243):
```html
<div id="post-editor-modal" class="modal" style="display:none">
  <div class="modal-content modal-large">
```

Add the drop zone overlay right after the opening `<div class="modal-content modal-large">`:
```html
<div id="drop-zone-overlay" class="drop-zone-overlay">
  <div class="drop-zone-message">Drop .md file to import</div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend-api/public/admin/index.html
git commit -m "feat: add Import .md button and drop zone overlay to post editor"
```

---

### Task 4: Add drop zone CSS styles

**Files:**
- Modify: `apps/backend-api/public/admin/style.css`

- [ ] **Step 1: Add styles**

Append to the end of `style.css`:

```css
/* Import .md drop zone */
.modal-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.import-md-btn {
  font-size: 0.8rem;
  cursor: pointer;
}
.drop-zone-overlay {
  display: none;
  position: absolute;
  inset: 0;
  background: rgba(88,166,255,0.15);
  border: 2px dashed #58a6ff;
  border-radius: 12px;
  z-index: 10;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.drop-zone-overlay.active {
  display: flex;
}
.drop-zone-message {
  background: #161b22;
  color: #58a6ff;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend-api/public/admin/style.css
git commit -m "feat: add drop zone overlay styles for .md import"
```

---

### Task 5: Wire up event handlers in app.js

**Files:**
- Modify: `apps/backend-api/public/admin/app.js` (at `// --- Init ---` section)

- [ ] **Step 1: Add file input change handler and drag-drop handlers**

Replace the existing `// --- Init ---` section (line ~547) with:

```javascript
// --- Import .md ---
function handleMdFile(file) {
  if (!file || (!file.name.endsWith('.md') && !file.name.endsWith('.markdown') && !file.name.endsWith('.txt'))) {
    showToast('Please drop a .md file', 'error')
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => importMdToForm(e.target.result, file.name)
  reader.readAsText(file)
}

// File input change
document.getElementById('import-md-input').addEventListener('change', (e) => {
  if (e.target.files[0]) handleMdFile(e.target.files[0])
  e.target.value = '' // reset so same file can be re-selected
})

// Drag and drop on post editor modal
const postModal = document.getElementById('post-editor-modal')
let dragCounter = 0

postModal.addEventListener('dragenter', (e) => {
  e.preventDefault()
  dragCounter++
  document.getElementById('drop-zone-overlay').classList.add('active')
})

postModal.addEventListener('dragleave', (e) => {
  e.preventDefault()
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    document.getElementById('drop-zone-overlay').classList.remove('active')
  }
})

postModal.addEventListener('dragover', (e) => {
  e.preventDefault()
})

postModal.addEventListener('drop', (e) => {
  e.preventDefault()
  dragCounter = 0
  document.getElementById('drop-zone-overlay').classList.remove('active')
  const file = e.dataTransfer.files[0]
  if (file) handleMdFile(file)
})

// --- Init ---
checkSession()
```

- [ ] **Step 2: Verify no syntax errors**

Run: `node -c apps/backend-api/public/admin/app.js`
Expected: no output (success)

- [ ] **Step 3: Commit**

```bash
git add apps/backend-api/public/admin/app.js
git commit -m "feat: wire up .md file import event handlers"
```

---

### Task 6: End-to-end verification

- [ ] **Step 1: Start backend and test locally**

Run: `cd apps/backend-api && node src/index.js &`
Navigate to `http://localhost:3001/admin/`

- [ ] **Step 2: Test click-to-import**

1. Log in and click "+ New Post"
2. Click "Import .md" button
3. Select a .md file with frontmatter
4. Verify: title, description, categories, tags, content are all populated
5. Verify: toast shows "Imported from filename.md"
6. Close modal with X button

- [ ] **Step 3: Test drag-and-drop**

1. Click "+ New Post"
2. Drag a .md file onto the modal
3. Verify: drop zone overlay appears during drag
4. Release file
5. Verify: overlay disappears, form fields populated, toast shown

- [ ] **Step 4: Test edge cases**

1. Drag a non-.md file → toast error "Please drop a .md file"
2. Drag a .md file without frontmatter → only content field populated
3. Drag a .md file with partial frontmatter → only matching fields populated

- [ ] **Step 5: Deploy**

```bash
bash scripts/deploy.sh
```

- [ ] **Step 6: Verify on production**

Navigate to `https://je1ght.top/admin`, repeat steps 2-4.
