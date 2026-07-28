# Editorial Taxonomy Pages and Theme Footer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Archives, Categories, Tags, their detail pages, and the shared footer visually continuous with the approved editorial homepage in both light and dark themes.

**Architecture:** Add one Butterfly-only visual adapter stylesheet after the shared Portal component layer, leaving Hexo generators, authored data, and theme package files untouched. Keep reusable colors and typography in Portal tokens, while structural selectors for Butterfly’s `#archive`, `.type-categories`, `.type-tags`, header, taxonomy lists, and sidebar remain isolated in that adapter.

**Tech Stack:** Hexo 7, Butterfly 5.5, CSS custom properties, Node.js built-in test runner, existing Hexo output validator, production rsync/Docker/OpenResty deployment.

## Global Constraints

- Apply the design to `/archives/`, year/month archive pages, `/categories/`, every category detail page, `/tags/`, and every tag detail page.
- Use a 260px masthead above 768px and a 210px masthead at or below 768px.
- Keep the existing Admin-projected background image and fade its lower edge to `var(--portal-bg)`.
- Use `var(--portal-heading-font)` for display titles while dates, counts, metadata, and body copy remain in `var(--portal-body-font)`.
- Do not translate or rewrite authored taxonomy names.
- Do not modify `node_modules/hexo-theme-butterfly`, Admin snapshots, authored content, or add JavaScript solely for styling.
- Keep Butterfly DOM selectors out of the theme-independent locale core and renderers.
- Light and dark footer colors must come from Portal tokens, not fixed dark backgrounds.

---

## File Structure

- Create `apps/blog-portal/source/css/portal/butterfly-pages.css`
  - Owns only Butterfly-generated taxonomy/archive masthead, content surface, list typography, and sidebar selectors.
- Create `apps/blog-portal/test/butterfly-visual-adapter.test.js`
  - Guards stylesheet isolation, page-family coverage, injection order, masthead dimensions, and fade behavior.
- Modify `apps/blog-portal/source/css/portal/tokens.css`
  - Defines reusable light/dark footer background, text, muted text, and border tokens.
- Modify `apps/blog-portal/source/css/portal/base.css`
  - Consumes footer tokens without knowing Butterfly taxonomy markup.
- Modify `apps/blog-portal/test/visual-system.test.js`
  - Guards token-driven footer behavior and rejects fixed dark footer backgrounds.
- Modify `apps/blog-portal/_config.butterfly.yml`
  - Injects the Butterfly visual adapter after `components.css` and before `responsive.css`.
- Modify `docs/MAINTENANCE.md`
  - Documents the shared Portal layers versus the replaceable Butterfly visual adapter.

---

### Task 1: Isolate the Butterfly Taxonomy Visual Adapter

**Files:**
- Create: `apps/blog-portal/source/css/portal/butterfly-pages.css`
- Create: `apps/blog-portal/test/butterfly-visual-adapter.test.js`
- Modify: `apps/blog-portal/_config.butterfly.yml:1048-1062`

**Interfaces:**
- Consumes: shared CSS variables from `source/css/portal/tokens.css`.
- Produces: a replaceable Butterfly-only stylesheet loaded after `components.css` and before `responsive.css`.

- [ ] **Step 1: Write the failing adapter boundary and injection tests**

```js
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const adapterPath = path.join(
  root,
  'source/css/portal/butterfly-pages.css',
)

test('Butterfly taxonomy visuals are isolated and injected after shared components', () => {
  const css = fs.readFileSync(adapterPath, 'utf8')
  const config = fs.readFileSync(
    path.join(root, '_config.butterfly.yml'),
    'utf8',
  )

  assert.match(css, /#body-wrap:has\\(#archive\\)/)
  assert.match(css, /\\.type-categories/)
  assert.match(css, /\\.type-tags/)
  assert.match(css, /height:\\s*260px/)
  assert.match(css, /max-width:\\s*768px[\\s\\S]*height:\\s*210px/)
  assert.match(css, /linear-gradient\\([^)]*var\\(--portal-bg\\)/)

  const componentsIndex = config.indexOf('/css/portal/components.css')
  const adapterIndex = config.indexOf('/css/portal/butterfly-pages.css')
  const responsiveIndex = config.indexOf('/css/portal/responsive.css')
  assert.ok(componentsIndex >= 0)
  assert.ok(adapterIndex > componentsIndex)
  assert.ok(responsiveIndex > adapterIndex)
})

test('theme-independent layers do not contain Butterfly taxonomy selectors', () => {
  const shared = [
    'tokens.css',
    'base.css',
    'hero.css',
    'components.css',
    'responsive.css',
  ]
    .map((file) =>
      fs.readFileSync(path.join(root, 'source/css/portal', file), 'utf8'),
    )
    .join('\\n')

  assert.doesNotMatch(shared, /#body-wrap:has\\(#archive\\)|\\.type-categories|\\.type-tags/)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd apps/blog-portal
node --test test/butterfly-visual-adapter.test.js
```

Expected: FAIL because `source/css/portal/butterfly-pages.css` does not exist.

- [ ] **Step 3: Implement the masthead, content surface, and editorial typography adapter**

Create `source/css/portal/butterfly-pages.css` with scoped selectors:

```css
:where(
  #body-wrap:has(#archive),
  #body-wrap.type-categories,
  #body-wrap.type-tags
) #page-header {
  position: relative;
  height: 260px;
  background-position: center 33%;
}

:where(
  #body-wrap:has(#archive),
  #body-wrap.type-categories,
  #body-wrap.type-tags
) #page-header::after {
  position: absolute;
  z-index: 1;
  height: 5.5rem;
  background: linear-gradient(to bottom, transparent, var(--portal-bg));
  content: '';
  inset: auto 0 0;
  pointer-events: none;
}

:where(
  #body-wrap:has(#archive),
  #body-wrap.type-categories,
  #body-wrap.type-tags
) #page-header #page-site-info {
  z-index: 2;
}

:where(
  #body-wrap:has(#archive),
  #body-wrap.type-categories,
  #body-wrap.type-tags
) #site-title {
  color: #fff;
  font-family: var(--portal-heading-font);
  font-size: clamp(2.4rem, 6vw, 4.1rem);
  font-weight: 500;
  letter-spacing: -.035em;
}

:where(
  #body-wrap:has(#archive) #archive,
  #body-wrap.type-categories #page,
  #body-wrap.type-tags #page
) {
  border: 1px solid var(--portal-border);
  border-radius: var(--portal-radius-lg);
  background: var(--portal-surface);
  box-shadow: var(--portal-shadow);
}

:where(
  #body-wrap:has(#archive),
  #body-wrap.type-categories,
  #body-wrap.type-tags
) :where(
  .article-sort-title,
  .article-sort-item.year,
  .article-sort-item-title,
  .category-list-link,
  .tag-cloud-list a
) {
  font-family: var(--portal-heading-font);
}

:where(
  #body-wrap:has(#archive),
  #body-wrap.type-categories,
  #body-wrap.type-tags
) :where(.card-widget, #archive, #page) {
  border-color: var(--portal-border);
  background-color: var(--portal-surface);
  color: var(--portal-text);
}

@media (max-width: 768px) {
  :where(
    #body-wrap:has(#archive),
    #body-wrap.type-categories,
    #body-wrap.type-tags
  ) #page-header {
    height: 210px;
  }
}
```

The implementation may refine list selectors after inspecting generated HTML,
but must keep every Butterfly selector in this file.

- [ ] **Step 4: Inject the adapter in the declared layer order**

Update `_config.butterfly.yml`:

```yaml
    - <link rel="stylesheet" href="/css/portal/components.css?v=BUILD_VER">
    # Butterfly 页面结构视觉适配器，可在更换主题时整体替换
    - <link rel="stylesheet" href="/css/portal/butterfly-pages.css?v=BUILD_VER">
    - <link rel="stylesheet" href="/css/portal/responsive.css?v=BUILD_VER">
```

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
cd apps/blog-portal
node --test test/butterfly-visual-adapter.test.js
```

Expected: 2 tests pass.

- [ ] **Step 6: Commit the adapter**

```bash
git add apps/blog-portal/source/css/portal/butterfly-pages.css \
  apps/blog-portal/test/butterfly-visual-adapter.test.js \
  apps/blog-portal/_config.butterfly.yml
git commit -m "style: unify editorial taxonomy pages"
```

---

### Task 2: Make the Footer Token-Driven in Both Themes

**Files:**
- Modify: `apps/blog-portal/source/css/portal/tokens.css:1-50`
- Modify: `apps/blog-portal/source/css/portal/base.css:61-69`
- Modify: `apps/blog-portal/test/visual-system.test.js`

**Interfaces:**
- Consumes: root and `[data-theme='dark']` Portal theme scopes.
- Produces: `--portal-footer-bg`, `--portal-footer-text`, `--portal-footer-muted`, and `--portal-footer-border`.

- [ ] **Step 1: Write the failing footer token test**

Append to `test/visual-system.test.js`:

```js
test('footer follows Portal light and dark theme tokens', () => {
  const tokens = fs.readFileSync(path.join(cssRoot, 'tokens.css'), 'utf8')
  const base = fs.readFileSync(path.join(cssRoot, 'base.css'), 'utf8')

  assert.match(tokens, /:root[\\s\\S]*--portal-footer-bg/)
  assert.match(tokens, /\\[data-theme='dark'\\][\\s\\S]*--portal-footer-bg/)
  assert.match(base, /#footer[\\s\\S]*background:\\s*var\\(--portal-footer-bg\\)/)
  assert.match(base, /#footer[\\s\\S]*color:\\s*var\\(--portal-footer-text\\)/)
  assert.match(base, /border-top:\\s*1px solid var\\(--portal-footer-border\\)/)
  assert.doesNotMatch(base, /#footer\\s*\\{[^}]*background:\\s*#[0-9a-f]{3,8}/i)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd apps/blog-portal
node --test test/visual-system.test.js
```

Expected: FAIL because footer tokens do not exist and `base.css` uses `#162833`.

- [ ] **Step 3: Add exact light and dark footer tokens**

Add to `:root` in `tokens.css`:

```css
  --portal-footer-bg: #eeeae2;
  --portal-footer-text: #34434c;
  --portal-footer-muted: #69757c;
  --portal-footer-border: rgb(23 36 45 / 10%);
```

Add to `[data-theme='dark']`:

```css
  --portal-footer-bg: #081019;
  --portal-footer-text: #d8e2e8;
  --portal-footer-muted: #98a8b2;
  --portal-footer-border: rgb(214 230 238 / 10%);
```

- [ ] **Step 4: Consume footer tokens without theme-specific selectors**

Replace the fixed footer blocks in `base.css` with:

```css
#footer {
  border-top: 1px solid var(--portal-footer-border);
  background: var(--portal-footer-bg);
  color: var(--portal-footer-text);
}

#footer :where(a, .footer_custom_text, #site-running-time) {
  color: inherit;
}

#footer :where(.framework-info, .footer-other, .copyright) {
  color: var(--portal-footer-muted);
}
```

- [ ] **Step 5: Run the focused and full Portal tests**

Run:

```bash
cd apps/blog-portal
node --test test/visual-system.test.js
npm test
```

Expected: focused test and all Portal tests pass.

- [ ] **Step 6: Commit the footer**

```bash
git add apps/blog-portal/source/css/portal/tokens.css \
  apps/blog-portal/source/css/portal/base.css \
  apps/blog-portal/test/visual-system.test.js
git commit -m "style: make footer follow portal themes"
```

---

### Task 3: Validate Generated Page Coverage and Document the Boundary

**Files:**
- Modify: `apps/blog-portal/test/butterfly-visual-adapter.test.js`
- Modify: `docs/MAINTENANCE.md`

**Interfaces:**
- Consumes: generated `public` HTML from Hexo and the adapter stylesheet from Task 1.
- Produces: regression evidence that every scoped page family has the expected Butterfly structural hook and documented replacement boundary.

- [ ] **Step 1: Add a failing generated-page coverage test**

Add a test that runs after a build and checks representative files:

```js
test('generated taxonomy families expose adapter hooks', () => {
  const pages = [
    ['public/archives/index.html', 'id="archive"'],
    ['public/archives/2026/index.html', 'id="archive"'],
    ['public/categories/index.html', 'type-categories'],
    ['public/categories/AI/index.html', 'id="archive"'],
    ['public/tags/index.html', 'type-tags'],
    ['public/tags/AI/index.html', 'id="archive"'],
  ]

  for (const [file, hook] of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8')
    assert.match(html, new RegExp(hook))
    assert.match(html, /\\/css\\/portal\\/butterfly-pages\\.css\\?v=/)
  }
})
```

- [ ] **Step 2: Run against the pre-adapter generated output and verify RED**

Run:

```bash
cd apps/blog-portal
node --test test/butterfly-visual-adapter.test.js
```

Expected: FAIL because the existing generated pages do not reference
`butterfly-pages.css`.

- [ ] **Step 3: Build with the current commit version**

Run:

```bash
cd apps/blog-portal
PORTAL_BUILD_VERSION="$(git -C ../.. rev-parse --short HEAD)" npm run build
```

Expected: Hexo generates the adapter stylesheet and all representative pages.

- [ ] **Step 4: Verify generated coverage and output validity**

Run:

```bash
cd apps/blog-portal
node --test test/butterfly-visual-adapter.test.js
npm run validate
```

Expected: adapter tests pass and 55 HTML files validate.

- [ ] **Step 5: Document the replaceable visual adapter**

Add to `docs/MAINTENANCE.md`:

```markdown
### Butterfly visual adapter

Shared Portal tokens, authored content, and UI locale catalogs are
theme-independent. Butterfly-generated taxonomy/archive markup is styled only
by `source/css/portal/butterfly-pages.css`. When replacing Butterfly, remove
that injected stylesheet and provide an equivalent adapter for the new theme;
do not move its selectors into shared Portal layers.
```

- [ ] **Step 6: Run documentation and whitespace checks**

Run:

```bash
rg -n "butterfly-pages.css|theme-independent" docs/MAINTENANCE.md
git diff --check
```

Expected: the boundary is documented and no whitespace errors are reported.

- [ ] **Step 7: Commit coverage and documentation**

```bash
git add apps/blog-portal/test/butterfly-visual-adapter.test.js \
  docs/MAINTENANCE.md
git commit -m "docs: explain Butterfly visual adapter boundary"
```

---

### Task 4: Full Verification, Visual QA, Production Deployment, and GitHub Sync

**Files:**
- Verify only; modify implementation files only if a failing test or visual QA
  reproduces a scoped requirement failure through a new RED/GREEN cycle.

**Interfaces:**
- Consumes: Tasks 1–3 and the existing `scripts/deploy.sh` production flow.
- Produces: verified production asset version and updated remote draft PR.

- [ ] **Step 1: Run the complete local verification suite**

Run:

```bash
cd apps/blog-portal
PORTAL_BUILD_VERSION="$(git -C ../.. rev-parse --short HEAD)" npm run check
cd ../backend-api
npm test
DATABASE_URL='mysql://schema_check:schema_check@127.0.0.1:3306/schema_check' \
  node_modules/.bin/prisma validate --schema prisma/schema.prisma
cd ../..
bash -n scripts/deploy.sh
bash -n scripts/content-snapshot.sh
bash -n scripts/sync-admin.sh
git diff --check
test -z "$(git status --short)"
```

Expected: Portal, backend, schema, shell, whitespace, and worktree checks pass.

- [ ] **Step 2: Perform local visual QA at desktop and mobile widths**

Check these representative routes:

```text
/archives/
/archives/2026/
/categories/
/categories/AI/
/tags/
/tags/AI/
```

For each representative family, verify:

- 260px desktop and 210px mobile masthead
- serif white title over the existing image
- bottom fade reaches the current `--portal-bg`
- list and sidebar surfaces use Portal tokens
- no taxonomy label or post title is rewritten
- light footer is warm neutral and dark footer is deep blue-black

- [ ] **Step 3: Compare Admin-owned production snapshots before deployment**

Run:

```bash
for snapshot in site_profile.yml portfolio.yml; do
  rsync -aczni \
    "je1ght-server:/home/je1ght/code/websites/je1ght-platform/portal-source/source/_data/$snapshot" \
    "apps/blog-portal/source/_data/"
done
```

Expected: no output. If output appears, pull, review, and commit the snapshot
before deploying.

- [ ] **Step 4: Deploy through the tested production workflow**

Run:

```bash
bash scripts/deploy.sh
```

Expected: build, sync, backend health retry, OpenResty validation, and reload
all succeed.

- [ ] **Step 5: Verify production routes and the cache-bust version**

Run public HTTP checks for all six representative routes, `/api/health`, the
new stylesheet, and the footer/theme markers. Confirm every route returns 200
and the HTML references the current short Git SHA.

- [ ] **Step 6: Push the branch and update the existing draft PR**

Run:

```bash
git -c http.version=HTTP/1.1 push -u origin agent/site-audit-implementation
```

Update PR #1 with the taxonomy page, masthead transition, theme footer,
verification, and production version results. Do not merge `main` without
explicit authorization.

