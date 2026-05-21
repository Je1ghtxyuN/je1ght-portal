import { writeFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { prisma } from '../db/client.js'
import { env } from '../config/env.js'

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

function yamlArrayInline(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '[]'
  return `[${arr.map((v) => yamlEscape(v)).join(', ')}]`
}

function toYaml(obj, indent = 0) {
  const prefix = '  '.repeat(indent)
  const lines = []

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      lines.push(`${prefix}${key}:`)
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${prefix}${key}: []`)
      } else if (value.every((v) => typeof v === 'string' || typeof v === 'number')) {
        lines.push(`${prefix}${key}: ${yamlArrayInline(value)}`)
      } else {
        lines.push(`${prefix}${key}:`)
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            const entries = Object.entries(item)
            if (entries.length > 0) {
              const [firstKey, firstVal] = entries[0]
              lines.push(`${prefix}  - ${firstKey}: ${typeof firstVal === 'object' ? '' : yamlEscape(firstVal)}`)
              for (const [k, v] of entries.slice(1)) {
                if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                  lines.push(`${prefix}    ${k}:`)
                  for (const [sk, sv] of Object.entries(v)) {
                    lines.push(`${prefix}      ${sk}: ${yamlEscape(sv)}`)
                  }
                } else if (Array.isArray(v)) {
                  lines.push(`${prefix}    ${k}: ${yamlArrayInline(v)}`)
                } else {
                  lines.push(`${prefix}    ${k}: ${yamlEscape(v)}`)
                }
              }
            }
          } else {
            lines.push(`${prefix}  - ${yamlEscape(item)}`)
          }
        }
      }
    } else if (typeof value === 'object') {
      lines.push(`${prefix}${key}:`)
      lines.push(toYaml(value, indent + 1))
    } else {
      lines.push(`${prefix}${key}: ${yamlEscape(value)}`)
    }
  }

  return lines.join('\n')
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

    const yamlContent = MANAGED_MARKER_YML + '\n' + toYaml(data)
    await writeFile(join(dataDir, 'site_profile.yml'), yamlContent, 'utf-8')
  }

  // 3. Generate portfolio.yml
  const portfolioItems = await prisma.portfolioItem.findMany({
    orderBy: { sortOrder: 'asc' },
  })

  if (portfolioItems.length > 0) {
    const portfolioData = {
      section: {
        title: 'Portfolio',
        intro: '',
        home_preview_title: 'Selected Projects',
        home_preview_intro: '',
        page_link_label: 'View Project',
      },
      cards: portfolioItems.map((item) => ({
        slug: item.slug,
        title: item.title,
        year: item.year || '',
        status: item.status || '',
        summary: item.summary,
        cover_image: item.coverImage || '/shared-assets/images/background.jpg',
        gallery: Array.isArray(item.gallery) ? item.gallery : [],
        tech_stack: Array.isArray(item.techStack) ? item.techStack : [],
        tags: Array.isArray(item.tags) ? item.tags : [],
        links: typeof item.links === 'object' ? item.links : {},
      })),
    }

    const yamlContent = MANAGED_MARKER_YML + '\n' + toYaml(portfolioData)
    await writeFile(join(dataDir, 'portfolio.yml'), yamlContent, 'utf-8')
  }

  // 4. Run hexo generate
  const portalRoot = getPortalRoot()

  // Clear hexo cache to ensure source changes are picked up
  try {
    const dbPath = join(portalRoot, 'db.json')
    await import('node:fs/promises').then((fs) => fs.unlink(dbPath))
  } catch { /* db.json may not exist */ }

  // Temporarily disable conflicting generator (uses source/index.md + tag instead)
  const genPath = join(portalRoot, 'scripts', 'portal-home-generator.js')
  const genBak = genPath + '.disabled'
  let restored = false
  try {
    await import('node:fs/promises').then((fs) => fs.rename(genPath, genBak))
    restored = true
  } catch { /* generator may already be disabled */ }

  try {
    const hexoBin = join(portalRoot, 'node_modules', '.bin', 'hexo')
    // Note: do NOT use `hexo clean` — it deletes public/ which breaks the Docker bind mount
    const { stdout, stderr } = await execFileAsync(hexoBin, ['generate'], {
      cwd: portalRoot,
      timeout: 60000,
    })
    // Fix ownership so nginx can read (runs as root in Docker, nginx needs read)
    await execFileAsync('chown', ['-R', '1000:1000', join(portalRoot, 'public')], { timeout: 10000 }).catch(() => {})
    // Bust Cloudflare cache: replace BUILD_VER placeholder with Unix timestamp
    const buildVer = String(Math.floor(Date.now() / 1000))
    await execFileAsync('find', [join(portalRoot, 'public'), '-name', '*.html', '-exec', 'sed', '-i', `s/BUILD_VER/${buildVer}/g`, '{}', '+'], { timeout: 10000 }).catch(() => {})
    // Also replace any stale cached version (in case hexo cached a previous buildVer)
    await execFileAsync('find', [join(portalRoot, 'public'), '-name', '*.html', '-exec', 'sed', '-i', `s/v=\\\\d\\\\+/v=${buildVer}/g`, '{}', '+'], { timeout: 10000 }).catch(() => {})
    // Touch nginx HTML dir to refresh bind mount without downtime
    await execFileAsync('touch', [join(portalRoot, 'public', '.nginx-refresh')], { timeout: 5000 }).catch(() => {})
    return { ok: true, postsGenerated: posts.length, hexoOutput: stdout, hexoErrors: stderr || null, cacheVersion: buildVer }
  } catch (err) {
    try {
      await execFileAsync('npx', ['hexo', 'generate'], { cwd: portalRoot, timeout: 60000 })
      // Cache bust in fallback path too
      const fbVer = String(Math.floor(Date.now() / 1000))
      await execFileAsync('find', [join(portalRoot, 'public'), '-name', '*.html', '-exec', 'sed', '-i', `s/BUILD_VER/${fbVer}/g`, '{}', '+'], { timeout: 10000 }).catch(() => {})
      return { ok: true, postsGenerated: posts.length }
    } catch (err2) {
      return { ok: false, postsGenerated: posts.length, error: err.message, hexoOutput: err.stdout || '', hexoErrors: err.stderr || '' }
    }
  } finally {
    // Restore the generator if we renamed it
    if (restored) {
      try { await import('node:fs/promises').then((fs) => fs.rename(genBak, genPath)) } catch {}
    }
  }
}
