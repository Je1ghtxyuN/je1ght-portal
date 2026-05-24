# Cleanup Hexo Scripts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> to implement this plan task-by-task.

**Goal:** Remove dead code and redundant scripts from `apps/blog-portal/scripts/`

**Architecture:** Delete 1 redundant file, trim 2 dead tags from portal-tags.js, remove 2 unused
render functions from portal-renderer.js, update source/index.md with clarifying comment.
No new files. All changes are deletions or single-line edits.

**Tech Stack:** Hexo 7.3, Node.js, JavaScript (CommonJS)

---

### Task 1: Delete portal-home-tag.js

**Files:**
- Delete: `apps/blog-portal/scripts/portal-home-tag.js`

**Why:** This tag plugin registers `{% portal_home %}` but the homepage is already controlled
by `portal-home-generator.js` which sets page content directly via generator. The tag is never
reached. Its presence caused confusion when trying to switch homepage modes.

- [ ] **Step 1: Delete the file**

```bash
rm apps/blog-portal/scripts/portal-home-tag.js
```

- [ ] **Step 2: Commit**

```bash
git add apps/blog-portal/scripts/portal-home-tag.js
git commit -m "chore: remove redundant portal-home-tag.js (generator handles homepage)"
```

---

### Task 2: Remove dead tags from portal-tags.js

**Files:**
- Modify: `apps/blog-portal/scripts/portal-tags.js`

**Why:** `portal_blog` was never used in any source page. `portal_study_room` was for the
study-app which was separated into its own repo on 2026-05-16. Both tags have no callers.

- [ ] **Step 1: Remove the two dead tag registrations**

Edit `apps/blog-portal/scripts/portal-tags.js`, remove lines 5 and 8:

```diff
-hexo.extend.tag.register('portal_blog', () => portalRenderer.renderBlog())
 hexo.extend.tag.register('portal_portfolio', () => portalRenderer.renderPortfolio())
 hexo.extend.tag.register('portal_about', () => portalRenderer.renderAbout())
-hexo.extend.tag.register('portal_study_room', () => portalRenderer.renderStudyRoom())
 hexo.extend.tag.register('portal_contact', () => portalRenderer.renderContact())
```

- [ ] **Step 2: Commit**

```bash
git add apps/blog-portal/scripts/portal-tags.js
git commit -m "chore: remove unused portal_blog and portal_study_room tags"
```

---

### Task 3: Remove renderBlog and renderStudyRoom from portal-renderer.js

**Files:**
- Modify: `apps/blog-portal/scripts/portal-renderer.js`

**Why:** These functions are only called by the tags removed in Task 2. Deleting them
reduces the file by ~60 lines and eliminates dead code.

- [ ] **Step 1: Remove renderBlog function (lines ~545-604)**

Delete the `renderBlog` function block:

```javascript
  const renderBlog = (siteLocals) => {
    const allPosts = getLatestPosts(siteLocals, Number.MAX_SAFE_INTEGER)
    // ... entire function body
  }
```

- [ ] **Step 2: Remove renderStudyRoom function**

Delete the `renderStudyRoom` function block (if it exists — locate by searching `renderStudyRoom`).

- [ ] **Step 3: Remove renderBlog and renderStudyRoom from returned object**

Edit the return statement at the bottom of `module.exports = function createPortalRenderer`:

```diff
  return {
    PORTAL_CONFIG,
    renderHero,
    renderRecentPosts,
    renderPortfolioPreview,
    renderFooter,
    renderHome,
-   renderBlog,
    renderPortfolio,
    renderAbout,
    renderContact,
-   renderStudyRoom,
  }
```

- [ ] **Step 4: Verify no remaining references**

```bash
grep -n "renderBlog\|renderStudyRoom" apps/blog-portal/scripts/portal-renderer.js
# Expected: no output
```

- [ ] **Step 5: Commit**

```bash
git add apps/blog-portal/scripts/portal-renderer.js
git commit -m "chore: remove unused renderBlog and renderStudyRoom functions"
```

---

### Task 4: Update source/index.md with clarifying comment

**Files:**
- Modify: `apps/blog-portal/source/index.md`

**Why:** The `{% portal_home %}` tag in index.md is misleading — the generator overrides
the page content. Replace it with a comment explaining the actual mechanism.

- [ ] **Step 1: Rewrite source/index.md**

Replace the file content:

```markdown
---
title: Home
comments: false
date: 2025-06-25 00:00:00
---

<!-- Homepage HTML is controlled by scripts/portal-home-generator.js.
     This page exists as a placeholder; the generator sets type, layout,
     and content at build time. To switch to Butterfly default theme:
     npm run home:default -->
```

- [ ] **Step 2: Commit**

```bash
git add apps/blog-portal/source/index.md
git commit -m "docs: clarify source/index.md is controlled by generator"
```

---

### Task 5: Verification — build and check

- [ ] **Step 1: Full rebuild**

```bash
cd apps/blog-portal && rm -rf db.json public && npx hexo generate 2>&1 | tail -5
# Expected: INFO  N files generated in X ms
```

- [ ] **Step 2: Verify custom homepage**

```bash
grep -c "portal-home" apps/blog-portal/public/index.html
# Expected: > 0 (custom template is intact)
```

- [ ] **Step 3: Verify other pages work**

```bash
grep -c "portal-about" apps/blog-portal/public/about/index.html
grep -c "portal-contact" apps/blog-portal/public/contact/index.html
grep -c "portal-portfolio" apps/blog-portal/public/portfolio/index.html
# Expected: all > 0
```

- [ ] **Step 4: Test default mode switch**

```bash
cd apps/blog-portal && npm run home:default && rm -rf db.json public && npx hexo generate 2>&1 | tail -1
grep -c "recent-post-item" apps/blog-portal/public/index.html
# Expected: > 0 (Butterfly default index)
npm run home:custom
```

- [ ] **Step 5: Commit if any cleanup needed, or confirm all good**
