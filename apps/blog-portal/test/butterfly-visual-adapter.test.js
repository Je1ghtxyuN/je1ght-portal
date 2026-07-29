const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const { JSDOM } = require('jsdom')

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

  assert.match(css, /#body-wrap:has\(#archive\)/)
  assert.match(css, /\.type-categories/)
  assert.match(css, /\.type-tags/)
  assert.match(css, /height:\s*260px/)
  assert.match(css, /max-width:\s*768px[\s\S]*height:\s*210px/)
  assert.match(css, /linear-gradient\([^)]*var\(--portal-bg\)/)

  const componentsIndex = config.indexOf('/css/portal/components.css')
  const adapterIndex = config.indexOf('/css/portal/butterfly-pages.css')
  const responsiveIndex = config.indexOf('/css/portal/responsive.css')
  assert.ok(componentsIndex >= 0)
  assert.ok(adapterIndex > componentsIndex)
  assert.ok(responsiveIndex > adapterIndex)
})

test('Butterfly category and tag detail pages use taxonomy visuals', () => {
  const css = fs.readFileSync(adapterPath, 'utf8')

  assert.match(css, /#body-wrap:has\(#category\) #page-header/)
  assert.match(css, /#body-wrap:has\(#tag\) #page-header/)
  assert.match(
    css,
    /#body-wrap:has\(#category\)\s+#category,\s*#body-wrap:has\(#tag\)\s+#tag/,
  )
  assert.match(
    css,
    /\.article-sort-item\.year,[\s\S]*font-family:\s*var\(--portal-heading-font\)/,
  )
})

test('taxonomy adapter wins the real Butterfly cascade contracts', () => {
  const adapter = fs.readFileSync(adapterPath, 'utf8')
  const butterflyContracts = `
    #page-header.not-home-page { height: 400px; }
    #page-header #page-site-info { top: 200px; }
    #page-header #site-title { font-size: 2.85em; }
    .layout > div:first-child:not(.nc),
    #aside-content .card-widget {
      background: var(--card-bg);
      border-radius: 8px;
      box-shadow: var(--card-box-shadow);
    }
  `
  const dom = new JSDOM(`
    <style>${butterflyContracts}\n${adapter}</style>
    <div id="body-wrap">
      <header id="page-header" class="not-home-page">
        <div id="page-site-info"><h1 id="site-title">Archives</h1></div>
      </header>
      <main class="layout">
        <div id="archive"></div>
        <aside id="aside-content"><div class="card-widget"></div></aside>
      </main>
    </div>
  `)
  const style = (selector) =>
    dom.window.getComputedStyle(dom.window.document.querySelector(selector))

  assert.equal(style('#page-header').height, '260px')
  assert.equal(style('#page-site-info').top, '50%')
  assert.equal(style('#page-site-info').transform, 'translateY(-50%)')
  assert.match(style('#site-title').fontSize, /^clamp\(/)

  for (const selector of ['#archive', '.card-widget']) {
    assert.equal(style(selector).background, 'var(--portal-surface)')
    assert.equal(style(selector).borderRadius, 'var(--portal-radius-lg)')
    assert.equal(style(selector).boxShadow, 'var(--portal-shadow)')
  }
})

test('taxonomy mastheads own a stable overlay and explicit layer order', () => {
  const css = fs.readFileSync(adapterPath, 'utf8')

  assert.match(
    css,
    /#page-header::before\s*\{[^}]*z-index:\s*1[^}]*background:\s*rgb\(5 12 20 \/ 48%\)/s,
  )
  assert.match(css, /#page-header::after\s*\{[^}]*z-index:\s*2/s)
  assert.match(
    css,
    /#page-header #page-site-info\s*\{[^}]*z-index:\s*3/s,
  )
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
    .join('\n')

  assert.doesNotMatch(
    shared,
    /#body-wrap:has\(#(?:archive|category|tag)\)|\.type-categories|\.type-tags/,
  )
})
