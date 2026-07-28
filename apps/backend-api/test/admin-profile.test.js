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

test('every Prisma migration directory contains a migration file', () => {
  const migrationsRoot = path.join(root, 'prisma/migrations')
  const emptyMigrations = fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !fs.existsSync(path.join(migrationsRoot, name, 'migration.sql')))

  assert.deepEqual(emptyMigrations, [])
})

test('portal migration history excludes conflicting duplicate Study migrations', () => {
  const migrationsRoot = path.join(root, 'prisma/migrations')
  const migrationSql = fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => fs.readFileSync(path.join(migrationsRoot, entry.name, 'migration.sql'), 'utf8'))
    .join('\n')

  assert.doesNotMatch(migrationSql, /\bTodoItem\b|ALTER TABLE `StudyUser` ADD COLUMN `preferences`/)
})

test('deploy updates the real OpenResty site without stopping the full stack', () => {
  const deploy = fs.readFileSync(path.join(repoRoot, 'scripts/deploy.sh'), 'utf8')

  assert.match(deploy, /je1ght\.top\.conf/)
  assert.match(deploy, /SERVER_OPENRESTY_STAGING/)
  assert.doesNotMatch(deploy, /SERVER_OPENRESTY_CONF\.next/)
  assert.match(deploy, /docker compose up -d --no-deps backend-api/)
  assert.match(deploy, /openresty -t/)
  assert.match(deploy, /openresty -s reload/)
  assert.doesNotMatch(deploy, /docker compose down/)
  assert.match(deploy, /source\/_data\/site_profile\.yml/)
  assert.match(deploy, /source\/_data\/portfolio\.yml/)
  assert.match(deploy, /Snapshot mismatch/)
  assert.match(deploy, /--exclude='source\/_data\/site_profile\.yml'/)
  assert.match(deploy, /--exclude='source\/_data\/portfolio\.yml'/)
  assert.doesNotMatch(deploy, /npm install --silent/)
  assert.match(deploy, /SHARED_ASSETS_LINK="\$\(readlink/)
  assert.match(
    deploy,
    /ln -s "\$SHARED_ASSETS_LINK" "\$PORTAL_DIR\/source\/shared-assets"/,
  )
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

test('admin assets use a versioned URL to escape cached historical 404 responses', () => {
  const html = fs.readFileSync(path.join(root, 'public/admin/index.html'), 'utf8')

  assert.match(html, /style\.css\?v=[a-z0-9._-]+/)
  assert.match(html, /app\.js\?v=[a-z0-9._-]+/)
})
