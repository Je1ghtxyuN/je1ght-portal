import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(root, '../..')

test('nginx gives Admin assets priority over generic CSS and JS locations', () => {
  const nginx = fs.readFileSync(path.join(repoRoot, 'infra/nginx/default.conf'), 'utf8')

  assert.match(nginx, /location \^~ \/admin\/\s*\{/)
})

test('admin profile editor owns the Formspree endpoint setting', () => {
  const html = fs.readFileSync(path.join(root, 'public/admin/index.html'), 'utf8')
  const script = fs.readFileSync(path.join(root, 'public/admin/app.js'), 'utf8')

  assert.match(html, /id="pf-contact-formspree"/)
  assert.match(html, /Formspree Endpoint/i)
  assert.match(script, /pf-contact-formspree/)
  assert.match(script, /formspree_endpoint/)
})
