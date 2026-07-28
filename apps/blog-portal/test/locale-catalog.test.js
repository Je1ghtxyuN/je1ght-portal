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
