import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'
import { mkdir, writeFile, readdir, unlink, copyFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import sharp from 'sharp'
import { env } from '../config/env.js'

const assets = new Hono()

function getPortalRoot() {
  if (env.REPO_ROOT === '/portal-source') return '/portal-source'
  if (env.REPO_ROOT) return join(env.REPO_ROOT, 'apps', 'blog-portal')
  throw new Error('REPO_ROOT is not configured')
}

function getAssetsDir() {
  return join(getPortalRoot(), 'source', 'shared-assets', 'images')
}

function getBackgroundsDir() {
  return join(getAssetsDir(), 'backgrounds')
}

function isValidBgFilename(name) {
  return /^bg-\d+\.(jpg|jpeg|png|webp)$/i.test(name)
}

const BG_MAX_WIDTH = 1920
const BG_QUALITY = 85
const AVATAR_SIZE = 400
const AVATAR_QUALITY = 85

// GET /api/admin/assets — list all assets
assets.get('/admin/assets', requireAuth(), async (c) => {
  const assetsDir = getAssetsDir()
  const backgroundsDir = getBackgroundsDir()

  const result = { avatar: null, icon: null, backgrounds: [], defaultBackground: null }

  try {
    const rootFiles = await readdir(assetsDir, { withFileTypes: true })
    for (const f of rootFiles) {
      if (!f.isFile()) continue
      if (f.name === 'profile.jpg') result.avatar = f.name
      if (f.name === 'icon.png') result.icon = f.name
      if (f.name === 'background.jpg') result.defaultBackground = f.name
    }
  } catch {}

  try {
    const bgFiles = await readdir(backgroundsDir, { withFileTypes: true })
    for (const f of bgFiles) {
      if (f.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(f.name)) {
        result.backgrounds.push(f.name)
      }
    }
  } catch {}

  return c.json(result)
})

// POST /api/admin/assets/upload — upload an asset
assets.post('/admin/assets/upload', requireAuth(), async (c) => {
  const body = await c.req.parseBody({ maxSize: 20 * 1024 * 1024 }) // 20MB
  const file = body.file
  const type = body.type || 'background'

  if (!file) return c.json({ error: 'No file provided' }, 400)

  const assetsDir = getAssetsDir()
  const backgroundsDir = getBackgroundsDir()
  await mkdir(assetsDir, { recursive: true })

  const buf = Buffer.from(await file.arrayBuffer())

  // Validate image
  try {
    const meta = await sharp(buf).metadata()
    if (!meta.width) throw new Error('invalid image')
    if (meta.width > 8000 || meta.height > 8000) {
      return c.json({ error: 'Image dimensions too large' }, 400)
    }
  } catch {
    return c.json({ error: 'Invalid image file' }, 400)
  }

  const pipeline = sharp(buf)

  if (type === 'avatar') {
    const outPath = join(assetsDir, 'profile.jpg')
    await pipeline
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: AVATAR_QUALITY })
      .toFile(outPath)
    return c.json({ filename: 'profile.jpg', type: 'avatar' })
  }

  if (type === 'icon') {
    const outPath = join(assetsDir, 'icon.png')
    await pipeline.png().toFile(outPath)
    return c.json({ filename: 'icon.png', type: 'icon' })
  }

  if (type === 'background') {
    await mkdir(backgroundsDir, { recursive: true })
    const ts = Date.now()
    const filename = `bg-${ts}.jpg`
    const outPath = join(backgroundsDir, filename)
    await pipeline
      .resize(BG_MAX_WIDTH, undefined, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: BG_QUALITY })
      .toFile(outPath)
    return c.json({ filename, type: 'background', path: `/shared-assets/images/backgrounds/${filename}` })
  }

  return c.json({ error: 'Invalid type. Use avatar, icon, or background.' }, 400)
})

// DELETE /api/admin/assets/:filename — remove from backgrounds pool
assets.delete('/admin/assets/:filename', requireAuth(), async (c) => {
  const { filename } = c.req.param()

  // Protect fixed assets
  if (['profile.jpg', 'icon.png', 'background.jpg'].includes(filename)) {
    return c.json({ error: 'Cannot delete core asset. Replace it by uploading a new one.' }, 400)
  }

  if (!isValidBgFilename(filename)) {
    return c.json({ error: 'Invalid filename' }, 400)
  }

  const backgroundsDir = getBackgroundsDir()
  const filePath = join(backgroundsDir, filename)

  try {
    await unlink(filePath)
  } catch {
    return c.json({ error: 'File not found' }, 404)
  }

  return c.json({ deleted: filename })
})

// POST /api/admin/assets/set-default — promote a backgrounds/ file to background.jpg
assets.post('/admin/assets/set-default', requireAuth(), async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { filename } = body

  if (!filename) return c.json({ error: 'filename required' }, 400)

  if (!isValidBgFilename(filename)) {
    return c.json({ error: 'Invalid filename' }, 400)
  }

  const backgroundsDir = getBackgroundsDir()
  const src = join(backgroundsDir, filename)
  const dest = join(getAssetsDir(), 'background.jpg')

  try {
    await copyFile(src, dest)
  } catch {
    return c.json({ error: 'File not found in backgrounds pool' }, 404)
  }

  return c.json({ defaultBackground: filename })
})

export { assets }
