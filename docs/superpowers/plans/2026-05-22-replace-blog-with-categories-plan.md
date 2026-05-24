# Replace Blog Page with Categories Shortcut — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove broken /blog/ page and replace homepage shortcut with Categories link

**Architecture:** Three-file change — data config, rendering logic, and cleanup. The renderer reads shortcuts generically from navigation.yml; we just swap the first item and add its i18n key mapping.

**Tech Stack:** Hexo, YAML config, vanilla JS renderer

---

### Task 1: Change first homepage shortcut from Blog to Categories

**Files:**
- Modify: `apps/blog-portal/source/_data/navigation.yml:38-43`

- [ ] **Step 1: Edit navigation.yml**

Change lines 38-43 from:
```yaml
  items:
    - label: Blog
      path: /blog/
      icon: fas fa-feather-pointed
      external: false
      description: ""
```
To:
```yaml
  items:
    - label: Categories
      path: /categories/
      icon: fas fa-folder-open
      external: false
      description: ""
```

- [ ] **Step 2: Commit**

```bash
git add apps/blog-portal/source/_data/navigation.yml
git commit -m "feat: replace Blog shortcut with Categories on homepage"
```

### Task 2: Add categories shortcutKey mapping in renderer

**Files:**
- Modify: `apps/blog-portal/scripts/portal-renderer.js:412-419`

- [ ] **Step 1: Add /categories/ to shortcutKey ternary**

Change lines 412-419 from:
```javascript
const shortcutKey =
  item.path === '/blog/'
    ? 'blog'
    : item.path === '/portfolio/'
      ? 'portfolio'
      : item.path === '/contact/'
        ? 'contact'
        : null
```
To:
```javascript
const shortcutKey =
  item.path === '/categories/'
    ? 'categories'
    : item.path === '/portfolio/'
      ? 'portfolio'
      : item.path === '/contact/'
        ? 'contact'
        : null
```

- [ ] **Step 2: Commit**

```bash
git add apps/blog-portal/scripts/portal-renderer.js
git commit -m "feat: add categories shortcutKey mapping in renderer"
```

### Task 3: Delete broken Blog page

**Files:**
- Delete: `apps/blog-portal/source/blog/index.md`

- [ ] **Step 1: Remove the blog page directory**

```bash
rm -rf apps/blog-portal/source/blog/
```

- [ ] **Step 2: Commit**

```bash
git add apps/blog-portal/source/blog/
git commit -m "fix: remove broken custom Blog page"
```

### Task 4: Verify build succeeds

- [ ] **Step 1: Run hexo generate**

```bash
cd apps/blog-portal && npx hexo generate
```

Expected: Build completes without errors.

- [ ] **Step 2: Verify categories page exists in output**

```bash
ls apps/blog-portal/public/categories/index.html
```

Expected: File exists.

- [ ] **Step 3: Verify blog page is gone**

```bash
ls apps/blog-portal/public/blog/index.html 2>&1
```

Expected: "No such file or directory"
