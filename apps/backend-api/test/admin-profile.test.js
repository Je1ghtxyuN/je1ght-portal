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

test('production OpenResty config is versioned and uses stable loopback upstreams', () => {
  const configPath = path.join(repoRoot, 'infra/nginx/je1ght.top.conf')

  assert.equal(fs.existsSync(configPath), true, 'missing production OpenResty config')
  const nginx = fs.readFileSync(configPath, 'utf8')
  assert.match(nginx, /location \^~ \/admin\/\s*\{/)
  assert.match(nginx, /proxy_pass http:\/\/127\.0\.0\.1:3001/)
  assert.match(nginx, /proxy_pass http:\/\/127\.0\.0\.1:8360/)
  assert.doesNotMatch(nginx, /172\.\d+\.\d+\.\d+/)
})

test('production compose exposes API services only on server loopback', () => {
  const compose = fs.readFileSync(path.join(repoRoot, 'infra/docker-compose.yml'), 'utf8')

  assert.match(compose, /127\.0\.0\.1:3001:3001/)
  assert.match(compose, /127\.0\.0\.1:8360:8360/)
  assert.match(compose, /MYSQL_PASSWORD:\s+\$\{WALINE_DB_PASSWORD/)
  assert.doesNotMatch(compose, /MYSQL_PASSWORD:\s+\d+/)
})

test('deploy updates the real OpenResty site without stopping the full stack', () => {
  const deploy = fs.readFileSync(path.join(repoRoot, 'scripts/deploy.sh'), 'utf8')

  assert.match(deploy, /je1ght\.top\.conf/)
  assert.match(deploy, /docker compose up -d --no-deps backend-api/)
  assert.match(deploy, /openresty -t/)
  assert.match(deploy, /openresty -s reload/)
  assert.doesNotMatch(deploy, /docker compose down/)
  assert.match(deploy, /source\/_data\/site_profile\.yml/)
  assert.match(deploy, /source\/_data\/portfolio\.yml/)
  assert.match(deploy, /Snapshot mismatch/)
  assert.match(deploy, /--exclude='source\/_data\/site_profile\.yml'/)
  assert.match(deploy, /--exclude='source\/_data\/portfolio\.yml'/)
})

test('admin profile editor owns the Formspree endpoint setting', () => {
  const html = fs.readFileSync(path.join(root, 'public/admin/index.html'), 'utf8')
  const script = fs.readFileSync(path.join(root, 'public/admin/app.js'), 'utf8')

  assert.match(html, /id="pf-contact-formspree"/)
  assert.match(html, /Formspree Endpoint/i)
  assert.match(html, /directly to your email/i)
  assert.match(script, /pf-contact-formspree/)
  assert.match(script, /formspree_endpoint/)
})

test('admin login has branded and accessible sign-in structure', () => {
  const html = fs.readFileSync(path.join(root, 'public/admin/index.html'), 'utf8')

  assert.match(html, /class="login-shell"/)
  assert.match(html, /class="login-brand"/)
  assert.match(html, /autocomplete="email"/)
  assert.match(html, /autocomplete="current-password"/)
  assert.match(html, /id="login-error"[^>]*aria-live="polite"/)
  assert.match(html, /id="login-submit"/)
})
