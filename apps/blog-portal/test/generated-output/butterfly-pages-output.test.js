const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const { parse } = require('parse5')

const root = path.resolve(__dirname, '..', '..')
const publicRoot = path.join(root, 'public')
const buildVersion = process.env.PORTAL_BUILD_VERSION

const findElementById = (node, id) => {
  const hasId = node.attrs?.some(
    (attribute) => attribute.name === 'id' && attribute.value === id,
  )
  if (hasId) return node

  for (const child of node.childNodes || []) {
    const match = findElementById(child, id)
    if (match) return match
  }

  return null
}

const hasTaxonomyDetailStructure = (html, hook) => {
  const bodyWrap = findElementById(parse(html), 'body-wrap')
  return Boolean(bodyWrap && findElementById(bodyWrap, hook))
}

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

test('taxonomy detail hooks must be descendants of body-wrap', () => {
  for (const hook of ['category', 'tag']) {
    const nested =
      `<div class="page" id="body-wrap"><main><div id="${hook}"></div></main></div>`
    const sibling =
      `<div class="page" id="body-wrap"></div><main><div id="${hook}"></div></main>`

    assert.equal(hasTaxonomyDetailStructure(nested, hook), true)
    assert.equal(hasTaxonomyDetailStructure(sibling, hook), false)
  }
})

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
    assert.equal(
      hasTaxonomyDetailStructure(html, hook),
      true,
      `expected #${hook} to be a descendant of #body-wrap`,
    )
    assert.match(css, new RegExp(`#body-wrap:has\\(#${hook}\\)`))
  }
})
