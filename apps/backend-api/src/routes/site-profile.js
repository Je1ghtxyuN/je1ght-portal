import { Hono } from 'hono'
import { prisma } from '../db/client.js'
import { requireAuth } from '../middleware/auth.js'
import { normalizeSiteProfile } from '../services/content-snapshot.js'

const siteProfile = new Hono()

// Public: get site profile
siteProfile.get('/', async (c) => {
  const profile = await prisma.siteProfile.findUnique({
    where: { id: 'default' },
  })

  return c.json({ profile: profile?.data || {} })
})

// Admin: update site profile
siteProfile.put('/', requireAuth(), async (c) => {
  let body
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { data } = body ?? {}

  if (!data || typeof data !== 'object') {
    return c.json({ error: 'Profile data object is required' }, 400)
  }

  const normalizedData = normalizeSiteProfile(data)
  const profile = await prisma.siteProfile.upsert({
    where: { id: 'default' },
    update: { data: normalizedData },
    create: { id: 'default', data: normalizedData },
  })

  return c.json({ profile: profile.data })
})

export { siteProfile }
