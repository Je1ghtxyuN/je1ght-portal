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

  const sharedDetailScope =
    /#body-wrap:has\(#category\),\s*#body-wrap:has\(#tag\)/g
  assert.equal(css.match(sharedDetailScope)?.length, 7)
  assert.match(
    css,
    /#body-wrap:has\(#category\)\s+#category,\s*#body-wrap:has\(#tag\)\s+#tag/,
  )
  assert.match(
    css,
    /\.article-sort-item\.year,[\s\S]*font-family:\s*var\(--portal-heading-font\)/,
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
