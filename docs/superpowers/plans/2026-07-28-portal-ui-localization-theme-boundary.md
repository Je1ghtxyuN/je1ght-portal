# Portal UI Localization and Theme Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the selected centered homepage design, complete public-interface translation, keep authored content untouched, adapt light/dark and music UI, and isolate Butterfly-specific integration behind one replaceable adapter.

**Architecture:** Pure CommonJS renderer helpers mark interface text with `data-ui-*` attributes while leaving authored data unmarked. A theme-independent browser locale core loads dedicated portal UI bundles and publishes locale changes; one Butterfly adapter owns theme selectors, placement, and PJAX integration, with a generic toolbar fallback. Shared semantic CSS tokens make public components work without Butterfly variables.

**Tech Stack:** Hexo 7.3, Butterfly 5.5.4, CommonJS renderer modules, framework-free browser JavaScript, JSON locale bundles, CSS custom properties, Node test runner, Hono/Prisma backend, 1Panel OpenResty production edge.

## Global Constraints

- Use visual direction A: centered identity, true circular avatar, restrained immersive hero.
- Keep editorial serif typography only for the site name and semantic page headings.
- Do not add owner-authored copy or decorative phrases.
- Remove `PERSONAL NOTES / SELECTED WORK`, `Directory`, `Journal`, `Profile`, `Say hello`, and `Work`.
- UI translation may change controls, labels, form text, search, empty states, and music wrapper states.
- Runtime translation must not change posts, profile text, project descriptions, experience, skills, categories, tags, or the homepage subtitle.
- Keep the selected locale preference in `site-locale`.
- Keep Formspree as the Contact form destination.
- Keep APlayer/Meting lazy-loaded after user interaction.
- Core renderer, locale, visual, and music modules must not require Butterfly selectors.
- All Butterfly selectors must live in the explicit adapter.
- Preserve reduced-motion behavior, accessibility labels, keyboard focus, and PJAX operation.
- Every implementation task follows red-green-refactor and ends with a focused commit.

---

## File Structure

- `apps/blog-portal/lib/portal/render/ui.js`: render semantic UI text and attributes.
- `apps/blog-portal/lib/portal/ui-catalog.js`: flatten and compare portal locale leaf keys.
- `apps/blog-portal/lib/portal/adapters/butterfly-theme-projection.js`: Butterfly build-time configuration adapter.
- `apps/blog-portal/lib/portal/theme-projection.js`: compatibility re-export only.
- `apps/blog-portal/source/js/portal-locale-core.js`: theme-independent runtime locale API.
- `apps/blog-portal/source/js/adapters/butterfly-adapter.js`: Butterfly DOM/PJAX/control adapter with generic toolbar fallback.
- `apps/blog-portal/source/js/portal-music-player.js`: translated, theme-independent music panel controller.
- `packages/shared-assets/locales/portal-ui/*.json`: portal-only UI catalogs.
- `apps/blog-portal/source/css/portal/*.css`: semantic visual system with no generated words.
- `apps/blog-portal/test/*.test.js`: locale, renderer, adapter-boundary, visual, music, and build contracts.

---

### Task 1: Dedicated Portal UI Catalog Contract

**Files:**
- Create: `apps/blog-portal/lib/portal/ui-catalog.js`
- Create: `apps/blog-portal/test/locale-catalog.test.js`
- Create: `packages/shared-assets/locales/portal-ui/en.json`
- Create: `packages/shared-assets/locales/portal-ui/zh-CN.json`
- Create: `packages/shared-assets/locales/portal-ui/zh-TW.json`
- Create: `packages/shared-assets/locales/portal-ui/ja.json`
- Modify: `packages/shared-config/site-identity.json`

**Interfaces:**
- Consumes: JSON objects whose leaves are translated interface strings.
- Produces: `flattenLocale(value, prefix = '')`, `compareLocaleCatalogs(catalogs)`, and `i18n.portalLocaleBasePath: "/shared-assets/locales/portal-ui"`.

- [ ] **Step 1: Write the failing locale parity and namespace tests**

```js
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const { compareLocaleCatalogs, flattenLocale } = require('../lib/portal/ui-catalog')

const localeRoot = path.resolve(
  __dirname,
  '../../../packages/shared-assets/locales/portal-ui',
)
const codes = ['en', 'zh-CN', 'zh-TW', 'ja']

test('portal UI locales have identical nonempty leaf keys', () => {
  const catalogs = Object.fromEntries(
    codes.map((code) => [
      code,
      JSON.parse(fs.readFileSync(path.join(localeRoot, `${code}.json`), 'utf8')),
    ]),
  )
  assert.deepEqual(compareLocaleCatalogs(catalogs), [])
  for (const catalog of Object.values(catalogs)) {
    for (const value of Object.values(flattenLocale(catalog))) {
      assert.equal(typeof value, 'string')
      assert.ok(value.trim())
    }
  }
})

test('portal UI catalogs exclude authored-content namespaces', () => {
  const english = JSON.parse(
    fs.readFileSync(path.join(localeRoot, 'en.json'), 'utf8'),
  )
  assert.equal(english.posts, undefined)
  assert.equal(english.profile, undefined)
  assert.equal(english.projects, undefined)
  assert.equal(english.experience, undefined)
})
```

- [ ] **Step 2: Run the focused test and confirm it fails because the module/catalog directory does not exist**

Run:

```bash
cd apps/blog-portal
node --test test/locale-catalog.test.js
```

Expected: failure resolving `../lib/portal/ui-catalog` or the new catalog path.

- [ ] **Step 3: Implement catalog flattening and comparison**

```js
function flattenLocale(value, prefix = '', output = {}) {
  for (const [key, child] of Object.entries(value || {})) {
    const path = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenLocale(child, path, output)
    } else {
      output[path] = child
    }
  }
  return output
}

function compareLocaleCatalogs(catalogs) {
  const entries = Object.entries(catalogs)
  if (!entries.length) return ['no locale catalogs']
  const [referenceCode, referenceCatalog] = entries[0]
  const reference = Object.keys(flattenLocale(referenceCatalog)).sort()
  const errors = []
  for (const [code, catalog] of entries.slice(1)) {
    const keys = Object.keys(flattenLocale(catalog)).sort()
    const missing = reference.filter((key) => !keys.includes(key))
    const extra = keys.filter((key) => !reference.includes(key))
    if (missing.length) errors.push(`${code} missing: ${missing.join(', ')}`)
    if (extra.length) errors.push(`${code} extra: ${extra.join(', ')}`)
  }
  for (const [code, catalog] of entries) {
    for (const [key, value] of Object.entries(flattenLocale(catalog))) {
      if (typeof value !== 'string' || !value.trim()) {
        errors.push(`${code} empty: ${key}`)
      }
    }
  }
  return errors
}

module.exports = { compareLocaleCatalogs, flattenLocale }
```

- [ ] **Step 4: Create the four exact portal-only catalogs**

Each catalog contains the same structure:

```json
{
  "controls": {
    "theme": "Toggle color theme",
    "language": "Choose interface language",
    "settings": "Settings",
    "backToTop": "Back to top"
  },
  "nav": {
    "home": "Home",
    "archives": "Archives",
    "categories": "Categories",
    "contact": "Contact",
    "friends": "Friends",
    "about": "About",
    "search": "Search"
  },
  "home": {
    "scroll": "Read the latest",
    "shortcutsTitle": "Explore",
    "recentPostsTitle": "Recent posts",
    "portfolioPreviewTitle": "Selected projects",
    "emptyPosts": "No posts yet"
  },
  "about": {
    "title": "About me",
    "skillsTitle": "Skills",
    "experienceTitle": "Experience",
    "emptySkills": "No skills configured",
    "emptyExperience": "No experience configured"
  },
  "portfolio": {
    "title": "Portfolio",
    "empty": "No portfolio items configured",
    "demo": "Demo",
    "repository": "Repository",
    "article": "Article"
  },
  "contact": {
    "title": "Contact",
    "email": "Email",
    "location": "Location",
    "name": "Name",
    "topic": "Topic",
    "message": "Message",
    "namePlaceholder": "Your name",
    "emailPlaceholder": "you@example.com",
    "topicPlaceholder": "What would you like to discuss?",
    "messagePlaceholder": "Write your message",
    "submit": "Send message",
    "unavailableTitle": "Contact form unavailable",
    "unavailableWithEmail": "Please use the email address shown above",
    "unavailable": "Please check back later"
  },
  "sidebar": {
    "recentPosts": "Recent posts",
    "contents": "Contents",
    "announcement": "Announcement",
    "postSeries": "Post series",
    "tags": "Tags",
    "categories": "Categories",
    "archives": "Archives",
    "websiteInfo": "Website information",
    "aboutThisSite": "About this site",
    "articles": "Articles"
  },
  "search": {
    "placeholder": "Search"
  },
  "music": {
    "open": "Open music player",
    "close": "Close music player",
    "title": "Music",
    "initial": "Music loads when you open the player",
    "loading": "Loading music",
    "unavailable": "Music service is temporarily unavailable"
  }
}
```

Use the existing reviewed translations in `site-ui/{code}.json` when a matching
translation exists. Translate the new `controls`, `home.scroll`, and `music`
keys into Simplified Chinese, Traditional Chinese, and Japanese with natural UI
wording; do not copy machine-like owner prose into these files.

- [ ] **Step 5: Point shared portal locale configuration at the new catalog**

Add inside the existing `i18n` object:

```json
"portalLocaleBasePath": "/shared-assets/locales/portal-ui"
```

Keep `storageKey` equal to `site-locale` and keep the four existing supported
locale codes.

- [ ] **Step 6: Run the focused test and full portal tests**

Run:

```bash
cd apps/blog-portal
node --test test/locale-catalog.test.js
npm test
```

Expected: catalog tests and the existing portal tests pass.

- [ ] **Step 7: Commit the catalog contract**

```bash
git add apps/blog-portal/lib/portal/ui-catalog.js \
  apps/blog-portal/test/locale-catalog.test.js \
  packages/shared-assets/locales/portal-ui \
  packages/shared-config/site-identity.json
git commit -m "feat: separate portal interface locale catalogs"
```

---

### Task 2: Semantic Renderer Translation and Authored-Content Isolation

**Files:**
- Create: `apps/blog-portal/lib/portal/render/ui.js`
- Create: `apps/blog-portal/test/renderer-localization.test.js`
- Modify: `apps/blog-portal/lib/portal/render/home.js`
- Modify: `apps/blog-portal/lib/portal/render/about.js`
- Modify: `apps/blog-portal/lib/portal/render/contact.js`
- Modify: `apps/blog-portal/lib/portal/render/portfolio.js`
- Modify: `apps/blog-portal/lib/portal/render/components.js`

**Interfaces:**
- Consumes: a UI key, English no-JavaScript fallback, optional tag/attributes.
- Produces: `uiText(key, fallback, options)`, `uiAttrs(key, kind)`, and semantic HTML whose authored content is never marked.

- [ ] **Step 1: Write failing renderer localization tests**

```js
const assert = require('node:assert/strict')
const test = require('node:test')
const createPortalRenderer = require('../lib/portal/create-renderer')

function createHexo(data = {}) {
  return {
    config: { author: 'Je1ght', root: '/', title: 'Portal' },
    locals: {
      get(name) {
        if (name === 'data') return data
        if (name === 'posts') return []
        return null
      },
    },
  }
}

test('interface labels have UI keys and authored profile text does not', () => {
  const renderer = createPortalRenderer(createHexo({
    site_profile: {
      intro: { long: 'OWNER AUTHORED INTRODUCTION' },
      about: { skills: ['OWNER AUTHORED SKILL'] },
    },
  }))
  const html = renderer.renderAbout()
  assert.match(html, /data-ui-key="about\.title"/)
  assert.match(html, /data-ui-key="about\.skillsTitle"/)
  assert.doesNotMatch(
    html,
    /data-ui-[^>]*>[^<]*OWNER AUTHORED (INTRODUCTION|SKILL)/,
  )
})

test('contact form labels and placeholders are semantic UI text', () => {
  const renderer = createPortalRenderer(createHexo({
    site_profile: {
      contact: {
        email: 'owner@example.com',
        formspree_endpoint: 'https://formspree.io/f/example',
      },
    },
  }))
  const html = renderer.renderContact()
  assert.match(html, /data-ui-key="contact\.name"/)
  assert.match(html, /data-ui-placeholder="contact\.namePlaceholder"/)
  assert.match(html, /action="https:\/\/formspree\.io\/f\/example"/)
})

test('renderer does not emit decorative owner copy', () => {
  const renderer = createPortalRenderer(createHexo())
  const html = [
    renderer.renderHome(),
    renderer.renderAbout(),
    renderer.renderContact(),
    renderer.renderPortfolio(),
  ].join('\n')
  assert.doesNotMatch(
    html,
    /Directory|Journal|Profile|Say hello|Selected work/,
  )
})
```

- [ ] **Step 2: Run the focused tests and confirm missing attributes/extra copy fail**

Run:

```bash
cd apps/blog-portal
node --test test/renderer-localization.test.js
```

Expected: failures for missing `data-ui-*` attributes and present decorative labels.

- [ ] **Step 3: Add one renderer UI helper**

```js
const { escapeHtml, tag } = require('./html')

function uiAttrs(key, kind = 'text') {
  const attribute = {
    text: 'data-ui-key',
    placeholder: 'data-ui-placeholder',
    value: 'data-ui-value',
    aria: 'data-ui-aria-label',
  }[kind]
  if (!attribute) throw new Error(`Unsupported UI attribute kind: ${kind}`)
  return { [attribute]: key }
}

function uiText(key, fallback, { name = 'span', attrs = {} } = {}) {
  return tag(name, { ...attrs, ...uiAttrs(key) }, escapeHtml(fallback))
}

module.exports = { uiAttrs, uiText }
```

- [ ] **Step 4: Replace hardcoded renderer labels with UI keys**

Apply these exact key mappings:

```text
Explore -> home.shortcutsTitle
Recent posts -> home.recentPostsTitle
Selected projects -> home.portfolioPreviewTitle
No posts yet -> home.emptyPosts
About me -> about.title
Skills -> about.skillsTitle
Experience -> about.experienceTitle
Portfolio -> portfolio.title
Demo -> portfolio.demo
Repository -> portfolio.repository
Article -> portfolio.article
Contact -> contact.title
Email -> contact.email
Location -> contact.location
Name -> contact.name
Topic -> contact.topic
Message -> contact.message
Send message -> contact.submit
Contact form unavailable -> contact.unavailableTitle
```

Remove all decorative eyebrow nodes. Keep profile, portfolio, navigation item,
post, skill, and experience values as escaped plain content without
`data-ui-*`.

- [ ] **Step 5: Run renderer and Formspree regression tests**

Run:

```bash
cd apps/blog-portal
node --test test/renderer-localization.test.js test/renderer.test.js
```

Expected: all renderer tests pass and Formspree remains the form action.

- [ ] **Step 6: Commit semantic renderer output**

```bash
git add apps/blog-portal/lib/portal/render \
  apps/blog-portal/test/renderer-localization.test.js
git commit -m "fix: separate portal UI labels from authored content"
```

---

### Task 3: Theme-Independent Locale Core and Butterfly Adapter

**Files:**
- Create: `apps/blog-portal/source/js/portal-locale-core.js`
- Create: `apps/blog-portal/source/js/adapters/butterfly-adapter.js`
- Create: `apps/blog-portal/test/theme-boundary.test.js`
- Modify: `apps/blog-portal/lib/portal/theme-projection.js`
- Delete: `apps/blog-portal/source/js/portal-i18n.js`

**Interfaces:**
- Consumes: injected locale config, semantic `data-ui-*` nodes, optional theme DOM.
- Produces: `window.PortalLocale`, `portal:locale-change`, `window.PortalButterflyAdapter.mount()`, and a generic `[data-portal-toolbar]` fallback.

- [ ] **Step 1: Write failing source-boundary tests**

```js
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const sourceRoot = path.resolve(__dirname, '../source/js')

test('locale core has no Butterfly selectors and exposes the locale API', () => {
  const source = fs.readFileSync(
    path.join(sourceRoot, 'portal-locale-core.js'),
    'utf8',
  )
  assert.doesNotMatch(
    source,
    /rightside-config|sidebar-menus|card-widget|search-dialog|#nav/,
  )
  assert.match(source, /window\.PortalLocale/)
  assert.match(source, /portal:locale-change/)
})

test('Butterfly selectors are isolated and a generic toolbar fallback exists', () => {
  const adapter = fs.readFileSync(
    path.join(sourceRoot, 'adapters/butterfly-adapter.js'),
    'utf8',
  )
  assert.match(adapter, /rightside-config/)
  assert.match(adapter, /data-portal-toolbar/)
  assert.match(adapter, /pjax:complete/)
})
```

- [ ] **Step 2: Run the boundary test and confirm the new files are missing**

Run:

```bash
cd apps/blog-portal
node --test test/theme-boundary.test.js
```

Expected: file-not-found failure.

- [ ] **Step 3: Extract the runtime locale core**

Implement:

```js
window.PortalLocale = Object.freeze({
  apply,
  getLocale: function () { return activeLocale },
  t,
  subscribe: function (listener) {
    listeners.add(listener)
    return function unsubscribe() { listeners.delete(listener) }
  },
})
```

`apply(locale)` loads default and selected bundles, writes `site-locale`, sets
`document.documentElement.lang`, translates only:

```text
[data-ui-key]
[data-ui-placeholder]
[data-ui-value]
[data-ui-aria-label]
```

After applying, dispatch:

```js
document.dispatchEvent(new CustomEvent('portal:locale-change', {
  detail: { locale: activeLocale },
}))
```

Do not include navigation, sidebar, search, theme-control, or Butterfly
selectors.

- [ ] **Step 4: Implement the Butterfly adapter and fallback toolbar**

The adapter:

```js
function resolveToolbar() {
  return document.getElementById('rightside-config-show')
    || document.getElementById('rightside-config-hide')
    || createGenericToolbar()
}

function createGenericToolbar() {
  let toolbar = document.querySelector('[data-portal-toolbar]')
  if (toolbar) return toolbar
  toolbar = document.createElement('div')
  toolbar.dataset.portalToolbar = 'true'
  toolbar.className = 'portal-generic-toolbar'
  document.body.appendChild(toolbar)
  return toolbar
}

window.PortalButterflyAdapter = Object.freeze({
  mount,
  resolveToolbar,
})
```

It creates the locale button/dropdown, translates Butterfly nav/sidebar/search
through an explicit path-to-key map, subscribes to `PortalLocale`, and reruns
`mount()` after `pjax:complete`.

- [ ] **Step 5: Update injection order and remove the old mixed script**

Inject scripts in this exact order:

```html
<script src="/js/portal-locale-core.js?v=VERSION" defer></script>
<script src="/js/adapters/butterfly-adapter.js?v=VERSION" defer></script>
<script src="/js/portal-music-player.js?v=VERSION" defer></script>
```

Delete the old `portal-i18n.js` injection and source file.

- [ ] **Step 6: Run boundary, projection, and build tests**

Run:

```bash
cd apps/blog-portal
node --test test/theme-boundary.test.js test/theme-projection.test.js
npm run build
```

Expected: tests pass and generated HTML injects scripts in dependency order.

- [ ] **Step 7: Commit the runtime boundary**

```bash
git add apps/blog-portal/source/js \
  apps/blog-portal/lib/portal/theme-projection.js \
  apps/blog-portal/test/theme-boundary.test.js \
  apps/blog-portal/test/theme-projection.test.js
git commit -m "refactor: isolate portal locale core from Butterfly"
```

---

### Task 4: Selected Hero and Unified Visual System

**Files:**
- Modify: `apps/blog-portal/source/css/portal/tokens.css`
- Modify: `apps/blog-portal/source/css/portal/base.css`
- Modify: `apps/blog-portal/source/css/portal/hero.css`
- Modify: `apps/blog-portal/source/css/portal/components.css`
- Modify: `apps/blog-portal/source/css/portal/responsive.css`
- Modify: `apps/blog-portal/source/js/portal-hero.js`
- Modify: `apps/blog-portal/test/visual-system.test.js`

**Interfaces:**
- Consumes: semantic portal classes and optional `data-theme`.
- Produces: centered hero identity, circular avatar, serif heading layer, shared light/dark component tokens.

- [ ] **Step 1: Extend the visual regression test so the current blob/copy fails**

Add:

```js
test('hero uses a circular crop and CSS does not generate visible copy', () => {
  const hero = fs.readFileSync(path.join(cssRoot, 'hero.css'), 'utf8')
  assert.match(hero, /\.portal-hero-info__avatar[\s\S]*border-radius:\s*50%/)
  assert.match(hero, /\.portal-hero-info__avatar[\s\S]*object-fit:\s*cover/)
  assert.match(hero, /\.portal-hero-info__avatar[\s\S]*aspect-ratio:\s*1/)
  assert.doesNotMatch(hero, /PERSONAL NOTES|SELECTED WORK/)
  assert.doesNotMatch(hero, /content:\s*['"][A-Za-z]/)
})

test('portal components provide standalone light and dark tokens', () => {
  const tokens = fs.readFileSync(path.join(cssRoot, 'tokens.css'), 'utf8')
  assert.match(tokens, /:root[\s\S]*--portal-bg/)
  assert.match(tokens, /\[data-theme='dark'\][\s\S]*--portal-bg/)
  assert.match(tokens, /--portal-heading-font/)
  assert.match(tokens, /--portal-body-font/)
})
```

- [ ] **Step 2: Run the visual test and confirm it fails on blob radius and hardcoded copy**

Run:

```bash
cd apps/blog-portal
node --test test/visual-system.test.js
```

Expected: failure matching `border-radius: 50%` and forbidden text.

- [ ] **Step 3: Implement centered option A hero**

Use:

```css
.portal-hero-info {
  display: flex;
  width: min(42rem, calc(100% - 2rem));
  align-items: center;
  flex-direction: column;
  gap: var(--portal-space-3);
  text-align: center;
}

.portal-hero-info__avatar {
  width: clamp(6.75rem, 13vw, 8.75rem);
  border: 2px solid rgb(255 255 255 / 42%);
  border-radius: 50%;
  aspect-ratio: 1;
  object-fit: cover;
}

.portal-hero-info__name {
  font-family: var(--portal-heading-font);
}
```

Remove `.portal-hero-info__text::before`. Keep the subtitle as plain authored
content. Mark the scroll label with `data-ui-key="home.scroll"` in
`portal-hero.js`.

- [ ] **Step 4: Normalize typography and surfaces across page types**

Define:

```css
:root {
  --portal-heading-font: Georgia, 'Times New Roman', serif;
  --portal-body-font: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.portal-page,
.portal-generic-toolbar,
#portal-music-panel,
#locale-dropdown {
  font-family: var(--portal-body-font);
}

.portal-section-heading :where(h1, h2),
.portal-section > h2,
.portal-hero-info__name {
  font-family: var(--portal-heading-font);
}
```

Apply shared surfaces to portal pages and Butterfly post/archive/card surfaces
using tokens with local fallback values. Do not use visible CSS `content`.

- [ ] **Step 5: Add narrow-view and reduced-motion rules**

At widths below `640px`, keep the avatar circular at `6.75rem`, reduce hero
height to at least `64svh`, make card grids one column, and keep both popovers
within `calc(100vw - 24px)`. Under `prefers-reduced-motion: reduce`, disable
hero cursor/bounce/background transitions and component hover transforms.

- [ ] **Step 6: Run visual, renderer, build, and output validation**

Run:

```bash
cd apps/blog-portal
node --test test/visual-system.test.js test/renderer-localization.test.js
npm run build
npm run validate
```

Expected: all tests pass and all generated HTML validates.

- [ ] **Step 7: Commit the selected visual direction**

```bash
git add apps/blog-portal/source/css/portal \
  apps/blog-portal/source/js/portal-hero.js \
  apps/blog-portal/test/visual-system.test.js
git commit -m "style: restore a coherent centered portal identity"
```

---

### Task 5: Localized, Theme-Adaptive Music UI

**Files:**
- Modify: `apps/blog-portal/source/js/portal-music-player.js`
- Modify: `apps/blog-portal/source/css/portal/components.css`
- Modify: `apps/blog-portal/test/music-loading.test.js`

**Interfaces:**
- Consumes: `PortalLocale.t`, `PortalLocale.subscribe`, and `PortalButterflyAdapter.resolveToolbar`.
- Produces: `window.PortalMusicPlayer.mount()`, translated wrapper states, lazy APlayer/Meting loading, theme-adaptive panel.

- [ ] **Step 1: Add failing music localization and boundary assertions**

```js
assert.match(playerScript, /PortalLocale\.t/)
assert.match(playerScript, /PortalLocale\.subscribe/)
assert.match(playerScript, /PortalButterflyAdapter\.resolveToolbar/)
assert.doesNotMatch(
  playerScript,
  /title = 'Open music player'|Music loads after|Loading music|temporarily unavailable/,
)
assert.match(playerScript, /music\.initial/)
assert.match(playerScript, /music\.loading/)
assert.match(playerScript, /music\.unavailable/)
```

- [ ] **Step 2: Run the music test and confirm current hardcoded English fails**

Run:

```bash
cd apps/blog-portal
node --test test/music-loading.test.js
```

Expected: failures for missing locale API and present hardcoded English.

- [ ] **Step 3: Refactor the music controller around translation keys**

Implement:

```js
function translate(key, fallback) {
  return window.PortalLocale
    ? window.PortalLocale.t(key, fallback)
    : fallback
}

function renderCopy() {
  musicBtn.title = translate('music.open', 'Open music player')
  musicBtn.setAttribute('aria-label', musicBtn.title)
  panel.setAttribute('aria-label', translate('music.title', 'Music'))
  if (state === 'initial') setStatus('music.initial', 'Music loads when you open the player')
  if (state === 'loading') setStatus('music.loading', 'Loading music')
  if (state === 'error') setStatus('music.unavailable', 'Music service is temporarily unavailable')
}
```

Mount through:

```js
const toolbar = window.PortalButterflyAdapter?.resolveToolbar()
  || document.querySelector('[data-portal-toolbar]')
toolbar.appendChild(musicBtn)
```

Subscribe to locale changes and rerun `renderCopy()` without recreating APlayer.
Expose and call the stable mount API:

```js
function mount() {
  if (document.getElementById('portal-music-btn')) return
  const toolbar = window.PortalButterflyAdapter?.resolveToolbar()
    || document.querySelector('[data-portal-toolbar]')
  if (!toolbar) return
  toolbar.appendChild(musicBtn)
}

window.PortalMusicPlayer = Object.freeze({ mount })
mount()
```

- [ ] **Step 4: Add explicit light/dark APlayer wrapper styling**

Style `#portal-music-panel .aplayer`, playlist rows, controls, muted text,
popover border, focus, and hover from portal tokens. Keep all selectors scoped
below `#portal-music-panel`.

- [ ] **Step 5: Run music and visual tests**

Run:

```bash
cd apps/blog-portal
node --test test/music-loading.test.js test/visual-system.test.js
```

Expected: both pass; dependencies remain lazy.

- [ ] **Step 6: Commit the music adaptation**

```bash
git add apps/blog-portal/source/js/portal-music-player.js \
  apps/blog-portal/source/css/portal/components.css \
  apps/blog-portal/test/music-loading.test.js
git commit -m "fix: localize and theme the portal music panel"
```

---

### Task 6: Explicit Butterfly Build-Time Adapter and Maintenance Documentation

**Files:**
- Create: `apps/blog-portal/lib/portal/adapters/butterfly-theme-projection.js`
- Modify: `apps/blog-portal/lib/portal/theme-projection.js`
- Modify: `apps/blog-portal/scripts/portal-data-sync.js`
- Modify: `apps/blog-portal/test/theme-projection.test.js`
- Modify: `docs/CONTENT_MAP.md`
- Modify: `docs/MAINTENANCE.md`

**Interfaces:**
- Consumes: Butterfly config, profile snapshot, navigation, portfolio, locale config, build version.
- Produces: `projectButterflyThemeConfig(input)`; compatibility `projectThemeConfig(input)` re-export.

- [ ] **Step 1: Add a failing compatibility and import-boundary test**

```js
const legacy = require('../lib/portal/theme-projection')
const adapter = require('../lib/portal/adapters/butterfly-theme-projection')
assert.equal(legacy.projectThemeConfig, adapter.projectButterflyThemeConfig)

const rendererFiles = [
  'lib/portal/create-renderer.js',
  'lib/portal/render/home.js',
  'lib/portal/render/about.js',
  'lib/portal/render/contact.js',
].map((file) => fs.readFileSync(path.join(projectRoot, file), 'utf8')).join('\n')
assert.doesNotMatch(rendererFiles, /butterfly-theme-projection|theme-projection/)
```

- [ ] **Step 2: Run the projection test and confirm the adapter module is missing**

Run:

```bash
cd apps/blog-portal
node --test test/theme-projection.test.js
```

Expected: module-not-found failure.

- [ ] **Step 3: Move projection implementation and keep one compatibility re-export**

The new adapter exports:

```js
module.exports = {
  PROFILE_THEME_FIELDS,
  projectButterflyThemeConfig,
}
```

The old file contains only:

```js
const adapter = require('./adapters/butterfly-theme-projection')
module.exports = {
  ...adapter,
  projectThemeConfig: adapter.projectButterflyThemeConfig,
}
```

`portal-data-sync.js` imports `projectButterflyThemeConfig` from the explicit
adapter path.

- [ ] **Step 4: Document exact ownership and replacement instructions**

`CONTENT_MAP.md` records:

```text
portal-ui catalogs -> public interface chrome only
Markdown/MySQL/YAML -> authored content only
portal-locale-core -> semantic locale runtime
butterfly-adapter.js -> Butterfly DOM selectors and control placement
butterfly-theme-projection.js -> Butterfly build-time config
```

`MAINTENANCE.md` explains that changing Hexo themes requires replacing the two
Butterfly adapters and adding a theme config file; renderer, catalogs, locale
core, music controller, content snapshots, and Formspree renderer remain.

- [ ] **Step 5: Run projection, renderer, and catalog tests**

Run:

```bash
cd apps/blog-portal
node --test test/theme-projection.test.js \
  test/theme-boundary.test.js \
  test/renderer-localization.test.js \
  test/locale-catalog.test.js
```

Expected: all pass.

- [ ] **Step 6: Commit the build-time adapter boundary**

```bash
git add apps/blog-portal/lib/portal \
  apps/blog-portal/scripts/portal-data-sync.js \
  apps/blog-portal/test/theme-projection.test.js \
  docs/CONTENT_MAP.md docs/MAINTENANCE.md
git commit -m "refactor: isolate Butterfly build-time integration"
```

---

### Task 7: Full Verification, Production Deployment, and GitHub Archive

**Files:**
- Modify only if fresh verification exposes a specific defect.
- Verify: repository, production server, public URLs, and open pull request.

**Interfaces:**
- Consumes: completed implementation and existing deployment contract.
- Produces: clean verified branch, deployed production source, browser QA evidence, matching GitHub remote commit.

- [ ] **Step 1: Run the complete local verification suite**

Run:

```bash
cd apps/blog-portal
npm run check
cd ../backend-api
npm test
cd ../..
bash -n scripts/deploy.sh scripts/content-snapshot.sh scripts/sync-admin.sh
DATABASE_URL='mysql://u:p@127.0.0.1:3306/d' \
  ./apps/backend-api/node_modules/.bin/prisma validate \
  --schema apps/backend-api/prisma/schema.prisma
git diff --check
```

Expected:

```text
all portal tests pass
clean Hexo build succeeds
all generated HTML validates
all backend tests pass
Prisma schema is valid
shell syntax and whitespace checks succeed
```

- [ ] **Step 2: Confirm the content snapshot preflight is clean**

Run:

```bash
rsync -aczni \
  je1ght-server:/home/je1ght/code/websites/je1ght-platform/portal-source/source/_data/site_profile.yml \
  apps/blog-portal/source/_data/
rsync -aczni \
  je1ght-server:/home/je1ght/code/websites/je1ght-platform/portal-source/source/_data/portfolio.yml \
  apps/blog-portal/source/_data/
```

Expected: no output. If either differs, run `scripts/content-snapshot.sh pull`,
review the exact YAML diff, commit the production snapshot, and rerun the
complete suite before deployment.

- [ ] **Step 3: Deploy through the corrected production script**

Run:

```bash
bash scripts/deploy.sh
```

Expected: content preflight passes, Hexo build/validation succeeds, sources and
public files synchronize, backend build succeeds, loopback health succeeds,
OpenResty configuration validates and reloads.

- [ ] **Step 4: Verify public assets and service health**

Check:

```text
GET https://je1ght.top/ -> 200
GET https://je1ght.top/about/ -> 200
GET https://je1ght.top/contact/ -> 200 and Formspree action present
GET https://je1ght.top/shared-assets/locales/portal-ui/en.json -> 200
GET https://je1ght.top/shared-assets/locales/portal-ui/zh-CN.json -> 200
GET https://je1ght.top/js/portal-locale-core.js -> 200
GET https://je1ght.top/js/adapters/butterfly-adapter.js -> 200
GET https://je1ght.top/api/health -> 200
GET https://je1ght.top/api/auth/session -> 401 without a cookie
```

Assert homepage HTML/CSS do not contain
`PERSONAL NOTES / SELECTED WORK`.

- [ ] **Step 5: Perform Computer Use QA on the exact production URLs**

In Chrome:

1. Visit `/`, `/about/`, `/contact/`, `/archives/`, `/categories/`, `/tags/`,
   `/link/`, and one `/posts/.../` page.
2. Confirm homepage avatar is circular and undistorted.
3. Toggle dark/light on homepage, About, a post, language dropdown, and music
   panel.
4. Switch English → Simplified Chinese → Traditional Chinese → Japanese.
5. On a post and About page, record the authored title/body before switching
   and confirm it is unchanged afterward.
6. Confirm navigation, form labels, search placeholder, empty states, language
   control, music tooltip, initial/loading/error state translate.
7. Open/close music; confirm panel width, contrast, focus, outside-click, and
   narrow viewport behavior.
8. Navigate with PJAX and confirm the selected interface language reapplies.

- [ ] **Step 6: Commit any verification-only correction and rerun its proving test**

If QA exposes a defect, first add or extend the smallest automated regression
test, confirm the test fails, implement only that fix, rerun the focused test,
then rerun Step 1. Commit with a message naming the verified defect.

- [ ] **Step 7: Push and verify GitHub remote state**

Run:

```bash
git status --short
git push origin agent/site-audit-implementation
git ls-remote origin refs/heads/agent/site-audit-implementation
gh pr view 1 --json headRefOid,state,isDraft,url
```

Expected: clean worktree; remote SHA and PR head SHA equal local `HEAD`; PR #1
remains open and records the final validation counts and production deployment.
