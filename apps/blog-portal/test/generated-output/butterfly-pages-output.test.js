const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..', '..')
const publicRoot = path.join(root, 'public')
const buildVersion = process.env.PORTAL_BUILD_VERSION

const detailPage = (family) => {
  const familyRoot = path.join(publicRoot, family)
  const entries = fs.readdirSync(familyRoot, { recursive: true })
  const detail = entries.find(
    (entry) =>
      entry.endsWith(path.sep + 'index.html') &&
      entry !== 'index.html',
  )

  assert.ok(detail, `expected a generated ${family} detail page`)
  return path.join(familyRoot, detail)
}

test('fresh generated archive and taxonomy pages expose visual hooks and the current adapter stylesheet', () => {
  assert.match(
    buildVersion || '',
    /^[0-9a-f]{7,}$/,
    'PORTAL_BUILD_VERSION must identify the build under test',
  )

  const pages = [
    [path.join(publicRoot, 'archives/index.html'), 'id="archive"'],
    [path.join(publicRoot, 'archives/2026/index.html'), 'id="archive"'],
    [path.join(publicRoot, 'categories/index.html'), 'type-categories'],
    [detailPage('categories'), 'id="category"'],
    [path.join(publicRoot, 'tags/index.html'), 'type-tags'],
    [detailPage('tags'), 'id="tag"'],
  ]
  const stylesheet = new RegExp(
    `/css/portal/butterfly-pages\\.css\\?v=${buildVersion}`,
  )

  for (const [file, hook] of pages) {
    const html = fs.readFileSync(file, 'utf8')
    assert.match(html, new RegExp(hook))
    assert.match(html, stylesheet)
  }
})

test('fresh generated taxonomy detail hooks are covered by adapter scopes', () => {
  const css = fs.readFileSync(
    path.join(publicRoot, 'css/portal/butterfly-pages.css'),
    'utf8',
  )

  for (const [family, hook] of [
    ['categories', 'category'],
    ['tags', 'tag'],
  ]) {
    const html = fs.readFileSync(detailPage(family), 'utf8')
    assert.match(html, /<div class="page" id="body-wrap">/)
    assert.match(html, new RegExp(`<div id="${hook}">`))
    assert.match(css, new RegExp(`#body-wrap:has\\(#${hook}\\)`))
  }
})
