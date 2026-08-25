import { writeFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { prisma } from '../db/client.js'
import { env } from '../config/env.js'
import {
  serializePortfolio,
  serializeSiteProfile,
} from './content-snapshot.js'

const execFileAsync = promisify(execFile)

const MANAGED_MARKER_MD = '<!-- managed-by-backend-api -->'
const MANAGED_MARKER_YML = '# managed-by-backend-api'

function getPortalRoot() {
  // In Docker: portal source is mounted at /portal-source
  if (env.REPO_ROOT === '/portal-source') return '/portal-source'
  // Local dev: REPO_ROOT points to repo, portal is at apps/blog-portal
  if (env.REPO_ROOT) return join(env.REPO_ROOT, 'apps', 'blog-portal')
  throw new Error('REPO_ROOT is not configured')
}

function getPostsDir() {
  return join(getPortalRoot(), 'source', '_posts')
}

function getDataDir() {
  return join(getPortalRoot(), 'source', '_data')
}

function yamlEscape(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  const str = String(value)
  if (str.includes('\n') || str.includes(':') || str.includes('#') || str.includes('"') || str.includes(',')) {
    return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return str
}

function postToFrontmatter(post) {
  const lines = ['---']
  lines.push(`title: ${yamlEscape(post.title)}`)
  lines.push(`date: ${new Date(post.publishedAt || post.createdAt).toISOString().replace('T', ' ').slice(0, 19)}`)
  if (post.description) lines.push(`description: ${yamlEscape(post.description)}`)

  const categories = Array.isArray(post.categories) ? post.categories : []
  if (categories.length > 0) {
    lines.push('categories:')
    for (const cat of categories) lines.push(`  - ${yamlEscape(cat)}`)
  }

  const tags = Array.isArray(post.tags) ? post.tags : []
  if (tags.length > 0) {
    lines.push('tags:')
    for (const tag of tags) lines.push(`  - ${yamlEscape(tag)}`)
  }

  lines.push('---')
  lines.push('')
  lines.push(post.content || '')

  return lines.join('\n')
}

async function clearManagedFiles(dir) {
  try {
    const files = await readdir(dir)
    for (const file of files) {
      if (!file.endsWith('.md') && !file.endsWith('.yml')) continue
      const filePath = join(dir, file)
      try {
        const content = await import('node:fs/promises').then((fs) => fs.readFile(filePath, 'utf-8'))
        if (content.includes(MANAGED_MARKER_MD) || content.includes(MANAGED_MARKER_YML)) {
          await unlink(filePath)
        }
      } catch {
        // skip files we can't read
      }
    }
  } catch {
    // directory may not exist yet
  }
}

export async function rebuildPortal() {
  const postsDir = getPostsDir()
  const dataDir = getDataDir()

  await mkdir(postsDir, { recursive: true })
  await mkdir(dataDir, { recursive: true })

  // 1. Generate blog posts
  await clearManagedFiles(postsDir)
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: 'desc' },
  })

  for (const post of posts) {
    const filename = `${post.slug}.md`
    const content = postToFrontmatter(post) + '\n' + MANAGED_MARKER_MD
    await writeFile(join(postsDir, filename), content, 'utf-8')
  }

  // 2. Generate site_profile.yml
  const profile = await prisma.siteProfile.findUnique({ where: { id: 'default' } })
  if (profile?.data) {
    // Clone so we don't mutate cached DB data
    const data = { ...profile.data }

    // Auto-populate hero_backgrounds from filesystem
    try {
      const backgroundsDir = join(getPortalRoot(), 'source', 'shared-assets', 'images', 'backgrounds')
      const bgFiles = await readdir(backgroundsDir)
      const bgPaths = bgFiles
        .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .sort()
        .map(f => `/shared-assets/images/backgrounds/${f}`)
      if (bgPaths.length > 0) {
        data.hero_backgrounds = bgPaths
      }
    } catch { /* backgrounds dir may not exist yet — leave hero_backgrounds as-is */ }

    // Default rotation interval
    if (!data.hero_rotation_interval) {
      data.hero_rotation_interval = 300
    }

    const yamlContent = serializeSiteProfile(data)
    await writeFile(join(dataDir, 'site_profile.yml'), yamlContent, 'utf-8')
  }

  // 3. Generate portfolio.yml
  const portfolioItems = await prisma.portfolioItem.findMany({
    orderBy: { sortOrder: 'asc' },
  })

  const portfolioYaml = serializePortfolio(portfolioItems)
  await writeFile(join(dataDir, 'portfolio.yml'), portfolioYaml, 'utf-8')

  // 4. Run hexo generate
  const portalRoot = getPortalRoot()

  // Clear hexo cache to ensure source changes are picked up
  try {
    const dbPath = join(portalRoot, 'db.json')
    await import('node:fs/promises').then((fs) => fs.unlink(dbPath))
  } catch { /* db.json may not exist */ }

  const buildVer = String(Math.floor(Date.now() / 1000))
  try {
    const hexoBin = join(portalRoot, 'node_modules', '.bin', 'hexo')
    // Note: do NOT use `hexo clean` — it deletes public/ which breaks the Docker bind mount
    const { stdout, stderr } = await execFileAsync(hexoBin, ['generate'], {
      cwd: portalRoot,
      timeout: 60000,
      env: { ...process.env, PORTAL_BUILD_VERSION: buildVer },
    })
    // Fix ownership so nginx can read (runs as root in Docker, nginx needs read)
    await execFileAsync('chown', ['-R', '1000:1000', join(portalRoot, 'public')], { timeout: 10000 }).catch(() => {})
    // Touch nginx HTML dir to refresh bind mount without downtime
    await execFileAsync('touch', [join(portalRoot, 'public', '.nginx-refresh')], { timeout: 5000 }).catch(() => {})
    return { ok: true, postsGenerated: posts.length, hexoOutput: stdout, hexoErrors: stderr || null, cacheVersion: buildVer }
  } catch (err) {
    return { ok: false, postsGenerated: posts.length, error: err.message, hexoOutput: err.stdout || '', hexoErrors: err.stderr || '' }
  }
}
