# Portal Maintainability and Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Hexo/Butterfly portal reproducible, understandable, faster, functionally complete, and visually cohesive without replacing its framework or personal identity.

**Architecture:** Repository snapshots make public content buildable without MySQL, while explicit import/export commands synchronize the admin database. Pure CommonJS renderer modules and validators sit outside Hexo's auto-loaded `scripts/` folder; small entry scripts wire them into Hexo. The existing Hono backend gains an injectable, tested contact module, and optional music dependencies load only after interaction.

**Tech Stack:** Hexo 7, Butterfly 5.5.4, Node.js built-in test runner, Hono, Zod, Prisma/MySQL, vanilla JavaScript, CSS.

## Global Constraints

- Keep `hexo-theme-butterfly`; do not replace the theme.
- Preserve mainland-China accessibility and do not add blocked dependencies.
- Do not add Firebase dependencies.
- Use DB-backed HttpOnly-cookie sessions for admin features.
- Browsers never connect directly to MySQL.
- Keep portal, backend, and Study Room independently deployable.
- Do not deploy to production as part of this plan.
- Every task must leave `npm run build` working.

---

### Task 1: Baseline portal validators

**Files:**
- Create: `apps/blog-portal/lib/portal/validate-output.js`
- Create: `apps/blog-portal/test/validate-output.test.js`
- Modify: `apps/blog-portal/package.json`

**Interfaces:**
- Produces: `validateGeneratedSite(publicDir): { htmlFiles: number, errors: string[] }`
- Produces: `npm test` and `npm run validate`

- [ ] **Step 1: Write failing validator tests**

```js
const test = require('node:test')
const assert = require('node:assert/strict')
const { mkdtemp, mkdir, writeFile } = require('node:fs/promises')
const { join } = require('node:path')
const { tmpdir } = require('node:os')
const { validateGeneratedSite } = require('../lib/portal/validate-output')

test('reports build placeholders and invalid html language', async () => {
  const root = await mkdtemp(join(tmpdir(), 'portal-output-'))
  await writeFile(join(root, 'index.html'), '<html lang="[&quot;en&quot;]"><link href="/css/site.css?v=BUILD_VER"></html>')
  const result = await validateGeneratedSite(root)
  assert.match(result.errors.join('\n'), /BUILD_VER/)
  assert.match(result.errors.join('\n'), /language/)
})

test('accepts valid internal links and assets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'portal-output-'))
  await mkdir(join(root, 'about'), { recursive: true })
  await mkdir(join(root, 'css'), { recursive: true })
  await writeFile(join(root, 'css/site.css'), '')
  await writeFile(join(root, 'about/index.html'), '<html lang="en"><head><title>About</title><link rel="canonical" href="https://je1ght.top/about/"></head></html>')
  await writeFile(join(root, 'index.html'), '<html lang="en"><head><title>Home</title><link rel="canonical" href="https://je1ght.top/"></head><body><a href="/about/">About</a><link href="/css/site.css"></body></html>')
  const result = await validateGeneratedSite(root)
  assert.deepEqual(result.errors, [])
})
```

- [ ] **Step 2: Run tests and verify module-not-found failure**

Run: `cd apps/blog-portal && node --test test/validate-output.test.js`

Expected: FAIL because `lib/portal/validate-output.js` does not exist.

- [ ] **Step 3: Implement recursive generated-output validation**

Implement a dependency-free validator that:

```js
async function validateGeneratedSite(publicDir) {
  // Recursively collect .html files.
  // Reject BUILD_VER, api.yourdomain.com, formspree.io, serialized lang arrays,
  // duplicate id attributes, missing titles/canonicals, and unresolved internal
  // href/src paths. Ignore hashes, query strings, /api/, /waline/, mailto:, and
  // external/protocol-relative URLs.
  return { htmlFiles, errors }
}
```

When executed directly, print the summary and set `process.exitCode = 1` when
errors exist.

- [ ] **Step 4: Add scripts and run the test cycle**

Add:

```json
"test": "node --test test/*.test.js",
"validate": "node lib/portal/validate-output.js public",
"check": "npm test && npm run build && npm run validate"
```

Run: `cd apps/blog-portal && npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/blog-portal/lib/portal/validate-output.js apps/blog-portal/test/validate-output.test.js apps/blog-portal/package.json
git commit -m "test: add portal output validator"
```

### Task 2: Deterministic configuration, language, versions, and favicons

**Files:**
- Create: `apps/blog-portal/lib/portal/theme-projection.js`
- Create: `apps/blog-portal/test/theme-projection.test.js`
- Modify: `apps/blog-portal/_config.yml`
- Modify: `apps/blog-portal/_config.butterfly.yml`
- Modify: `apps/blog-portal/scripts/portal-data-sync.js`
- Modify: `apps/backend-api/src/services/rebuild.js`
- Modify: `scripts/deploy.sh`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `projectThemeConfig({ themeConfig, profile, navigation, buildVersion, localeConfig })`
- Consumes: `PORTAL_BUILD_VERSION`

- [ ] **Step 1: Write failing projection tests**

Cover these exact behaviors:

```js
assert.equal(result.favicon, '/shared-assets/images/site-favicon.png')
assert.equal(result.nav.logo, '/shared-assets/images/icon.png')
assert.equal(result.menu.Home, '/ || fas fa-house')
assert.match(result.inject.head.join('\n'), /v=test-sha/)
assert.doesNotMatch(result.inject.head.join('\n'), /setInterval|nudgeTitle/)
assert.doesNotMatch(result.inject.bottom.join('\n'), /BUILD_VER/)
```

- [ ] **Step 2: Run tests and verify failure**

Run: `cd apps/blog-portal && node --test test/theme-projection.test.js`

Expected: FAIL because the pure projection module does not exist.

- [ ] **Step 3: Implement the pure projection**

Clone input objects before mutation. Project only these profile fields:

```js
const PROFILE_THEME_FIELDS = [
  'author',
  'subtitle',
  'favicon',
  'nav.logo',
  'avatar.img',
  'default_top_img',
  'index_img',
  'archive_img',
  'tag_img',
  'category_img',
  'footer.owner.since',
  'footer.custom_text',
  'social',
]
```

Deduplicate injected URLs by their stable path and inject the resolved build
version directly.

- [ ] **Step 4: Make the Hexo entry script side-effect free on disk**

Remove all `fs.copyFileSync`, favicon runtime-refresh script generation, history
monkey-patching, title nudging, and icon timers from `portal-data-sync.js`.
Delegate theme projection to the pure module.

- [ ] **Step 5: Correct locale ownership**

Change `_config.yml`:

```yaml
language: en
```

Keep `supportedLocales` only in `site-identity.json` and the injected locale
bootstrap JSON.

- [ ] **Step 6: Remove duplicated managed values from Butterfly config**

Keep explanatory comments and schema-safe fallbacks, but remove duplicate menu,
social, avatar, hero-image, favicon, and subtitle content values. Set injected
asset URLs through the projection module.

- [ ] **Step 7: Unify build-version entry points**

Update `scripts/deploy.sh` to call:

```bash
PORTAL_BUILD_VERSION="$(git -C "$REPO_ROOT" rev-parse --short HEAD)" npm run build
npm run validate
```

Update `rebuild.js` to pass:

```js
env: { ...process.env, PORTAL_BUILD_VERSION: buildVer }
```

Remove post-build `find ... sed`, generator renaming, and fallback divergence.

- [ ] **Step 8: Ignore runtime artifacts**

Add exact entries:

```gitignore
.superpowers/
/current-music-panel.png
/je1ght-top-with-player.png
/music-panel-open.png
/music-player-dark.png
/music-player-fixed.png
/music-player-light.png
/apps/blog-portal/source/logo.png
```

- [ ] **Step 9: Run checks and commit**

Run: `cd apps/blog-portal && npm run check`

Expected: PASS and no literal `BUILD_VER`.

```bash
git add .gitignore apps/blog-portal apps/backend-api/src/services/rebuild.js scripts/deploy.sh
git commit -m "refactor: make portal builds deterministic"
```

### Task 3: Explicit content ownership and reproducible snapshots

**Files:**
- Create: `apps/backend-api/src/services/content-snapshot.js`
- Create: `apps/backend-api/test/content-snapshot.test.js`
- Create: `apps/blog-portal/source/_data/portfolio.yml`
- Modify: `apps/backend-api/package.json`
- Modify: `apps/backend-api/src/services/rebuild.js`
- Modify: `apps/backend-api/scripts/import-local-profile.js`
- Modify: `scripts/deploy.sh`
- Modify: `docs/CONTENT_MAP.md`

**Interfaces:**
- Produces: `serializeSiteProfile(data): string`
- Produces: `serializePortfolio(items): string`
- Produces: explicit deploy modes `content:pull`, `content:push`, and normal deploy

- [ ] **Step 1: Write serializer tests**

Use values containing newlines, colons, hashes, quotes, empty arrays, nested
objects, and `null`. Parse the result with `js-yaml` and assert deep equality.
Assert exactly one `# managed-by-backend-api` header.

- [ ] **Step 2: Run tests and verify failure**

Run: `cd apps/backend-api && node --test test/content-snapshot.test.js`

Expected: FAIL because `content-snapshot.js` does not exist.

- [ ] **Step 3: Extract one serializer**

Move the handwritten YAML serializer from `rebuild.js` into the tested service.
Export site-profile and portfolio serializers. Reuse them in rebuild and import
scripts so local/server formats cannot drift.

Add `"test": "node --test test/*.test.js"` to the backend package scripts.

- [ ] **Step 4: Add an empty, valid portfolio snapshot**

```yaml
# managed-by-backend-api
section:
  title: Portfolio
  intro: ''
  home_preview_title: Selected Projects
  home_preview_intro: ''
  page_link_label: View Project
cards: []
```

- [ ] **Step 5: Remove bidirectional `_data` sync from normal deployment**

Normal deployment must not overwrite MySQL-derived snapshots in either
direction. Add explicit commands/functions for pulling a server snapshot or
importing a reviewed local snapshot. Keep posts/drafts behavior unchanged in
this task.

- [ ] **Step 6: Update the content map with the ownership table**

Delete stale `/blog/`, embedded Study Room, disabled-comments, and Formspree
statements. Document the exact admin → DB → exported snapshot → Hexo flow.

- [ ] **Step 7: Run tests/build and commit**

```bash
cd apps/backend-api && npm test
cd ../blog-portal && npm run check
git add apps/backend-api apps/blog-portal/source/_data/portfolio.yml scripts/deploy.sh docs/CONTENT_MAP.md
git commit -m "refactor: define explicit portal content ownership"
```

### Task 4: Split the renderer and suppress empty product surfaces

**Files:**
- Create: `apps/blog-portal/lib/portal/render/html.js`
- Create: `apps/blog-portal/lib/portal/render/data.js`
- Create: `apps/blog-portal/lib/portal/render/home.js`
- Create: `apps/blog-portal/lib/portal/render/about.js`
- Create: `apps/blog-portal/lib/portal/render/portfolio.js`
- Create: `apps/blog-portal/lib/portal/render/contact.js`
- Create: `apps/blog-portal/lib/portal/create-renderer.js`
- Create: `apps/blog-portal/test/renderer.test.js`
- Modify: `apps/blog-portal/scripts/portal-renderer.js`
- Modify: `apps/blog-portal/scripts/portal-data-sync.js`

**Interfaces:**
- Produces: `createPortalRenderer(hexo)` with `renderHome`, `renderAbout`, `renderPortfolio`, `renderContact`
- Produces: `hasPortfolioCards(portfolio): boolean`

- [ ] **Step 1: Write renderer contract tests**

Assert escaping, deterministic post ordering, absence of portfolio markup when
`cards: []`, absence of `/portfolio/` in projected menu/shortcuts when empty,
and presence when one real card exists.

- [ ] **Step 2: Run tests and verify failure**

Run: `cd apps/blog-portal && node --test test/renderer.test.js`

Expected: FAIL because the new modules do not exist.

- [ ] **Step 3: Move helpers without behavior changes**

Move HTML escaping, attribute rendering, date formatting, URL resolution,
collection normalization, and locale attributes first. Keep exact public class
names so CSS remains stable.

- [ ] **Step 4: Move page renderers one at a time**

Move home, portfolio, about, and contact renderers into focused modules. Keep
`scripts/portal-renderer.js` as:

```js
module.exports = require('../lib/portal/create-renderer')
```

- [ ] **Step 5: Add portfolio capability projection**

Derive `hasPortfolio` from snapshot cards. Filter `/portfolio/` from the
Butterfly menu and home shortcuts when false. Render no empty portfolio section.
The direct `/portfolio/` page may return a concise private/unavailable message,
but it must not appear in primary navigation.

- [ ] **Step 6: Run tests/build and commit**

```bash
cd apps/blog-portal && npm run check
git add apps/blog-portal/lib apps/blog-portal/scripts apps/blog-portal/test
git commit -m "refactor: split portal renderers by responsibility"
```

### Task 5: Backend-owned contact flow

**Files:**
- Create: `apps/backend-api/src/modules/contact/schema.js`
- Create: `apps/backend-api/src/modules/contact/routes.js`
- Create: `apps/backend-api/src/modules/contact/store.js`
- Create: `apps/backend-api/test/contact.test.js`
- Create: `apps/backend-api/prisma/migrations/20260728090000_add_contact_message/migration.sql`
- Create: `apps/blog-portal/source/js/portal-contact.js`
- Create: `apps/blog-portal/test/contact-renderer.test.js`
- Modify: `apps/backend-api/prisma/schema.prisma`
- Modify: `apps/backend-api/src/app.js`
- Modify: `apps/backend-api/package.json`
- Modify: `apps/blog-portal/lib/portal/render/contact.js`
- Modify: `apps/blog-portal/lib/portal/theme-projection.js`
- Modify: `apps/backend-api/public/admin/index.html`
- Modify: `apps/backend-api/public/admin/app.js`

**Interfaces:**
- Produces: `POST /contact/messages`
- Produces: `GET /contact/admin/messages` protected by `requireAuth()`
- Request: `{ name, email, topic, message, website? }`
- Response: `{ ok: true }` or `{ error, fields? }`

- [ ] **Step 1: Write route tests with an injected in-memory store**

Cover valid creation (`201`), invalid email/message (`400`), honeypot submission
(`201` without persistence), payload size limits, and sixth request from the
same IP inside ten minutes (`429`).

- [ ] **Step 2: Run tests and verify failure**

Run: `cd apps/backend-api && node --test test/contact.test.js`

Expected: FAIL because the contact module does not exist.

- [ ] **Step 3: Implement validation, rate limiting, and injected routes**

Use Zod limits:

```js
name: z.string().trim().min(1).max(80)
email: z.string().trim().email().max(254)
topic: z.string().trim().min(1).max(120)
message: z.string().trim().min(10).max(5000)
website: z.string().max(0).optional()
```

Use an in-memory IP bucket capped at five accepted attempts per ten minutes.
Trust only the first `CF-Connecting-IP` value when present, otherwise the
connection address supplied by the server adapter.

- [ ] **Step 4: Add Prisma persistence and migration**

Add:

```prisma
model ContactMessage {
  id        String   @id @default(cuid())
  name      String
  email     String
  topic     String
  message   String   @db.Text
  ipHash    String?
  createdAt DateTime @default(now())
  readAt    DateTime?
  @@index([createdAt])
}
```

Hash the IP with `SESSION_SECRET` before storage; never store the raw IP.

- [ ] **Step 5: Replace Formspree markup and add accessible client states**

Render `action="/api/contact/messages"` as progressive fallback, a hidden
`website` honeypot, required/max-length attributes, and an `aria-live="polite"`
status element. `portal-contact.js` submits JSON, disables the button, reports
success/field/network errors, and resets only after success.

- [ ] **Step 6: Remove Formspree from admin profile UI**

Remove the endpoint field and serialization. Existing profile data may retain
the unused key until the next profile save; no renderer may consume it.

- [ ] **Step 7: Run tests and Prisma validation**

```bash
cd apps/backend-api && npm test && npm run prisma:validate
cd ../blog-portal && npm run check
```

- [ ] **Step 8: Commit**

```bash
git add apps/backend-api apps/blog-portal
git commit -m "feat: add self-hosted portal contact flow"
```

### Task 6: Lazy, failure-tolerant music integration

**Files:**
- Create: `apps/blog-portal/test/music-config.test.js`
- Modify: `apps/blog-portal/_config.butterfly.yml`
- Modify: `apps/blog-portal/source/js/portal-music-player.js`
- Modify: `apps/blog-portal/source/css/portal-custom.css`

**Interfaces:**
- Produces: `window.PortalMusicPlayer.init()`
- Loads APlayer/Meting assets only after first music-button activation

- [ ] **Step 1: Write failing generated-config test**

Assert generated HTML contains the portal music bootstrap but does not contain
eager `APlayer.min.js`, `Meting.min.js`, or an already-instantiated APlayer node.

- [ ] **Step 2: Run and verify failure**

Run: `cd apps/blog-portal && npm run build && node --test test/music-config.test.js`

Expected: FAIL because Butterfly eagerly injects the dependencies.

- [ ] **Step 3: Disable Butterfly's eager APlayer injection**

Set `aplayerInject.enable: false` and remove the raw APlayer node and onload
fallback from `inject.bottom`.

- [ ] **Step 4: Implement interaction-time loading**

Create the button immediately. On first activation:

1. show a loading state;
2. inject local/gcore CSS and scripts exactly once;
3. create the configured player node;
4. initialize Meting;
5. show a retryable unavailable message on failure.

Subsequent opens reuse the player and never add duplicate scripts/listeners.

- [ ] **Step 5: Run tests/build and commit**

```bash
cd apps/blog-portal && npm run check
git add apps/blog-portal/_config.butterfly.yml apps/blog-portal/source/js/portal-music-player.js apps/blog-portal/source/css/portal-custom.css apps/blog-portal/test/music-config.test.js
git commit -m "perf: lazy-load the portal music player"
```

### Task 7: Editorial visual system and responsive page refresh

**Files:**
- Create: `apps/blog-portal/source/css/portal-tokens.css`
- Create: `apps/blog-portal/source/css/portal-hero.css`
- Create: `apps/blog-portal/source/css/portal-pages.css`
- Create: `apps/blog-portal/source/css/portal-controls.css`
- Create: `apps/blog-portal/test/visual-contract.test.js`
- Modify: `apps/blog-portal/source/css/portal-custom.css`
- Modify: `apps/blog-portal/lib/portal/render/home.js`
- Modify: `apps/blog-portal/lib/portal/render/about.js`
- Modify: `apps/blog-portal/source/js/portal-hero.js`
- Modify: `apps/blog-portal/lib/portal/theme-projection.js`

**Interfaces:**
- Produces semantic tokens for light/dark themes
- Preserves existing `portal-*` public classes where they remain useful

- [ ] **Step 1: Write visual-contract tests**

Assert the generated homepage contains one hero identity block, compact post
cards with semantic `<article>` elements, no empty headings/paragraphs, a visible
skip/focus path, and CSS containing `prefers-reduced-motion`.

- [ ] **Step 2: Run and verify failure**

Run: `cd apps/blog-portal && node --test test/visual-contract.test.js`

Expected: FAIL on the new visual contracts.

- [ ] **Step 3: Introduce semantic theme tokens**

Use:

```css
:root {
  --portal-bg: #f4f7fb;
  --portal-surface: rgba(255,255,255,.88);
  --portal-text: #172033;
  --portal-muted: #667085;
  --portal-accent: #2d9cdb;
  --portal-accent-2: #a678b4;
  --portal-border: rgba(23,32,51,.10);
  --portal-radius-sm: 12px;
  --portal-radius-md: 18px;
  --portal-radius-lg: 28px;
}
[data-theme='dark'] {
  --portal-bg: #0b1220;
  --portal-surface: rgba(17,27,45,.86);
  --portal-text: #e8eef8;
  --portal-muted: #9aa8bd;
  --portal-border: rgba(232,238,248,.10);
}
```

- [ ] **Step 4: Refresh hero and content density**

Set desktop hero to `78svh`, mobile to `64svh`, keep the artwork and gradient
transition, surface a concise identity/subtitle, and make the next section
visible at common laptop heights. Honor reduced motion for typing, bounce,
background rotation, and card transforms.

- [ ] **Step 5: Refresh recent posts and About**

Use a responsive two-column editorial post grid above 860px and one column
below. Clamp excerpts, strengthen metadata, and remove oversized empty panels.
Do not fabricate About experience descriptions; suppress empty descriptions and
placeholder intro copy.

- [ ] **Step 6: Split CSS imports**

Keep `portal-custom.css` as the stable entry file:

```css
@import url('./portal-tokens.css');
@import url('./portal-hero.css');
@import url('./portal-pages.css');
@import url('./portal-controls.css');
```

Remove superseded duplicate selectors after comparison.

- [ ] **Step 7: Run check and visual QA**

Run: `cd apps/blog-portal && npm run check`

Render/check desktop 1440×900, tablet 834×1112, and mobile 390×844 in both
themes. Check homepage, article, archives, categories, About, Contact, friends,
search, locale, keyboard focus, and reduced motion.

- [ ] **Step 8: Commit**

```bash
git add apps/blog-portal
git commit -m "style: refresh the portal editorial visual system"
```

### Task 8: Documentation, final verification, and GitHub handoff

**Files:**
- Modify: `apps/blog-portal/CONTENT_EDITING_GUIDE.md`
- Modify: `apps/blog-portal/BLOG_PORTAL_SETUP_NOTES.md`
- Modify: `docs/CONTENT_MAP.md`
- Modify: `docs/AI_PROJECT_MEMORY/CODEX_WORKLOG.md`
- Modify: `README.md`

**Interfaces:**
- Produces a reviewer-ready branch with reproducible commands and no unexplained generated files

- [ ] **Step 1: Rewrite stale documentation**

Document the source-of-truth table, local build, snapshot import/export,
portfolio-empty behavior, contact storage/admin access, music lazy loading, and
visual token files. Remove `/blog/`, embedded Study Room, Formspree, Giscus, and
manual menu-mirroring instructions that no longer apply.

- [ ] **Step 2: Append the engineering worklog**

Append one dated entry; never rewrite earlier worklog history.

- [ ] **Step 3: Run final verification**

```bash
cd apps/backend-api
npm test
npm run prisma:validate
cd ../blog-portal
npm run check
git diff --check origin/main...
git status --short
```

Expected: all tests and build checks PASS; only intentionally ignored local
screenshots/runtime artifacts remain outside Git.

- [ ] **Step 4: Commit documentation**

```bash
git add README.md apps/blog-portal/*.md docs
git commit -m "docs: document the simplified portal workflow"
```

- [ ] **Step 5: Push and open a draft pull request**

Push `agent/site-audit-refactor`, use the repository PR template if present, and
open a draft PR to `main` summarizing architecture, visual changes, migration
requirements, tests, and the fact that production deployment was intentionally
not performed.
