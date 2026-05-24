import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { prisma } from '../src/db/client.js'

const MANAGED_MARKER = '<!-- managed-by-backend-api -->'

const POSTS_DIR = join('/portal-source', 'source', '_posts')
const DRAFTS_DIR = join('/portal-source', 'source', '_drafts')

function yamlEscape(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  const str = String(value)
  if (str.includes('\n') || str.includes(':') || str.includes('#') || str.includes('"') || str.includes(',')) {
    return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return str
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const fm = {}
  const lines = match[1].split('\n')
  let currentKey = null
  for (const line of lines) {
    if (/^\s{2}- /.test(line)) {
      if (currentKey) {
        if (!Array.isArray(fm[currentKey])) fm[currentKey] = []
        fm[currentKey].push(line.trim().replace(/^-\s*/, ''))
      }
      continue
    }
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/)
    if (kv) {
      currentKey = kv[1]
      const val = kv[2].trim()
      if (val !== '') {
        fm[currentKey] = val.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
      }
    }
  }
  return fm
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

async function importLocalPosts() {
  let files
  try {
    files = await readdir(POSTS_DIR)
  } catch {
    console.log('import-local-posts: _posts dir not found, skipping')
    return { imported: 0, updated: 0 }
  }

  let imported = 0
  let updated = 0

  for (const file of files) {
    if (!file.endsWith('.md')) continue

    const filePath = join(POSTS_DIR, file)
    const raw = await readFile(filePath, 'utf-8')

    // Skip already-managed files (Admin UI manages these via rebuild)
    if (raw.includes(MANAGED_MARKER)) continue

    const slug = file.replace(/\.md$/, '')
    const frontmatter = parseFrontmatter(raw)
    const bodyContent = raw.replace(/^---\n[\s\S]*?\n---\n?/, '')
    const fileStats = await stat(filePath)
    const fileMtime = fileStats.mtime

    const title = frontmatter.title || slug
    const description = frontmatter.description || ''
    const categories = Array.isArray(frontmatter.categories) ? frontmatter.categories : (frontmatter.categories ? [frontmatter.categories] : [])
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : (frontmatter.tags ? [frontmatter.tags] : [])

    const existing = await prisma.blogPost.findUnique({ where: { slug } })

    let upsertResult = null

    if (existing) {
      // Compare file mtime with MySQL updatedAt — file wins if newer
      const dbUpdated = new Date(existing.updatedAt)
      if (fileMtime > dbUpdated) {
        upsertResult = await prisma.blogPost.update({
          where: { slug },
          data: {
            title,
            description,
            content: bodyContent.trim(),
            categories,
            tags,
            updatedAt: new Date(),
          },
        })
        updated++
        console.log(`import-local-posts: updated "${slug}" (file newer)`)
      } else {
        console.log(`import-local-posts: skipped "${slug}" (DB newer, file unchanged)`)
        continue
      }
    } else {
      upsertResult = await prisma.blogPost.create({
        data: {
          slug,
          title,
          description,
          content: bodyContent.trim(),
          categories,
          tags,
          published: true,
          publishedAt: frontmatter.date ? new Date(frontmatter.date) : fileMtime,
          createdAt: frontmatter.date ? new Date(frontmatter.date) : fileMtime,
        },
      })
      imported++
      console.log(`import-local-posts: created "${slug}"`)
    }

    // Use the return value of create/update (already the canonical record)
    const record = upsertResult
    if (record) {
      const md = postToFrontmatter(record) + '\n' + MANAGED_MARKER
      await writeFile(filePath, md, 'utf-8')
    }
  }

  return { imported, updated }
}

async function importLocalDrafts() {
  let files
  try {
    files = await readdir(DRAFTS_DIR)
  } catch {
    // _drafts dir may not exist yet — not an error
    return { imported: 0 }
  }

  await mkdir(DRAFTS_DIR, { recursive: true })

  let imported = 0
  let updated = 0

  for (const file of files) {
    if (!file.endsWith('.md')) continue

    const filePath = join(DRAFTS_DIR, file)
    let raw
    try {
      raw = await readFile(filePath, 'utf-8')
    } catch {
      continue
    }

    // Skip managed-marked files (generated by rebuild, not user-editable)
    if (raw.includes(MANAGED_MARKER)) continue

    const slug = file.replace(/\.md$/, '')
    const frontmatter = parseFrontmatter(raw)
    const bodyContent = raw.replace(/^---\n[\s\S]*?\n---\n?/, '')

    const title = frontmatter.title || slug
    const description = frontmatter.description || ''
    const categories = Array.isArray(frontmatter.categories) ? frontmatter.categories : (frontmatter.categories ? [frontmatter.categories] : [])
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : (frontmatter.tags ? [frontmatter.tags] : [])

    const fileStats = await stat(filePath)
    const fileMtime = fileStats.mtime

    const existing = await prisma.blogPost.findUnique({ where: { slug } })

    if (existing) {
      // Both sides have content — compare mtime with DB updatedAt, local wins if newer
      const dbUpdated = new Date(existing.updatedAt)
      if (fileMtime > dbUpdated) {
        await prisma.blogPost.update({
          where: { slug },
          data: {
            title,
            description,
            content: bodyContent.trim(),
            categories,
            tags,
            updatedAt: new Date(),
          },
        })
        updated++
        console.log(`import-local-posts: updated draft "${slug}" (local file newer)`)
      }
      continue
    }

    // New draft — import to MySQL, keep the local file
    await prisma.blogPost.create({
      data: {
        slug,
        title,
        description,
        content: bodyContent.trim(),
        categories,
        tags,
        published: false,
        publishedAt: frontmatter.date ? new Date(frontmatter.date) : new Date(),
        createdAt: frontmatter.date ? new Date(frontmatter.date) : new Date(),
      },
    })
    imported++
    console.log(`import-local-posts: imported draft "${slug}"`)
  }

  return { imported, updated }
}

importLocalPosts()
  .then((posts) => importLocalDrafts().then((drafts) => {
    console.log(`import-local-posts: ${posts.imported} imported, ${posts.updated} updated, ${drafts.imported} drafts imported, ${drafts.updated} drafts updated`)
    process.exit(0)
  }))
  .catch((err) => {
    console.error('import-local-posts error:', err.stack)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
