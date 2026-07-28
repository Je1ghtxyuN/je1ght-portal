const test = require('node:test')
const assert = require('node:assert/strict')
const { mkdtemp, mkdir, writeFile } = require('node:fs/promises')
const { join } = require('node:path')
const { tmpdir } = require('node:os')
const { validateGeneratedSite } = require('../lib/portal/validate-output')

async function createSite(files) {
  const root = await mkdtemp(join(tmpdir(), 'portal-output-'))

  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = join(root, relativePath)
    await mkdir(join(fullPath, '..'), { recursive: true })
    await writeFile(fullPath, content)
  }

  return root
}

test('reports unresolved build placeholders', async () => {
  const root = await createSite({
    'index.html': '<html lang="en"><head><title>Home</title><link rel="canonical" href="https://je1ght.top/"></head><body><script src="/app.js?v=BUILD_VER"></script></body></html>',
    'app.js': '',
  })

  const result = await validateGeneratedSite(root)

  assert.match(result.errors.join('\n'), /BUILD_VER/)
})

test('reports a serialized language array', async () => {
  const root = await createSite({
    'index.html': '<html lang="[&quot;en&quot;,&quot;zh-CN&quot;]"><head><title>Home</title><link rel="canonical" href="https://je1ght.top/"></head></html>',
  })

  const result = await validateGeneratedSite(root)

  assert.match(result.errors.join('\n'), /language/)
})

test('reports duplicate ids', async () => {
  const root = await createSite({
    'index.html': '<html lang="en"><head><title>Home</title><link rel="canonical" href="https://je1ght.top/"></head><body><div id="same"></div><span id="same"></span></body></html>',
  })

  const result = await validateGeneratedSite(root)

  assert.match(result.errors.join('\n'), /duplicate id "same"/)
})

test('reports unresolved internal links and assets', async () => {
  const root = await createSite({
    'index.html': '<html lang="en"><head><title>Home</title><link rel="canonical" href="https://je1ght.top/"></head><body><a href="/missing/">Missing</a><img src="/missing.png"></body></html>',
  })

  const result = await validateGeneratedSite(root)

  assert.match(result.errors.join('\n'), /\/missing\//)
  assert.match(result.errors.join('\n'), /\/missing\.png/)
})

test('accepts valid internal links and assets', async () => {
  const root = await createSite({
    'index.html': '<html lang="en"><head><title>Home</title><link rel="canonical" href="https://je1ght.top/"></head><body><a href="/about/">About</a><link href="/css/site.css"></body></html>',
    'about/index.html': '<html lang="en"><head><title>About</title><link rel="canonical" href="https://je1ght.top/about/"></head></html>',
    'css/site.css': '',
  })

  const result = await validateGeneratedSite(root)

  assert.equal(result.htmlFiles, 2)
  assert.deepEqual(result.errors, [])
})
