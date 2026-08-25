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
