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

test('admin profile editor does not expose deprecated Formspree settings', () => {
  const html = fs.readFileSync(path.join(root, 'public/admin/index.html'), 'utf8')
  const script = fs.readFileSync(path.join(root, 'public/admin/app.js'), 'utf8')

  assert.doesNotMatch(html, /pf-contact-formspree|Formspree/i)
  assert.doesNotMatch(script, /pf-contact-formspree|formspree_endpoint/i)
})
