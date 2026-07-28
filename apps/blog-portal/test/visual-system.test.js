const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const cssRoot = path.resolve(__dirname, '../source/css/portal')

test('visual system is split into explicit layers with accessibility fallbacks', () => {
  const layers = ['tokens.css', 'base.css', 'hero.css', 'components.css', 'responsive.css']
  const combined = layers
    .map((file) => fs.readFileSync(path.join(cssRoot, file), 'utf8'))
    .join('\n')

  assert.match(combined, /--portal-space-1/)
  assert.match(combined, /--portal-surface/)
  assert.match(combined, /:focus-visible/)
  assert.match(combined, /prefers-reduced-motion:\s*reduce/)
  assert.match(combined, /64svh/)
})
